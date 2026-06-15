import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AppEnv, authMiddleware } from '../middleware/auth';
import { nanoid } from '../utils/nanoid';

const router = new Hono<AppEnv>();

// ── GET /api/dashboards/:id/requirements ──────────────────────────────────────
router.get('/:id/requirements', authMiddleware, async (c) => {
  const { id } = c.req.param();
  const page = parseInt(c.req.query('page') ?? '1');
  const pageSize = parseInt(c.req.query('pageSize') ?? '50');
  const search = c.req.query('search') ?? '';
  const sortBy = c.req.query('sortBy') ?? 'updated_at';
  const sortDir = c.req.query('sortDir') === 'asc' ? 'ASC' : 'DESC';

  const conditions: string[] = ['dashboard_id = ?'];
  const params: unknown[] = [id];

  // Search
  if (search) {
    conditions.push('(req_id LIKE ? OR title LIKE ? OR pic LIKE ? OR requestor LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  // Filters
  const status = c.req.query('status');
  const pic = c.req.query('pic');
  const category = c.req.query('category');
  const platform = c.req.query('platform');
  const year = c.req.query('year');
  const quarter = c.req.query('quarter');
  const semester = c.req.query('semester');
  const month = c.req.query('month');

  if (status) {
    const arr = status.split(',');
    conditions.push(`status IN (${arr.map(() => '?').join(',')})`);
    params.push(...arr);
  }
  if (pic) { const arr = pic.split(','); conditions.push(`pic IN (${arr.map(() => '?').join(',')})`); params.push(...arr); }
  if (category) { const arr = category.split(','); conditions.push(`category IN (${arr.map(() => '?').join(',')})`); params.push(...arr); }
  if (platform) { const arr = platform.split(','); conditions.push(`platform IN (${arr.map(() => '?').join(',')})`); params.push(...arr); }
  if (year) { conditions.push("strftime('%Y', due_date) = ?"); params.push(year); }
  if (quarter) {
    const qMap: Record<string, string[]> = { Q1: ['01','02','03'], Q2: ['04','05','06'], Q3: ['07','08','09'], Q4: ['10','11','12'] };
    const m = qMap[quarter];
    if (m) { conditions.push(`strftime('%m', due_date) IN (${m.map(() => '?').join(',')})`); params.push(...m); }
  }
  if (semester) {
    const sMap: Record<string, string[]> = { S1: ['01','02','03','04','05','06'], S2: ['07','08','09','10','11','12'] };
    const m = sMap[semester];
    if (m) { conditions.push(`strftime('%m', due_date) IN (${m.map(() => '?').join(',')})`); params.push(...m); }
  }
  if (month) { conditions.push("strftime('%Y-%m', due_date) = ?"); params.push(month); }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * pageSize;

  const allowedSortCols = ['req_id','title','status','progress','due_date','planned_md','actual_md','updated_at'];
  const safeSortBy = allowedSortCols.includes(sortBy) ? sortBy : 'updated_at';

  const [countResult, rowsResult] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) as total FROM requirements ${where}`).bind(...params).first<{ total: number }>(),
    c.env.DB.prepare(`
      SELECT * FROM requirements ${where}
      ORDER BY ${safeSortBy} ${sortDir}
      LIMIT ? OFFSET ?
    `).bind(...params, pageSize, offset).all(),
  ]);

  const total = countResult?.total ?? 0;
  return c.json({
    data: rowsResult.results,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

// ── GET /api/dashboards/:id/requirements/:reqId ───────────────────────────────
router.get('/:id/requirements/:reqId', authMiddleware, async (c) => {
  const { id, reqId } = c.req.param();
  const req = await c.env.DB.prepare(
    'SELECT * FROM requirements WHERE dashboard_id = ? AND req_id = ?'
  ).bind(id, reqId).first();
  if (!req) return c.json({ error: 'Requirement not found' }, 404);
  return c.json({ data: req });
});

// ── PUT /api/dashboards/:id/requirements/:reqId ───────────────────────────────
router.put(
  '/:id/requirements/:reqId',
  authMiddleware,
  zValidator('json', z.object({
    title: z.string().min(1).optional(),
    category: z.string().optional(),
    platform: z.string().optional(),
    requestor: z.string().optional(),
    pic: z.string().optional(),
    status: z.enum(['Draft','In Progress','Done','Overdue','Cancelled']).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    startDate: z.string().optional(),
    dueDate: z.string().optional(),
    plannedMd: z.number().min(0).optional(),
    actualMd: z.number().min(0).optional(),
  })),
  async (c) => {
    const { id, reqId } = c.req.param();
    const user = c.get('user');
    if (user.role === 'viewer') return c.json({ error: 'Forbidden' }, 403);

    const existing = await c.env.DB.prepare(
      'SELECT id FROM requirements WHERE dashboard_id = ? AND req_id = ?'
    ).bind(id, reqId).first<{ id: string }>();
    if (!existing) return c.json({ error: 'Requirement not found' }, 404);

    const body = c.req.valid('json');
    const fieldMap: Record<string, string> = {
      title: 'title', category: 'category', platform: 'platform',
      requestor: 'requestor', pic: 'pic', status: 'status', progress: 'progress',
      startDate: 'start_date', dueDate: 'due_date',
      plannedMd: 'planned_md', actualMd: 'actual_md',
    };

    const updates: string[] = [];
    const values: unknown[] = [];
    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in body && body[key as keyof typeof body] !== undefined) {
        updates.push(`${col} = ?`);
        values.push(body[key as keyof typeof body]);
      }
    }
    if (updates.length === 0) return c.json({ error: 'No fields to update' }, 400);

    updates.push("updated_at = datetime('now')");
    values.push(existing.id);

    await c.env.DB.prepare(
      `UPDATE requirements SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    const updated = await c.env.DB.prepare('SELECT * FROM requirements WHERE id = ?').bind(existing.id).first();
    return c.json({ data: updated });
  }
);

// ── DELETE /api/dashboards/:id/requirements/:reqId ────────────────────────────
router.delete('/:id/requirements/:reqId', authMiddleware, async (c) => {
  const { id, reqId } = c.req.param();
  const user = c.get('user');
  if (user.role === 'viewer') return c.json({ error: 'Forbidden' }, 403);

  await c.env.DB.prepare(
    'DELETE FROM requirements WHERE dashboard_id = ? AND req_id = ?'
  ).bind(id, reqId).run();

  return c.json({ data: { message: 'Deleted' } });
});

export { router as requirementsRouter };
