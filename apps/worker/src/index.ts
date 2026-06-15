import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { authRouter } from './routes/auth';
import { dashboardRouter } from './routes/dashboards';
import { kpiRouter } from './routes/kpi';
import { requirementsRouter } from './routes/requirements';
import { importRouter } from './routes/import';
import { AppEnv } from './middleware/auth';

const app = new Hono<AppEnv>();

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use('*', corsMiddleware());

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (c) => c.json({ service: 'DMS API', version: '1.0.0', status: 'ok' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.route('/api/auth', authRouter);
app.route('/api/dashboards', dashboardRouter);

// KPI & Charts — nested under dashboards
app.route('/api/dashboards', kpiRouter);

// Requirements — nested under dashboards
app.route('/api/dashboards', requirementsRouter);

// Import — template endpoint + nested dashboard imports
app.get('/api/import/template', (c) => importRouter.fetch(
  new Request(c.req.raw.url.replace('/api/import/template', '/template'), c.req.raw),
  c.env
));
app.route('/api/dashboards', importRouter);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// ── Error Handler ─────────────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal Server Error', details: err.message }, 500);
});

export default app;
