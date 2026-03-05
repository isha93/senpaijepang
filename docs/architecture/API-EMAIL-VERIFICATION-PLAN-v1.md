# API Plan — Auth Email Verification (Onboarding 4-Step)

Date: 2026-03-05  
Status: Planned (UI already integrated on iOS, backend endpoint not implemented yet)

## 1. Objective
- Menambahkan verifikasi email OTP 6 digit setelah registrasi account info + preferences.
- Menutup celah akun belum-verifikasi agar tidak bisa lanjut ke KYC/apply sebelum email verified.

## 2. Target Flow
1. User submit register (`POST /auth/register`) -> account dibuat.
2. Client request kirim OTP -> `POST /auth/email-verification/send`.
3. User input OTP -> `POST /auth/email-verification/verify`.
4. Jika valid: tandai user `email_verified = true`, allow lanjut onboarding (`All Set`).
5. Jika expired/salah: user bisa `resend`.

## 3. Proposed Endpoints (Runtime v0 naming)

### 3.1 Send code
- `POST /auth/email-verification/send`
- Auth: Bearer user token
- Request:
```json
{
  "purpose": "REGISTER",
  "email": "isa.nf@senpaijepang.com"
}
```
- Response `200`:
```json
{
  "verificationId": "verif_123",
  "expiresAt": "2026-03-05T15:00:00Z",
  "resendAvailableAt": "2026-03-05T14:59:00Z",
  "nextResendInSec": 60
}
```

### 3.2 Verify code
- `POST /auth/email-verification/verify`
- Auth: Bearer user token
- Request:
```json
{
  "purpose": "REGISTER",
  "email": "isa.nf@senpaijepang.com",
  "code": "123456"
}
```
- Response `200`:
```json
{
  "verified": true,
  "verifiedAt": "2026-03-05T15:00:30Z"
}
```

### 3.3 Resend code
- `POST /auth/email-verification/resend`
- Auth: Bearer user token
- Request:
```json
{
  "purpose": "REGISTER",
  "email": "isa.nf@senpaijepang.com"
}
```
- Response `200`:
```json
{
  "verificationId": "verif_124",
  "expiresAt": "2026-03-05T15:03:00Z",
  "resendAvailableAt": "2026-03-05T15:02:00Z",
  "nextResendInSec": 60
}
```

## 4. Validation And Rules
- OTP: numeric 6 digit.
- TTL OTP: 5 menit.
- Max verify attempts per code: 5.
- Resend cooldown: 60 detik.
- Max resend per hour: 5.
- OTP hanya berlaku untuk `purpose` + `email` + `userId` yang sama.
- Setelah verified: endpoint verify harus idempotent (`verified: true`), tidak error.

## 5. Data Model Additions (Proposed)
- Table `email_verifications`
  - `id`
  - `user_id`
  - `email`
  - `purpose` (`REGISTER`)
  - `code_hash`
  - `status` (`ACTIVE|VERIFIED|EXPIRED|LOCKED`)
  - `attempt_count`
  - `max_attempts`
  - `resend_count`
  - `expires_at`
  - `resend_available_at`
  - `verified_at`
  - `created_at`
  - `updated_at`
- Add field `users.email_verified_at` (nullable timestamp).

## 6. Security
- Simpan OTP dalam hash (`code_hash`), jangan plaintext.
- Rate limit endpoint send/resend/verify (by user + IP).
- Error response jangan leak apakah email ada/tidak.
- Audit events:
  - `auth.email_verification.sent`
  - `auth.email_verification.verified`
  - `auth.email_verification.failed`
  - `auth.email_verification.locked`

## 7. Implementation Sequence
1. Migration DB (`email_verifications` + `users.email_verified_at`).
2. Service layer:
   - generate OTP
   - hash + persist
   - send via provider
   - verify + lock policy
3. HTTP handlers + OpenAPI update (`openapi-runtime-v0.yaml`).
4. iOS integration:
   - ganti UI-only verify ke real API call.
   - handle invalid/expired/rate-limit states.
5. QA automation update (Appium + iOS tests).

## 8. Test Plan
- Unit:
  - OTP generation/expiry/attempt lock.
  - resend cooldown and counter.
  - idempotent verify after success.
- Integration/API:
  - send -> verify success.
  - wrong code 5x -> locked.
  - resend before cooldown -> 429.
  - expired code -> 400.
- E2E:
  - register -> verify email -> success onboarding.

## 9. Consumer Notes
- iOS sekarang sudah punya UI step `Verify Email` (placeholder behavior).
- Android belum wajib untuk flow ini sekarang (follow iOS setelah API stable).
- Web admin tidak perlu action khusus, cukup observability/audit events.

## 10. Done Criteria
- Endpoint available dan terdokumentasi.
- iOS verify step pakai real endpoint (bukan local success).
- Appium regression register+verify pass.
- API smoke + auth regression pass di staging/prod candidate.
