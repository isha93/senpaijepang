ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'PUBLISHED';

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ;

ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS jobs_lifecycle_status_check;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_lifecycle_status_check
  CHECK (lifecycle_status IN ('DRAFT', 'PUBLISHED', 'SCHEDULED'));

CREATE INDEX IF NOT EXISTS idx_jobs_lifecycle_status ON jobs (lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_publish_at ON jobs (scheduled_publish_at);

UPDATE jobs
SET published_at = COALESCE(published_at, created_at)
WHERE lifecycle_status = 'PUBLISHED';

ALTER TABLE feed_posts
  ALTER COLUMN published_at DROP NOT NULL;

ALTER TABLE feed_posts
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'PUBLISHED';

ALTER TABLE feed_posts
  ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ;

ALTER TABLE feed_posts
  DROP CONSTRAINT IF EXISTS feed_posts_lifecycle_status_check;

ALTER TABLE feed_posts
  ADD CONSTRAINT feed_posts_lifecycle_status_check
  CHECK (lifecycle_status IN ('DRAFT', 'PUBLISHED', 'SCHEDULED'));

CREATE INDEX IF NOT EXISTS idx_feed_posts_lifecycle_status ON feed_posts (lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_feed_posts_scheduled_publish_at ON feed_posts (scheduled_publish_at);

UPDATE feed_posts
SET lifecycle_status = COALESCE(lifecycle_status, 'PUBLISHED');

UPDATE feed_posts
SET published_at = created_at
WHERE lifecycle_status = 'PUBLISHED' AND published_at IS NULL;
