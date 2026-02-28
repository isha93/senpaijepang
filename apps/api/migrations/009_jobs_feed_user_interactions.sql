CREATE TABLE IF NOT EXISTS user_saved_jobs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_user_saved_jobs_user_id_created_at
  ON user_saved_jobs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_saved_posts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_user_saved_posts_user_id_created_at
  ON user_saved_posts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('SUBMITTED', 'IN_REVIEW', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_job_applications_user_id_updated_at
  ON job_applications (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS job_application_journey_events (
  id UUID PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('SUBMITTED', 'IN_REVIEW', 'INTERVIEW', 'OFFERED', 'HIRED', 'REJECTED')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_application_journey_application_id_created_at
  ON job_application_journey_events (application_id, created_at ASC);
