import { Context, Next } from 'hono';
import { AppEnv } from './auth';

export function corsMiddleware() {
  return async (c: Context<AppEnv>, next: Next) => {
    const requestOrigin = c.req.header('Origin') ?? '';
    const configuredOrigin = c.env.CORS_ORIGIN || 'http://localhost:3000';

    // Allow exact match OR any localhost port in dev
    const isAllowed =
      requestOrigin === configuredOrigin ||
      /^http:\/\/localhost:\d+$/.test(requestOrigin);

    const allowOrigin = isAllowed ? requestOrigin : configuredOrigin;

    c.header('Access-Control-Allow-Origin', allowOrigin);
    c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Access-Control-Max-Age', '86400');
    c.header('Vary', 'Origin');

    if (c.req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }
    await next();
  };
}
