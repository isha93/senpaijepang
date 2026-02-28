CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

INSERT INTO roles (id, code, description)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'sdm', 'Default SDM candidate role'),
  ('00000000-0000-0000-0000-000000000002', 'lpk', 'LPK dashboard role'),
  ('00000000-0000-0000-0000-000000000003', 'tsk', 'TSK dashboard role'),
  ('00000000-0000-0000-0000-000000000004', 'kaisha', 'Kaisha dashboard role'),
  ('00000000-0000-0000-0000-000000000005', 'super_admin', 'Super admin dashboard role')
ON CONFLICT (code) DO NOTHING;
