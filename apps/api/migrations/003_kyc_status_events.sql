CREATE TABLE IF NOT EXISTS kyc_status_events (
  id UUID PRIMARY KEY,
  kyc_session_id UUID NOT NULL REFERENCES kyc_sessions(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL CHECK (to_status IN ('CREATED', 'SUBMITTED', 'MANUAL_REVIEW', 'VERIFIED', 'REJECTED')),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('USER', 'ADMIN', 'SYSTEM')),
  actor_id TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_status_events_session_created_at
  ON kyc_status_events(kyc_session_id, created_at ASC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_identity_documents_session_checksum'
  ) THEN
    ALTER TABLE identity_documents
    ADD CONSTRAINT uq_identity_documents_session_checksum
    UNIQUE (kyc_session_id, checksum_sha256);
  END IF;
END $$;
