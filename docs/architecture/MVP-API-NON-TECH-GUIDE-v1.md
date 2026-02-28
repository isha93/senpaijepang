# MVP API Non-Tech Guide v1

Date: 2026-02-28
Audience: PM, Ops, Compliance, Stakeholder non-engineering

## 1. Dokumen Ini Untuk Apa?
Dokumen ini menjelaskan kemampuan produk saat ini dalam bahasa bisnis, bukan bahasa kode.

Tujuan utama MVP saat ini:
- Membuat proses verifikasi identitas yang bisa diaudit.
- Memastikan ada jalur review manual untuk keputusan berisiko.
- Menjaga tim bisa memonitor kesehatan sistem secara dasar.

## 2. Alur Bisnis Sederhana
```mermaid
flowchart TD
    A[User daftar akun] --> B[User kirim dokumen identitas]
    B --> C[Status jadi SUBMITTED]
    C --> D[Admin melihat review queue]
    D --> E{Keputusan}
    E --> F[VERIFIED]
    E --> G[REJECTED]
    E --> H[MANUAL_REVIEW]
    H --> E
```

## 3. Nilai Bisnis Yang Sudah Didapat
- Ada jejak keputusan: siapa review, kapan review, dan alasannya.
- Proses verifikasi tidak blind: ada state/status yang jelas.
- Tim teknis punya endpoint health + metrics untuk operasional dasar.

## 4. Hal Yang Bisa Diuji PM/Ops Hari Ini
- User bisa register/login.
- User bisa submit KYC.
- Admin bisa ambil daftar antrean review.
- Admin bisa memberi keputusan dan melihat dampaknya pada status.

## 5. Batasan MVP Saat Ini
- Belum ada UI production untuk user/admin di repo ini.
- Integrasi vendor KYC masih tahap stub (belum final production hardening).
- Otorisasi admin masih shared key, belum model role-token granular.

## 6. Definisi “Siap Demo Internal”
Sistem dianggap siap demo internal jika:
- `npm run ci` pass
- `npm run check:dev-all` pass
- alur KYC dari create session sampai review decision bisa dijalankan

## 7. Risiko Yang Perlu Dipahami Non-Tech
- Jika Docker tidak jalan, environment lokal terlihat “down” walau kode benar.
- Jika `ADMIN_API_KEY` salah, endpoint admin pasti ditolak (ini expected).
- Jika object storage tidak siap, alur upload dokumen bisa gagal.

## 8. Dokumen Lanjutan
- Breakdown teknis: `docs/architecture/MVP-API-BREAKDOWN-v1.md`
- Status implementasi detail: `docs/architecture/API-IMPLEMENTATION-STATUS-v0.md`
- Kontrak endpoint: `docs/architecture/openapi-runtime-v0.yaml`
