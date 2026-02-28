CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  org_type TEXT NOT NULL,
  country_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (org_type IN ('TSK', 'LPK', 'EMPLOYER')),
  CHECK (country_code ~ '^[A-Z]{2}$')
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner_user_id ON organizations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_org_type ON organizations(org_type);

CREATE TABLE IF NOT EXISTS organization_verifications (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  reason_codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  registration_number TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  supporting_object_keys_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('PENDING', 'VERIFIED', 'MISMATCH', 'NOT_FOUND', 'REJECTED'))
);

CREATE INDEX IF NOT EXISTS idx_org_verifications_status ON organization_verifications(status);
CREATE INDEX IF NOT EXISTS idx_org_verifications_last_checked_at ON organization_verifications(last_checked_at DESC);
