import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { AppEnv, authMiddleware } from '../middleware/auth';
import { nanoid } from '../utils/nanoid';

const router = new Hono<AppEnv>();

// ── GET /api/dashboards ───────────────────────────────────────────────────────
router.get('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const showArchived = c.req.query('archived') === 'true';

  const statusFilter = showArchived ? '' : "AND d.status = 'active'";

  // Admin sees all dashboards; others see dashboards they own or are members of
  let query: string;
  let params: unknown[];

  if (user.role === 'admin') {
    query = `
      SELECT d.*,
             u.name as owner_name,
             (SELECT COUNT(*) FROM requirements r WHERE r.dashboard_id = d.id) as requirement_count,
             (SELECT COUNT(*) FROM dashboard_members dm WHERE dm.dashboard_id = d.id) as member_count
      FROM dashboards d
      LEFT JOIN users u ON d.owner_id = u.id
      WHERE 1=1 ${statusFilter}
      ORDER BY d.updated_at DESC
    `;
    params = [];
  } else {
    query = `
      SELECT DISTINCT d.*,
             u.name as owner_name,
             (SELECT COUNT(*) FROM requirements r WHERE r.dashboard_id = d.id) as requirement_count,
             (SELECT COUNT(*) FROM dashboard_members dm WHERE dm.dashboard_id = d.id) as member_count
      FROM dashboards d
      LEFT JOIN users u ON d.owner_id = u.id
      LEFT JOIN dashboard_members dm ON dm.dashboard_id = d.id AND dm.user_id = ?
      WHERE (d.owner_id = ? OR dm.user_id = ?) ${statusFilter}
      ORDER BY d.updated_at DESC
    `;
    params = [user.id, user.id, user.id];
  }

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ data: result.results });
});

// ── POST /api/dashboards ──────────────────────────────────────────────────────
router.post(
  '/',
  authMiddleware,
  zValidator('json', z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
  })),
  async (c) => {
    const user = c.get('user');
    if (user.role === 'viewer') return c.json({ error: 'Forbidden' }, 403);

    const { name, description } = c.req.valid('json');
    const id = nanoid('dash');

    await c.env.DB.prepare(
      'INSERT INTO dashboards (id, name, description, owner_id) VALUES (?, ?, ?, ?)'
    ).bind(id, name, description ?? null, user.id).run();

    // Owner is also a member with admin role
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO dashboard_members (dashboard_id, user_id, role) VALUES (?, ?, ?)'
    ).bind(id, user.id, 'admin').run();

    const dashboard = await c.env.DB.prepare(
      'SELECT * FROM dashboards WHERE id = ?'
    ).bind(id).first();

    return c.json({ data: dashboard }, 201);
  }
);

// ── GET /api/dashboards/:id ───────────────────────────────────────────────────
router.get('/:id', authMiddleware, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');

  const dashboard = await c.env.DB.prepare(`
    SELECT d.*, u.name as owner_name
    FROM dashboards d
    LEFT JOIN users u ON d.owner_id = u.id
    WHERE d.id = ?
  `).bind(id).first();

  if (!dashboard) return c.json({ error: 'Dashboard not found' }, 404);

  // Access check
  if (user.role !== 'admin' && (dashboard as { owner_id: string }).owner_id !== user.id) {
    const member = await c.env.DB.prepare(
      'SELECT role FROM dashboard_members WHERE dashboard_id = ? AND user_id = ?'
    ).bind(id, user.id).first();
    if (!member) return c.json({ error: 'Forbidden' }, 403);
  }

  return c.json({ data: dashboard });
});

// ── PUT /api/dashboards/:id ───────────────────────────────────────────────────
router.put(
  '/:id',
  authMiddleware,
  zValidator('json', z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
  })),
  async (c) => {
    const { id } = c.req.param();
    const user = c.get('user');

    const dashboard = await c.env.DB.prepare('SELECT * FROM dashboards WHERE id = ?').bind(id).first<{ owner_id: string }>();
    if (!dashboard) return c.json({ error: 'Dashboard not found' }, 404);

    if (user.role !== 'admin' && dashboard.owner_id !== user.id) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const body = c.req.valid('json');
    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) { updates.push('name = ?'); values.push(body.name); }
    if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
    updates.push("updated_at = datetime('now')");
    values.push(id);

    await c.env.DB.prepare(
      `UPDATE dashboards SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    const updated = await c.env.DB.prepare('SELECT * FROM dashboards WHERE id = ?').bind(id).first();
    return c.json({ data: updated });
  }
);

// ── POST /api/dashboards/:id/clone ────────────────────────────────────────────
router.post('/:id/clone', authMiddleware, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');
  if (user.role === 'viewer') return c.json({ error: 'Forbidden' }, 403);

  const source = await c.env.DB.prepare('SELECT * FROM dashboards WHERE id = ?').bind(id).first<{
    id: string; name: string; description: string;
  }>();
  if (!source) return c.json({ error: 'Dashboard not found' }, 404);

  const newId = nanoid('dash');
  const newName = `${source.name} (Copy)`;

  await c.env.DB.prepare(
    'INSERT INTO dashboards (id, name, description, owner_id, cloned_from) VALUES (?, ?, ?, ?, ?)'
  ).bind(newId, newName, source.description, user.id, id).run();

  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO dashboard_members (dashboard_id, user_id, role) VALUES (?, ?, ?)'
  ).bind(newId, user.id, 'admin').run();

  // Clone requirements
  const reqs = await c.env.DB.prepare(
    'SELECT * FROM requirements WHERE dashboard_id = ?'
  ).bind(id).all<{ req_id: string; title: string; category: string; platform: string; requestor: string; pic: string; status: string; progress: number; start_date: string; due_date: string; planned_md: number; actual_md: number }>();

  for (const req of reqs.results) {
    const reqId = nanoid('req');
    await c.env.DB.prepare(`
      INSERT INTO requirements (id, dashboard_id, req_id, title, category, platform, requestor, pic, status, progress, start_date, due_date, planned_md, actual_md)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(reqId, newId, req.req_id, req.title, req.category, req.platform,
      req.requestor, req.pic, req.status, req.progress,
      req.start_date, req.due_date, req.planned_md, req.actual_md).run();
  }

  // Clone resource capacity
  const resources = await c.env.DB.prepare(
    'SELECT * FROM resource_capacity WHERE dashboard_id = ?'
  ).bind(id).all<{ team: string; month: string; capacity_md: number }>();
  for (const r of resources.results) {
    await c.env.DB.prepare(
      'INSERT INTO resource_capacity (id, dashboard_id, team, month, capacity_md) VALUES (?, ?, ?, ?, ?)'
    ).bind(nanoid('rc'), newId, r.team, r.month, r.capacity_md).run();
  }

  // Clone delivery targets
  const deliveries = await c.env.DB.prepare(
    'SELECT * FROM delivery_target WHERE dashboard_id = ?'
  ).bind(id).all<{ month: string; team: string; target: number; actual: number }>();
  for (const d of deliveries.results) {
    await c.env.DB.prepare(
      'INSERT INTO delivery_target (id, dashboard_id, month, team, target, actual) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(nanoid('dt'), newId, d.month, d.team, d.target, d.actual).run();
  }

  const newDashboard = await c.env.DB.prepare('SELECT * FROM dashboards WHERE id = ?').bind(newId).first();
  return c.json({ data: newDashboard }, 201);
});

// ── PATCH /api/dashboards/:id/archive ─────────────────────────────────────────
router.patch('/:id/archive', authMiddleware, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');

  const dashboard = await c.env.DB.prepare('SELECT * FROM dashboards WHERE id = ?').bind(id).first<{ owner_id: string; status: string }>();
  if (!dashboard) return c.json({ error: 'Dashboard not found' }, 404);
  if (user.role !== 'admin' && dashboard.owner_id !== user.id) return c.json({ error: 'Forbidden' }, 403);

  const newStatus = dashboard.status === 'active' ? 'archived' : 'active';
  await c.env.DB.prepare(
    "UPDATE dashboards SET status = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(newStatus, id).run();

  return c.json({ data: { id, status: newStatus } });
});

// ── DELETE /api/dashboards/:id ────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (c) => {
  const { id } = c.req.param();
  const user = c.get('user');

  const dashboard = await c.env.DB.prepare('SELECT * FROM dashboards WHERE id = ?').bind(id).first<{ owner_id: string }>();
  if (!dashboard) return c.json({ error: 'Dashboard not found' }, 404);
  if (user.role !== 'admin' && dashboard.owner_id !== user.id) return c.json({ error: 'Forbidden' }, 403);

  await c.env.DB.prepare('DELETE FROM dashboards WHERE id = ?').bind(id).run();
  return c.json({ data: { message: 'Dashboard deleted' } });
});

export { router as dashboardRouter };
