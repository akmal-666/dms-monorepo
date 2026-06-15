import { Hono } from 'hono';
import { AppEnv, authMiddleware } from '../middleware/auth';
import { nanoid } from '../utils/nanoid';
import * as XLSX from 'xlsx';

const router = new Hono<AppEnv>();

const VALID_STATUSES = ['Draft', 'In Progress', 'Done', 'Overdue', 'Cancelled'];
const VALID_PLATFORMS = ['CIS', 'Odoo', 'CRM', 'Power BI', 'Infrastructure', 'Network', 'Security', 'Other'];

interface ImportError {
  sheet: string;
  row: number;
  column: string;
  value: string;
  message: string;
}

function parseDate(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(val);
    return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return null;
}

function parseMonth(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'string') {
    // Accept YYYY-MM or MMM-YY or Month Year
    const isoMatch = val.match(/^(\d{4})-(\d{2})$/);
    if (isoMatch) return val;
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    return `${date.y}-${String(date.m).padStart(2,'0')}`;
  }
  return null;
}

// ── POST /api/dashboards/:id/import/validate ──────────────────────────────────
router.post('/:id/import/validate', authMiddleware, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  if (user.role === 'viewer') return c.json({ error: 'Forbidden' }, 403);

  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return c.json({ error: 'No file uploaded' }, 400);

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const errors: ImportError[] = [];
  const requirementRows: unknown[] = [];
  const resourceRows: unknown[] = [];
  const deliveryRows: unknown[] = [];

  // ── Sheet 1: Requirement ──────────────────────────────────────────────────
  const reqSheet = workbook.Sheets['Requirement'] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!reqSheet) {
    return c.json({ error: 'Sheet "Requirement" not found' }, 400);
  }

  const rawReqs = XLSX.utils.sheet_to_json(reqSheet, { defval: '' }) as Record<string, unknown>[];
  const existingReqIds = new Set<string>();

  // Fetch existing req IDs for this dashboard
  const existing = await c.env.DB.prepare(
    'SELECT req_id FROM requirements WHERE dashboard_id = ?'
  ).bind(id).all<{ req_id: string }>();
  const dbReqIds = new Set(existing.results.map(r => r.req_id));

  const seenInFile = new Set<string>();

  for (let i = 0; i < rawReqs.length; i++) {
    const row = rawReqs[i];
    const rowNum = i + 2; // 1-indexed + header
    const rowErrors: ImportError[] = [];

    const reqId = String(row['Req ID'] ?? row['req_id'] ?? '').trim();
    const title = String(row['Title'] ?? row['title'] ?? '').trim();
    const status = String(row['Status'] ?? row['status'] ?? '').trim();
    const progressRaw = row['Progress'] ?? row['progress'] ?? 0;
    const plannedMdRaw = row['Planned MD'] ?? row['planned_md'] ?? 0;
    const actualMdRaw = row['Actual MD'] ?? row['actual_md'] ?? 0;

    if (!reqId) rowErrors.push({ sheet: 'Requirement', row: rowNum, column: 'Req ID', value: '', message: 'Req ID is required' });
    if (!title) rowErrors.push({ sheet: 'Requirement', row: rowNum, column: 'Title', value: '', message: 'Title is required' });
    if (reqId && seenInFile.has(reqId)) {
      rowErrors.push({ sheet: 'Requirement', row: rowNum, column: 'Req ID', value: reqId, message: `Duplicate Req ID in file` });
    }
    if (reqId) seenInFile.add(reqId);
    if (status && !VALID_STATUSES.includes(status)) {
      rowErrors.push({ sheet: 'Requirement', row: rowNum, column: 'Status', value: status, message: `Invalid status. Valid: ${VALID_STATUSES.join(', ')}` });
    }
    const progress = Number(progressRaw);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      rowErrors.push({ sheet: 'Requirement', row: rowNum, column: 'Progress', value: String(progressRaw), message: 'Progress must be 0-100' });
    }
    const plannedMd = Number(plannedMdRaw);
    if (isNaN(plannedMd) || plannedMd < 0) {
      rowErrors.push({ sheet: 'Requirement', row: rowNum, column: 'Planned MD', value: String(plannedMdRaw), message: 'Planned MD must be >= 0' });
    }
    const actualMd = Number(actualMdRaw);
    if (isNaN(actualMd) || actualMd < 0) {
      rowErrors.push({ sheet: 'Requirement', row: rowNum, column: 'Actual MD', value: String(actualMdRaw), message: 'Actual MD must be >= 0' });
    }

    errors.push(...rowErrors);

    requirementRows.push({
      rowIndex: rowNum,
      reqId,
      title,
      category: String(row['Category'] ?? '').trim() || undefined,
      platform: String(row['Platform'] ?? '').trim() || undefined,
      requestor: String(row['Requestor'] ?? '').trim() || undefined,
      pic: String(row['PIC'] ?? '').trim() || undefined,
      status: status || 'Draft',
      progress: isNaN(progress) ? 0 : Math.min(100, Math.max(0, progress)),
      startDate: parseDate(row['Start Date']),
      dueDate: parseDate(row['Due Date']),
      plannedMd: isNaN(plannedMd) ? 0 : Math.max(0, plannedMd),
      actualMd: isNaN(actualMd) ? 0 : Math.max(0, actualMd),
      isNew: !dbReqIds.has(reqId),
      errors: rowErrors.length ? rowErrors : undefined,
    });
  }

  // ── Sheet 2: Resource Capacity ────────────────────────────────────────────
  const rcSheet = workbook.Sheets['Resource Capacity'] ?? workbook.Sheets[workbook.SheetNames[1]];
  if (rcSheet) {
    const rawRc = XLSX.utils.sheet_to_json(rcSheet, { defval: '' }) as Record<string, unknown>[];
    for (let i = 0; i < rawRc.length; i++) {
      const row = rawRc[i];
      const rowNum = i + 2;
      const rowErrors: ImportError[] = [];
      const team = String(row['Team'] ?? '').trim();
      const month = parseMonth(row['Month']);
      const capacityMd = Number(row['Capacity MD'] ?? row['capacity_md'] ?? 0);

      if (!team) rowErrors.push({ sheet: 'Resource Capacity', row: rowNum, column: 'Team', value: '', message: 'Team is required' });
      if (!month) rowErrors.push({ sheet: 'Resource Capacity', row: rowNum, column: 'Month', value: String(row['Month']), message: 'Invalid month format (use YYYY-MM)' });
      if (isNaN(capacityMd) || capacityMd < 0) rowErrors.push({ sheet: 'Resource Capacity', row: rowNum, column: 'Capacity MD', value: String(row['Capacity MD']), message: 'Capacity MD must be >= 0' });

      errors.push(...rowErrors);
      resourceRows.push({ rowIndex: rowNum, team, month, capacityMd, errors: rowErrors.length ? rowErrors : undefined });
    }
  }

  // ── Sheet 3: Delivery Target ──────────────────────────────────────────────
  const dtSheet = workbook.Sheets['Delivery Target'] ?? workbook.Sheets[workbook.SheetNames[2]];
  if (dtSheet) {
    const rawDt = XLSX.utils.sheet_to_json(dtSheet, { defval: '' }) as Record<string, unknown>[];
    for (let i = 0; i < rawDt.length; i++) {
      const row = rawDt[i];
      const rowNum = i + 2;
      const rowErrors: ImportError[] = [];
      const month = parseMonth(row['Month']);
      const team = String(row['Team'] ?? '').trim();
      const target = Number(row['Target'] ?? 0);
      const actual = Number(row['Actual'] ?? 0);

      if (!month) rowErrors.push({ sheet: 'Delivery Target', row: rowNum, column: 'Month', value: String(row['Month']), message: 'Invalid month format' });
      if (!team) rowErrors.push({ sheet: 'Delivery Target', row: rowNum, column: 'Team', value: '', message: 'Team is required' });

      errors.push(...rowErrors);
      deliveryRows.push({ rowIndex: rowNum, month, team, target, actual, errors: rowErrors.length ? rowErrors : undefined });
    }
  }

  const newReqs = requirementRows.filter((r: unknown) => (r as { isNew?: boolean }).isNew).length;
  const updateReqs = requirementRows.filter((r: unknown) => !(r as { isNew?: boolean }).isNew).length;

  return c.json({
    data: {
      isValid: errors.length === 0,
      requirements: requirementRows,
      resourceCapacity: resourceRows,
      deliveryTargets: deliveryRows,
      errors,
      summary: {
        totalRequirements: requirementRows.length,
        newRequirements: newReqs,
        updateRequirements: updateReqs,
        totalResourceRows: resourceRows.length,
        totalDeliveryRows: deliveryRows.length,
      },
    }
  });
});

// ── POST /api/dashboards/:id/import/commit ────────────────────────────────────
router.post('/:id/import/commit', authMiddleware, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  if (user.role === 'viewer') return c.json({ error: 'Forbidden' }, 403);

  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return c.json({ error: 'No file uploaded' }, 400);

  const buffer = await file.arrayBuffer();
  const importId = nanoid('imp');
  const r2Key = `imports/${id}/${importId}/${file.name}`;

  // Upload to R2
  await c.env.R2.put(r2Key, buffer, {
    httpMetadata: { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  });

  // Create import history record
  await c.env.DB.prepare(
    'INSERT INTO import_history (id, dashboard_id, filename, r2_key, status, imported_by) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(importId, id, file.name, r2Key, 'validating', user.id).run();

  // Parse and commit
  const workbook = XLSX.read(buffer, { type: 'array' });

  let insertedRows = 0;
  let updatedRows = 0;
  let errorRows = 0;
  const commitErrors: ImportError[] = [];

  try {
    // Requirements upsert
    const reqSheet = workbook.Sheets['Requirement'] ?? workbook.Sheets[workbook.SheetNames[0]];
    if (reqSheet) {
      const rawReqs = XLSX.utils.sheet_to_json(reqSheet, { defval: '' }) as Record<string, unknown>[];

      for (const row of rawReqs) {
        const reqId = String(row['Req ID'] ?? '').trim();
        if (!reqId) { errorRows++; continue; }

        const existing = await c.env.DB.prepare(
          'SELECT id FROM requirements WHERE dashboard_id = ? AND req_id = ?'
        ).bind(id, reqId).first<{ id: string }>();

        const plannedMd = Math.max(0, Number(row['Planned MD'] ?? 0) || 0);
        const actualMd = Math.max(0, Number(row['Actual MD'] ?? 0) || 0);
        const progress = Math.min(100, Math.max(0, Number(row['Progress'] ?? 0) || 0));
        const status = VALID_STATUSES.includes(String(row['Status'] ?? '')) ? String(row['Status']) : 'Draft';

        if (existing) {
          await c.env.DB.prepare(`
            UPDATE requirements SET
              title = ?, category = ?, platform = ?, requestor = ?, pic = ?,
              status = ?, progress = ?, start_date = ?, due_date = ?,
              planned_md = ?, actual_md = ?, import_batch_id = ?,
              updated_at = datetime('now')
            WHERE id = ?
          `).bind(
            String(row['Title'] ?? '').trim(),
            String(row['Category'] ?? '').trim() || null,
            String(row['Platform'] ?? '').trim() || null,
            String(row['Requestor'] ?? '').trim() || null,
            String(row['PIC'] ?? '').trim() || null,
            status, progress,
            parseDate(row['Start Date']), parseDate(row['Due Date']),
            plannedMd, actualMd, importId, existing.id
          ).run();
          updatedRows++;
        } else {
          await c.env.DB.prepare(`
            INSERT INTO requirements (id, dashboard_id, req_id, title, category, platform, requestor, pic, status, progress, start_date, due_date, planned_md, actual_md, import_batch_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            nanoid('req'), id, reqId,
            String(row['Title'] ?? '').trim(),
            String(row['Category'] ?? '').trim() || null,
            String(row['Platform'] ?? '').trim() || null,
            String(row['Requestor'] ?? '').trim() || null,
            String(row['PIC'] ?? '').trim() || null,
            status, progress,
            parseDate(row['Start Date']), parseDate(row['Due Date']),
            plannedMd, actualMd, importId
          ).run();
          insertedRows++;
        }
      }
    }

    // Resource Capacity upsert
    const rcSheet = workbook.Sheets['Resource Capacity'] ?? workbook.Sheets[workbook.SheetNames[1]];
    if (rcSheet) {
      const rawRc = XLSX.utils.sheet_to_json(rcSheet, { defval: '' }) as Record<string, unknown>[];
      for (const row of rawRc) {
        const team = String(row['Team'] ?? '').trim();
        const month = parseMonth(row['Month']);
        if (!team || !month) continue;
        const capacityMd = Math.max(0, Number(row['Capacity MD'] ?? 0) || 0);
        await c.env.DB.prepare(`
          INSERT INTO resource_capacity (id, dashboard_id, team, month, capacity_md, import_batch_id)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(dashboard_id, team, month) DO UPDATE SET capacity_md = excluded.capacity_md, import_batch_id = excluded.import_batch_id
        `).bind(nanoid('rc'), id, team, month, capacityMd, importId).run();
      }
    }

    // Delivery Target upsert
    const dtSheet = workbook.Sheets['Delivery Target'] ?? workbook.Sheets[workbook.SheetNames[2]];
    if (dtSheet) {
      const rawDt = XLSX.utils.sheet_to_json(dtSheet, { defval: '' }) as Record<string, unknown>[];
      for (const row of rawDt) {
        const month = parseMonth(row['Month']);
        const team = String(row['Team'] ?? '').trim();
        if (!month || !team) continue;
        const target = Number(row['Target'] ?? 0) || 0;
        const actual = Number(row['Actual'] ?? 0) || 0;
        await c.env.DB.prepare(`
          INSERT INTO delivery_target (id, dashboard_id, month, team, target, actual, import_batch_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(dashboard_id, month, team) DO UPDATE SET target = excluded.target, actual = excluded.actual, import_batch_id = excluded.import_batch_id
        `).bind(nanoid('dt'), id, month, team, target, actual, importId).run();
      }
    }

    // Update import history
    await c.env.DB.prepare(`
      UPDATE import_history SET
        status = 'success',
        total_rows = ?,
        inserted_rows = ?,
        updated_rows = ?,
        error_rows = ?
      WHERE id = ?
    `).bind(insertedRows + updatedRows + errorRows, insertedRows, updatedRows, errorRows, importId).run();

  } catch (err) {
    await c.env.DB.prepare(
      "UPDATE import_history SET status = 'failed', errors_json = ? WHERE id = ?"
    ).bind(JSON.stringify([{ message: String(err) }]), importId).run();
    return c.json({ error: 'Import failed', details: String(err) }, 500);
  }

  return c.json({
    data: {
      importId,
      insertedRows,
      updatedRows,
      errorRows,
      totalRows: insertedRows + updatedRows + errorRows,
    }
  });
});

// ── GET /api/dashboards/:id/import/history ────────────────────────────────────
router.get('/:id/import/history', authMiddleware, async (c) => {
  const { id } = c.req.param();
  const page = parseInt(c.req.query('page') ?? '1');
  const pageSize = parseInt(c.req.query('pageSize') ?? '20');
  const offset = (page - 1) * pageSize;

  const [countResult, rows] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as total FROM import_history WHERE dashboard_id = ?').bind(id).first<{ total: number }>(),
    c.env.DB.prepare(`
      SELECT ih.*, u.name as imported_by_name
      FROM import_history ih
      LEFT JOIN users u ON ih.imported_by = u.id
      WHERE ih.dashboard_id = ?
      ORDER BY ih.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(id, pageSize, offset).all(),
  ]);

  return c.json({
    data: rows.results,
    total: countResult?.total ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((countResult?.total ?? 0) / pageSize),
  });
});

// ── GET /api/dashboards/:id/import/:importId ──────────────────────────────────
router.get('/:id/import/:importId', authMiddleware, async (c) => {
  const { id, importId } = c.req.param();
  const record = await c.env.DB.prepare(
    'SELECT * FROM import_history WHERE id = ? AND dashboard_id = ?'
  ).bind(importId, id).first<{ errors_json: string }>();
  if (!record) return c.json({ error: 'Import not found' }, 404);

  return c.json({
    data: {
      ...record,
      errors: record.errors_json ? JSON.parse(record.errors_json) : [],
    }
  });
});

// ── GET /api/import/template ──────────────────────────────────────────────────
router.get('/template', async (c) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Requirement
  const reqData = [
    ['Req ID', 'Title', 'Category', 'Platform', 'Requestor', 'PIC', 'Status', 'Progress', 'Start Date', 'Due Date', 'Planned MD', 'Actual MD'],
    ['REQ-001', 'Sample Requirement', 'Development', 'CIS', 'John Doe', 'Jane Smith', 'In Progress', 50, '2024-01-01', '2024-03-31', 10, 5],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(reqData), 'Requirement');

  // Sheet 2: Resource Capacity
  const rcData = [
    ['Team', 'Month', 'Capacity MD'],
    ['Dev Team', '2024-01', 22],
    ['QA Team', '2024-01', 15],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rcData), 'Resource Capacity');

  // Sheet 3: Delivery Target
  const dtData = [
    ['Month', 'Team', 'Target', 'Actual'],
    ['2024-01', 'Dev Team', 10, 8],
    ['2024-01', 'QA Team', 5, 5],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dtData), 'Delivery Target');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="DMS_Import_Template.xlsx"',
    }
  });
});

export { router as importRouter };
