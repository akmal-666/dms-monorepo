import { Hono } from 'hono';
import { AppEnv, authMiddleware } from '../middleware/auth';

const router = new Hono<AppEnv>();

// Helper to build filter WHERE clause from query params
function buildFilters(c: { req: { query: (k: string) => string | undefined } }) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  const year = c.req.query('year');
  const quarter = c.req.query('quarter');
  const semester = c.req.query('semester');
  const month = c.req.query('month');
  const status = c.req.query('status');
  const pic = c.req.query('pic');
  const category = c.req.query('category');
  const platform = c.req.query('platform');

  if (year) {
    conditions.push("(strftime('%Y', start_date) = ? OR strftime('%Y', due_date) = ?)");
    params.push(year, year);
  }
  if (quarter) {
    const qMap: Record<string, string[]> = {
      Q1: ['01','02','03'], Q2: ['04','05','06'],
      Q3: ['07','08','09'], Q4: ['10','11','12'],
    };
    const months = qMap[quarter];
    if (months) {
      conditions.push(`(strftime('%m', due_date) IN (${months.map(() => '?').join(',')}))`);
      params.push(...months);
    }
  }
  if (semester) {
    const sMap: Record<string, string[]> = {
      S1: ['01','02','03','04','05','06'],
      S2: ['07','08','09','10','11','12'],
    };
    const months = sMap[semester];
    if (months) {
      conditions.push(`(strftime('%m', due_date) IN (${months.map(() => '?').join(',')}))`);
      params.push(...months);
    }
  }
  if (month) {
    conditions.push("strftime('%Y-%m', due_date) = ?");
    params.push(month);
  }
  if (status) {
    const statuses = status.split(',');
    conditions.push(`status IN (${statuses.map(() => '?').join(',')})`);
    params.push(...statuses);
  }
  if (pic) {
    const pics = pic.split(',');
    conditions.push(`pic IN (${pics.map(() => '?').join(',')})`);
    params.push(...pics);
  }
  if (category) {
    const categories = category.split(',');
    conditions.push(`category IN (${categories.map(() => '?').join(',')})`);
    params.push(...categories);
  }
  if (platform) {
    const platforms = platform.split(',');
    conditions.push(`platform IN (${platforms.map(() => '?').join(',')})`);
    params.push(...platforms);
  }

  return { conditions, params };
}

// ── GET /api/dashboards/:id/kpi ───────────────────────────────────────────────
router.get('/:id/kpi', authMiddleware, async (c) => {
  const { id } = c.req.param();
  const { conditions, params } = buildFilters(c);

  const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';
  const baseParams = [id, ...params];

  const result = await c.env.DB.prepare(`
    SELECT
      COUNT(*) as total_initiative,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'Overdue' OR (due_date < date('now') AND status NOT IN ('Done','Cancelled')) THEN 1 ELSE 0 END) as overdue,
      ROUND(SUM(CASE WHEN status = 'Done' THEN 1.0 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as achievement_pct,
      ROUND(SUM(planned_md), 2) as planned_md,
      ROUND(SUM(actual_md), 2) as actual_md,
      ROUND(SUM(actual_md) - SUM(planned_md), 2) as md_variance
    FROM requirements
    WHERE dashboard_id = ? ${where}
  `).bind(...baseParams).first<{
    total_initiative: number; in_progress: number; completed: number;
    overdue: number; achievement_pct: number; planned_md: number;
    actual_md: number; md_variance: number;
  }>();

  // Delivery health: average actual/target across delivery targets
  const deliveryResult = await c.env.DB.prepare(`
    SELECT ROUND(AVG(CASE WHEN target > 0 THEN actual * 100.0 / target ELSE 0 END), 1) as delivery_health
    FROM delivery_target
    WHERE dashboard_id = ?
  `).bind(id).first<{ delivery_health: number }>();

  return c.json({
    data: {
      totalInitiative: result?.total_initiative ?? 0,
      inProgress: result?.in_progress ?? 0,
      completed: result?.completed ?? 0,
      overdue: result?.overdue ?? 0,
      achievementPct: result?.achievement_pct ?? 0,
      plannedMd: result?.planned_md ?? 0,
      actualMd: result?.actual_md ?? 0,
      mdVariance: result?.md_variance ?? 0,
      deliveryHealth: deliveryResult?.delivery_health ?? 0,
    }
  });
});

// ── GET /api/dashboards/:id/initiative-by-status ──────────────────────────────
router.get('/:id/initiative-by-status', authMiddleware, async (c) => {
  const { id } = c.req.param();
  const { conditions, params } = buildFilters(c);
  const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

  const result = await c.env.DB.prepare(`
    SELECT status, COUNT(*) as count
    FROM requirements
    WHERE dashboard_id = ? ${where}
    GROUP BY status
    ORDER BY count DESC
  `).bind(id, ...params).all<{ status: string; count: number }>();

  const total = result.results.reduce((s, r) => s + r.count, 0);
  const data = result.results.map(r => ({
    status: r.status,
    count: r.count,
    percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
  }));

  return c.json({ data });
});

// ── GET /api/dashboards/:id/initiative-by-platform ────────────────────────────
router.get('/:id/initiative-by-platform', authMiddleware, async (c) => {
  const { id } = c.req.param();
  const { conditions, params } = buildFilters(c);
  const where = conditions.length ? `AND ${conditions.join(' AND ')}` : '';

  const result = await c.env.DB.prepare(`
    SELECT
      COALESCE(platform, 'Other') as platform,
      COUNT(*) as count,
      ROUND(SUM(planned_md), 2) as planned_md,
      ROUND(SUM(actual_md), 2) as actual_md
    FROM requirements
    WHERE dashboard_id = ? ${where}
    GROUP BY platform
    ORDER BY count DESC
  `).bind(id, ...params).all();

  return c.json({ data: result.results });
});

// ── GET /api/dashboards/:id/resource-utilization ──────────────────────────────
router.get('/:id/resource-utilization', authMiddleware, async (c) => {
  const { id } = c.req.param();

  const result = await c.env.DB.prepare(`
    SELECT
      rc.team,
      rc.month,
      rc.capacity_md,
      COALESCE(
        (SELECT SUM(r.actual_md) FROM requirements r
         WHERE r.dashboard_id = rc.dashboard_id
         AND r.pic = rc.team
         AND strftime('%Y-%m', r.due_date) = rc.month),
        0
      ) as used_md
    FROM resource_capacity rc
    WHERE rc.dashboard_id = ?
    ORDER BY rc.month, rc.team
  `).bind(id).all<{ team: string; month: string; capacity_md: number; used_md: number }>();

  const data = result.results.map(r => ({
    team: r.team,
    month: r.month,
    capacityMd: r.capacity_md,
    usedMd: r.used_md,
    utilizationPct: r.capacity_md > 0 ? Math.round((r.used_md / r.capacity_md) * 100) : 0,
  }));

  return c.json({ data });
});

// ── GET /api/dashboards/:id/delivery-timeline ─────────────────────────────────
router.get('/:id/delivery-timeline', authMiddleware, async (c) => {
  const { id } = c.req.param();

  const result = await c.env.DB.prepare(`
    SELECT
      month,
      SUM(target) as target,
      SUM(actual) as actual,
      CASE WHEN SUM(target) > 0
        THEN ROUND(SUM(actual) * 100.0 / SUM(target), 1)
        ELSE 0
      END as achievement
    FROM delivery_target
    WHERE dashboard_id = ?
    GROUP BY month
    ORDER BY month
  `).bind(id).all<{ month: string; target: number; actual: number; achievement: number }>();

  return c.json({ data: result.results });
});

// ── GET /api/dashboards/:id/filter-options ────────────────────────────────────
router.get('/:id/filter-options', authMiddleware, async (c) => {
  const { id } = c.req.param();

  const [pics, categories, platforms, years] = await Promise.all([
    c.env.DB.prepare('SELECT DISTINCT pic FROM requirements WHERE dashboard_id = ? AND pic IS NOT NULL ORDER BY pic').bind(id).all<{ pic: string }>(),
    c.env.DB.prepare('SELECT DISTINCT category FROM requirements WHERE dashboard_id = ? AND category IS NOT NULL ORDER BY category').bind(id).all<{ category: string }>(),
    c.env.DB.prepare('SELECT DISTINCT platform FROM requirements WHERE dashboard_id = ? AND platform IS NOT NULL ORDER BY platform').bind(id).all<{ platform: string }>(),
    c.env.DB.prepare("SELECT DISTINCT strftime('%Y', due_date) as year FROM requirements WHERE dashboard_id = ? AND due_date IS NOT NULL ORDER BY year DESC").bind(id).all<{ year: string }>(),
  ]);

  return c.json({
    data: {
      pics: pics.results.map(r => r.pic),
      categories: categories.results.map(r => r.category),
      platforms: platforms.results.map(r => r.platform),
      years: years.results.map(r => r.year),
    }
  });
});

export { router as kpiRouter };
