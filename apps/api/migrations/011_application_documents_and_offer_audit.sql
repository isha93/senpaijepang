ALTER TABLE job_application_journey_events
  ADD COLUMN IF NOT EXISTS actor_type TEXT;

ALTER TABLE job_application_journey_events
  ADD COLUMN IF NOT EXISTS actor_id TEXT;

ALTER TABLE job_application_journey_events
  DROP CONSTRAINT IF EXISTS job_application_journey_events_actor_type_check;

ALTER TABLE job_application_journey_events
  ADD CONSTRAINT job_application_journey_events_actor_type_check
  CHECK (actor_type IS NULL OR actor_type IN ('USER', 'ADMIN', 'SYSTEM'));

CREATE INDEX IF NOT EXISTS idx_job_application_journey_actor_id_created_at
  ON job_application_journey_events (actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS job_application_documents (
  id UUID PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_length BIGINT NOT NULL CHECK (content_length > 0),
  object_key TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  file_url TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (review_status IN ('PENDING', 'VALID', 'INVALID')),
  review_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (application_id, checksum_sha256),
  UNIQUE (object_key)
);

CREATE INDEX IF NOT EXISTS idx_job_application_documents_application_id_created_at
  ON job_application_documents (application_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_application_documents_user_id_created_at
  ON job_application_documents (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_application_documents_review_status
  ON job_application_documents (review_status, created_at DESC);
