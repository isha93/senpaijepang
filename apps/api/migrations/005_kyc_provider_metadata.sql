ALTER TABLE kyc_sessions
ADD COLUMN IF NOT EXISTS provider_ref TEXT;

ALTER TABLE kyc_sessions
ADD COLUMN IF NOT EXISTS provider_metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_kyc_sessions_provider_ref ON kyc_sessions(provider_ref);
