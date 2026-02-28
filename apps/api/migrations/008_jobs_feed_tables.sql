CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  employment_type TEXT NOT NULL CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACT')),
  visa_sponsorship BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NOT NULL,
  requirements_json JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(requirements_json) = 'array'),
  location_json JSONB NOT NULL CHECK (jsonb_typeof(location_json) = 'object'),
  employer_json JSONB NOT NULL CHECK (jsonb_typeof(employer_json) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON jobs (employment_type);
CREATE INDEX IF NOT EXISTS idx_jobs_visa_sponsorship ON jobs (visa_sponsorship);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs (created_at DESC);

CREATE TABLE IF NOT EXISTS feed_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  category TEXT NOT NULL,
  author TEXT NOT NULL,
  image_url TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_posts_category ON feed_posts (category);
CREATE INDEX IF NOT EXISTS idx_feed_posts_published_at ON feed_posts (published_at DESC);

INSERT INTO jobs (
  id,
  title,
  employment_type,
  visa_sponsorship,
  description,
  requirements_json,
  location_json,
  employer_json
) VALUES
  (
    'job_tokyo_senior_welder_001',
    'Senior Welder',
    'FULL_TIME',
    TRUE,
    'We are looking for an experienced welder to join our infrastructure projects in Tokyo.',
    '[
      "Minimum 3 years of professional welding experience (MIG/TIG).",
      "Basic Japanese language proficiency (N4 or conversational).",
      "Willingness to relocate to Tokyo for at least 2 years."
    ]'::jsonb,
    '{
      "countryCode": "JP",
      "city": "Tokyo",
      "displayLabel": "Tokyo, JP",
      "latitude": 35.6762,
      "longitude": 139.6503
    }'::jsonb,
    '{
      "id": "emp_tokyo_construction",
      "name": "Tokyo Construction Co.",
      "logoUrl": null,
      "isVerifiedEmployer": true
    }'::jsonb
  ),
  (
    'job_osaka_cnc_operator_002',
    'CNC Operator',
    'CONTRACT',
    TRUE,
    'Operate and maintain CNC machines for high precision manufacturing.',
    '[
      "2+ years CNC machining experience.",
      "Able to read technical drawings.",
      "Basic safety and quality documentation handling."
    ]'::jsonb,
    '{
      "countryCode": "JP",
      "city": "Osaka",
      "displayLabel": "Osaka, JP",
      "latitude": 34.6937,
      "longitude": 135.5023
    }'::jsonb,
    '{
      "id": "emp_kansai_precision",
      "name": "Kansai Precision Works",
      "logoUrl": null,
      "isVerifiedEmployer": true
    }'::jsonb
  ),
  (
    'job_nagoya_warehouse_staff_003',
    'Warehouse Staff',
    'FULL_TIME',
    FALSE,
    'Handle receiving, sorting, and dispatch operations in Nagoya warehouse.',
    '[
      "Experience in logistics or warehouse operations.",
      "Comfortable with shift scheduling.",
      "Forklift license is a plus."
    ]'::jsonb,
    '{
      "countryCode": "JP",
      "city": "Nagoya",
      "displayLabel": "Nagoya, JP",
      "latitude": 35.1815,
      "longitude": 136.9066
    }'::jsonb,
    '{
      "id": "emp_chubu_logistics",
      "name": "Chubu Logistics",
      "logoUrl": null,
      "isVerifiedEmployer": false
    }'::jsonb
  ),
  (
    'job_fukuoka_eldercare_assistant_004',
    'Eldercare Assistant',
    'PART_TIME',
    TRUE,
    'Support daily eldercare routines and assist senior care staff.',
    '[
      "Compassionate communication skills.",
      "Prior caregiving experience preferred.",
      "Readiness for weekend shifts."
    ]'::jsonb,
    '{
      "countryCode": "JP",
      "city": "Fukuoka",
      "displayLabel": "Fukuoka, JP",
      "latitude": 33.5902,
      "longitude": 130.4017
    }'::jsonb,
    '{
      "id": "emp_hakata_care",
      "name": "Hakata Care Home",
      "logoUrl": null,
      "isVerifiedEmployer": true
    }'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO feed_posts (
  id,
  title,
  excerpt,
  category,
  author,
  image_url,
  published_at
) VALUES
  (
    'post_jp_work_culture_001',
    '5 Hal yang Perlu Kamu Tahu Tentang Budaya Kerja di Jepang',
    'Ringkasan etika kerja, komunikasi, dan ekspektasi tim di perusahaan Jepang.',
    'CAREER',
    'Senpai Editorial',
    NULL,
    '2026-02-10T09:00:00.000Z'::timestamptz
  ),
  (
    'post_visa_update_002',
    'Update Visa Kerja 2026: Checklist Dokumen yang Wajib',
    'Perubahan requirement dokumen dan tips supaya proses lebih lancar.',
    'VISA',
    'Senpai Ops',
    NULL,
    '2026-02-14T09:00:00.000Z'::timestamptz
  ),
  (
    'post_interview_tips_003',
    'Interview Kaisha: Pertanyaan yang Sering Muncul',
    'Contoh jawaban dan pola komunikasi yang lebih cocok untuk employer Jepang.',
    'INTERVIEW',
    'Senpai Mentor',
    NULL,
    '2026-02-18T09:00:00.000Z'::timestamptz
  ),
  (
    'post_life_in_tokyo_004',
    'Hidup di Tokyo dengan Budget Awal yang Aman',
    'Perkiraan biaya tinggal, transport, dan kebutuhan dasar bulan pertama.',
    'LIFESTYLE',
    'Senpai Community',
    NULL,
    '2026-02-22T09:00:00.000Z'::timestamptz
  )
ON CONFLICT (id) DO NOTHING;
