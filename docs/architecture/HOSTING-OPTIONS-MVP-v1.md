# Hosting Options MVP v1 (API Staging)

Date: 2026-03-01  
Audience: Backend, PM, QA, iOS integration team

## 1. Tujuan
- Menyediakan API staging publik untuk integrasi iOS.
- Menjaga setup tetap sederhana, murah, dan cepat dioperasikan untuk MVP.
- Menetapkan jalur upgrade ke arsitektur yang lebih production-grade.

## 2. Prinsip Pemilihan
- Prioritas 1: waktu setup tercepat untuk integration testing.
- Prioritas 2: persistence data (Postgres + object storage) yang stabil.
- Prioritas 3: observability minimum (`/health`, `/metrics`, logs) tetap tersedia.

## 3. Opsi Hosting yang Direkomendasikan

### Option A (Recommended): Railway
Kapan dipilih:
- Mau staging tercepat dengan kompleksitas operasi paling rendah.

Komponen:
- API service (Node.js app)
- Managed PostgreSQL
- Managed Redis (opsional)
- S3-compatible storage eksternal untuk dokumen KYC

Kelebihan:
- Setup cepat untuk service + database dalam satu platform.
- Cocok untuk tim kecil yang butuh iterasi cepat.

Kekurangan:
- Kontrol infrastruktur lebih terbatas dibanding IaaS/AWS native stack.

### Option B: Render
Kapan dipilih:
- Butuh workflow PaaS yang mirip Railway tapi dengan model service terpisah.

Komponen:
- Web Service untuk API
- Managed PostgreSQL
- Managed Redis (opsional)
- Object storage eksternal (S3-compatible)

Kelebihan:
- Mudah dipakai untuk API Node dan resource pendukung.

Kekurangan:
- Tetap perlu manajemen konfigurasi lintas service secara disiplin.

### Option C: AWS ECS Fargate + RDS + S3
Kapan dipilih:
- Butuh jalur paling dekat ke production scale/compliance sejak awal.

Komponen:
- ECS Fargate service untuk API
- RDS PostgreSQL
- S3 bucket untuk dokumen
- (Opsional) ElastiCache Redis

Kelebihan:
- Kontrol, security posture, dan skalabilitas paling fleksibel.

Kekurangan:
- Setup dan operasi lebih kompleks, waktu initial rollout lebih lama.

## 4. Rekomendasi Eksekusi untuk Fase Sekarang
- Gunakan **Option A (Railway)** untuk staging integrasi iOS pertama.
- Jika kebutuhan compliance/ops naik, migrasi bertahap ke **Option C (AWS)**.

Estimasi waktu realistis (tanpa blocker besar):
- Setup staging awal: 0.5 sampai 1.5 hari kerja.
- Hardening env + smoke + iOS connection check: 0.5 sampai 1 hari kerja.
- Total ke staging usable: sekitar 1 sampai 3 hari kerja.

## 5. Konfigurasi Wajib di Staging

Environment minimum:
- `AUTH_STORE=postgres`
- `DATABASE_URL=postgresql://...`
- `ADMIN_API_KEY=...` (sementara jika bootstrap admin token belum full)
- `OBJECT_STORAGE_PROVIDER=s3`
- `OBJECT_STORAGE_BUCKET=...`
- `OBJECT_STORAGE_REGION=...`
- `OBJECT_STORAGE_ENDPOINT=...` (opsional untuk non-AWS S3 compatible)
- `OBJECT_STORAGE_ACCESS_KEY_ID=...`
- `OBJECT_STORAGE_SECRET_ACCESS_KEY=...`
- `KYC_PROVIDER_WEBHOOK_SECRET=...`
- `KYC_PROVIDER_WEBHOOK_REQUIRE_SIGNATURE=true`
- `KYC_PROVIDER_WEBHOOK_MAX_SKEW_SEC=300`

Runtime command:
- Build: `npm install`
- Start: `API_PORT=${PORT:-4000} npm run start -w @senpaijepang/api`
- Migration (pre-deploy/release step): `npm run migrate -w @senpaijepang/api`

Catatan:
- App membaca `API_PORT`, jadi pastikan nilainya mengikuti port runtime platform.

## 6. Deployment Checklist
- Set semua env var rahasia di platform hosting.
- Jalankan migration sebelum trafik dibuka.
- Verifikasi `GET /health` dan `GET /metrics`.
- Jalankan smoke flow minimal:
  - auth register/login/me
  - KYC session -> upload-url -> documents -> submit
  - admin review queue -> decision
  - jobs/feed/profile read path untuk user login
- Verifikasi iOS dapat hit endpoint staging dengan auth valid.

## 7. Exit Criteria Staging “Ready for iOS Team”
- URL staging stabil dan dapat diakses dari device/test environment iOS.
- Data persistence aktif (Postgres), bukan memory-only.
- Object storage upload flow KYC lulus end-to-end.
- Tidak ada blocker P0/P1 pada auth, jobs/feed/profile, dan KYC.
- Contract runtime sinkron dengan `openapi-runtime-v0.yaml`.

## 8. Referensi
- Railway docs:
  - https://docs.railway.com/guides/services
  - https://docs.railway.com/guides/postgresql
  - https://docs.railway.com/databases/redis
- Render docs:
  - https://render.com/docs/web-services
  - https://render.com/docs/postgresql
  - https://render.com/docs/redis
- AWS docs:
  - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html
  - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html
  - https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html
