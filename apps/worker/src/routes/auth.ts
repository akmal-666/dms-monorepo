import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { SignJWT } from 'jose';
import { AppEnv } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { nanoid } from '../utils/nanoid';

const router = new Hono<AppEnv>();

// ── Simple password hash (Workers compatible, no bcrypt) ──────────────────────
// Using SHA-256 + salt stored in hash prefix
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const enc = new TextEncoder();
  const keyData = enc.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `sha256:${salt}:${hashHex}`;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith('sha256:')) {
    const [, salt, storedHash] = hash.split(':');
    const enc = new TextEncoder();
    const keyData = enc.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === storedHash;
  }
  // Legacy placeholder — force password reset
  return false;
}

async function signToken(payload: object, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(key);
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post(
  '/login',
  zValidator('json', z.object({
    email: z.string().email(),
    password: z.string().min(6),
  })),
  async (c) => {
    const { email, password } = c.req.valid('json');

    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ? AND is_active = 1'
    ).bind(email).first<{
      id: string; email: string; password_hash: string;
      name: string; role: string;
    }>();

    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const token = await signToken(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      c.env.JWT_SECRET
    );

    c.header('Set-Cookie',
      `dms_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`
    );

    return c.json({
      data: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        token,
      }
    });
  }
);

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', (c) => {
  c.header('Set-Cookie', 'dms_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  return c.json({ data: { message: 'Logged out' } });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const dbUser = await c.env.DB.prepare(
    'SELECT id, email, name, role, created_at FROM users WHERE id = ?'
  ).bind(user.id).first();

  if (!dbUser) return c.json({ error: 'User not found' }, 404);
  return c.json({ data: dbUser });
});

// ── GET /api/auth/users (admin only) ─────────────────────────────────────────
router.get('/users', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const users = await c.env.DB.prepare(
    'SELECT id, email, name, role, is_active, created_at FROM users ORDER BY created_at DESC'
  ).all();
  return c.json({ data: users.results });
});

// ── POST /api/auth/users (admin only) ────────────────────────────────────────
router.post(
  '/users',
  authMiddleware,
  zValidator('json', z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1),
    role: z.enum(['admin', 'manager', 'viewer']),
  })),
  async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

    const { email, password, name, role } = c.req.valid('json');

    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) return c.json({ error: 'Email already exists' }, 409);

    const id = nanoid('usr');
    const hash = await hashPassword(password);
    await c.env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, email, hash, name, role).run();

    return c.json({ data: { id, email, name, role } }, 201);
  }
);

// ── DEV: POST /api/auth/seed ──────────────────────────────────────────────────
// Creates or resets admin password — disable in production!
router.post('/seed', async (c) => {
  if (c.env.JWT_SECRET !== 'local-dev-secret-change-in-production') {
    return c.json({ error: 'Seed endpoint disabled in production' }, 403);
  }
  const hash = await hashPassword('Admin@12345');
  await c.env.DB.prepare(
    `UPDATE users SET password_hash = ? WHERE email = 'admin@dms.local'`
  ).bind(hash).run();
  return c.json({ data: { message: 'Admin password set to Admin@12345' } });
});

export { router as authRouter };
