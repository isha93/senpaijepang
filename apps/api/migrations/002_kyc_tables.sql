CREATE TABLE IF NOT EXISTS kyc_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('CREATED', 'SUBMITTED', 'MANUAL_REVIEW', 'VERIFIED', 'REJECTED')),
  provider TEXT NOT NULL DEFAULT 'manual',
  submitted_at TIMESTAMPTZ,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_sessions_user_id_created_at ON kyc_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kyc_sessions_status ON kyc_sessions(status);

CREATE TABLE IF NOT EXISTS identity_documents (
  id UUID PRIMARY KEY,
  kyc_session_id UUID NOT NULL REFERENCES kyc_sessions(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identity_documents_kyc_session_id ON identity_documents(kyc_session_id);
CREATE INDEX IF NOT EXISTS idx_identity_documents_document_type ON identity_documents(document_type);
