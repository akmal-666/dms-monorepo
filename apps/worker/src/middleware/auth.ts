import { Context, Next } from 'hono';
import { jwtVerify } from 'jose';

export interface JwtUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'viewer';
}

export type AppEnv = {
  Bindings: {
    DB: D1Database;
    R2: R2Bucket;
    JWT_SECRET: string;
    CORS_ORIGIN: string;
  };
  Variables: {
    user: JwtUser;
  };
};

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const authHeader = c.req.header('Authorization');
  const cookieToken = getCookie(c.req.raw.headers.get('Cookie') ?? '', 'dms_token');
  const token = authHeader?.replace('Bearer ', '') ?? cookieToken;

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    c.set('user', payload as unknown as JwtUser);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
}

export function requireRole(...roles: Array<'admin' | 'manager' | 'viewer'>) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  };
}

function getCookie(cookieHeader: string, name: string): string | undefined {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}
