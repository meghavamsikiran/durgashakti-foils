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

## Unchallenged Areas

- **Real bank gateway failure simulation** — Reasons: out of scope, requires external network mock environments/physical device API tokens (not testable under offline network restriction).
