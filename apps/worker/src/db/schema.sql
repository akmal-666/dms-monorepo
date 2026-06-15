-- ============================================================
-- DMS Database Schema (Cloudflare D1 / SQLite)
-- Run: wrangler d1 execute DMS_DB --local --file=src/db/schema.sql
-- ============================================================

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','manager','viewer')),
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Dashboards ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dashboards (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  owner_id    TEXT NOT NULL REFERENCES users(id),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  cloned_from TEXT REFERENCES dashboards(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dashboard_members (
  dashboard_id TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','manager','viewer')),
  added_at     TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (dashboard_id, user_id)
);

-- ── Requirements ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS requirements (
  id              TEXT PRIMARY KEY,
  dashboard_id    TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  req_id          TEXT NOT NULL,
  title           TEXT NOT NULL,
  category        TEXT,
  platform        TEXT,
  requestor       TEXT,
  pic             TEXT,
  status          TEXT NOT NULL DEFAULT 'Draft'
                    CHECK (status IN ('Draft','In Progress','Done','Overdue','Cancelled')),
  progress        INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  start_date      TEXT,
  due_date        TEXT,
  planned_md      REAL NOT NULL DEFAULT 0 CHECK (planned_md >= 0),
  actual_md       REAL NOT NULL DEFAULT 0 CHECK (actual_md >= 0),
  import_batch_id TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (dashboard_id, req_id)
);

CREATE INDEX IF NOT EXISTS idx_requirements_dashboard ON requirements(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_requirements_status    ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_pic       ON requirements(pic);
CREATE INDEX IF NOT EXISTS idx_requirements_platform  ON requirements(platform);

-- ── Resource Capacity ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resource_capacity (
  id              TEXT PRIMARY KEY,
  dashboard_id    TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  team            TEXT NOT NULL,
  month           TEXT NOT NULL,  -- YYYY-MM
  capacity_md     REAL NOT NULL DEFAULT 0 CHECK (capacity_md >= 0),
  import_batch_id TEXT,
  UNIQUE (dashboard_id, team, month)
);

CREATE INDEX IF NOT EXISTS idx_resource_dashboard ON resource_capacity(dashboard_id);

-- ── Delivery Target ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_target (
  id              TEXT PRIMARY KEY,
  dashboard_id    TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  month           TEXT NOT NULL,  -- YYYY-MM
  team            TEXT NOT NULL,
  target          REAL NOT NULL DEFAULT 0,
  actual          REAL NOT NULL DEFAULT 0,
  import_batch_id TEXT,
  UNIQUE (dashboard_id, month, team)
);

CREATE INDEX IF NOT EXISTS idx_delivery_dashboard ON delivery_target(dashboard_id);

-- ── Import History ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_history (
  id            TEXT PRIMARY KEY,
  dashboard_id  TEXT NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  r2_key        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','validating','success','failed')),
  total_rows    INTEGER NOT NULL DEFAULT 0,
  inserted_rows INTEGER NOT NULL DEFAULT 0,
  updated_rows  INTEGER NOT NULL DEFAULT 0,
  error_rows    INTEGER NOT NULL DEFAULT 0,
  errors_json   TEXT,  -- JSON array of ImportError
  imported_by   TEXT NOT NULL REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_import_dashboard ON import_history(dashboard_id);

-- ── Seed Admin User ───────────────────────────────────────────────────────────
-- Default: admin@dms.local / Admin@12345 (bcrypt hash placeholder — change in production)
-- Generate hash: use the /api/auth/seed endpoint in dev only
INSERT OR IGNORE INTO users (id, email, password_hash, name, role)
VALUES (
  'usr_admin_001',
  'admin@dms.local',
  '$2b$10$placeholder_hash_change_me',
  'System Administrator',
  'admin'
);
