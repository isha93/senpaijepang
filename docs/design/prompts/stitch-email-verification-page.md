# Stitch Prompt - Senpai Jepang iOS - Email Verification Page

Design a production-ready iOS screen for **Email Verification** that fits the existing Senpai Jepang app style (clean, light, green accent #34C759, rounded cards, modern native iOS feel).

## Context
- This screen appears after user completes account registration form.
- Goal: verify email before user can continue to KYC and apply jobs.
- Keep UX simple, fast, and clear for non-technical users.

## Layout
- Safe area top with back button (left) and title centered: **"Verify Email"**.
- Progress stepper at top with 4 steps:
  1. Account Info (done)
  2. Preferences (done)
  3. Verify Email (active)
  4. All Set (pending)
- Main content card:
  - Heading: **"Check your email"**
  - Description: **"We sent a 6-digit code to isa.nf@senpaijepang.com"** (support masked email variant)
  - 6 OTP input boxes in one row (auto-advance behavior implied)
  - Helper text under inputs for error/success info
- Secondary actions:
  - Text link: **"Change email"**
  - Resend section: **"Resend code in 00:58"** then turns into tappable **"Resend code"**
- Sticky bottom CTA area:
  - Primary button: **"Verify Email"**
  - Disabled state if OTP < 6 digits
  - Loading state with spinner + button disabled

## States to include in design
Create separate frames for these states:
1. Default (empty OTP)
2. Typing OTP (partially filled)
3. Complete OTP (button enabled)
4. Invalid OTP (error text: "Code is invalid. Please try again.")
5. Verifying (button spinner, all interactions locked)
6. Success (inline success + auto-continue hint)

## Visual style requirements
- Use app design language matching existing Register/Login screens.
- Rounded corners: 10-16 range.
- Spacing rhythm: 8 / 12 / 16 / 24.
- Keep background soft off-white, card white/light gray.
- Accent color remains green, avoid introducing new palette.
- Typography hierarchy clear and readable on mobile.

## Component behavior notes (for handoff)
- OTP fields numeric keyboard.
- Paste full OTP should fill all 6 boxes.
- On invalid code, shake OTP row lightly + show inline error.
- Resend has cooldown timer (60s).
- Verify button prevents multi-tap during loading.

## Output
- iOS mobile frame size (390x844).
- Export with clear component naming:
  - `otp_input_cell`
  - `otp_row`
  - `resend_timer_text`
  - `verify_button_default|loading|disabled`
- Provide 6 state frames in one page for dev handoff.
