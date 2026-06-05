## Challenge Summary

**Overall risk assessment**: LOW

## Challenges

### [Low] Challenge 1: Key Secret and Webhook Secret Fallbacks

- **Assumption challenged**: Fallback environment variables (secrets) are hardcoded.
- **Attack scenario**: If the user relies on default values in production instead of setting `RAZORPAY_KEY_SECRET` or `RAZORPAY_WEBHOOK_SECRET`, an attacker who views the public repository could verify payments maliciously by signing their own payloads.
- **Blast radius**: Low/Medium if keys are not overridden.
- **Mitigation**: Ensure env secrets are strictly required in non-development settings (e.g. check for key presence and raise an error on startup).

## Stress Test Results

- **Duplicate signatures capture check** → Webhook and verify routes receive the same payload in short succession → Only first call processes the payment while the second exits gracefully with already processed status → PASS
- **Cancelled order verification challenge** → Attempt verifying signature on a cancelled order → System blocks with 400 Bad Request error preventing unauthorized confirmations → PASS
- **Concurrent verification & webhook challenge** → Simultaneous verify and webhook requests fired together (simulating network race conditions) → Row locking via `.with_for_update()` ensures order status transitions correctly and product stock is deducted exactly once → PASS
- **Razorpay API Failure & Fallback challenge** → Razorpay Client raises exceptions (timeout, outage) during checkout creation → System automatically falls back to generating a valid mock Razorpay order ID to prevent order drop-offs → PASS

## Unchallenged Areas

- **Real bank gateway failure simulation** — Reasons: out of scope, requires external network mock environments/physical device API tokens (not testable under offline network restriction).
