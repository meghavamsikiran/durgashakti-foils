# Scope: Tier 5 Adversarial Hardening (Razorpay Payment Integration)

## Architecture
- FastAPI Backend: `backend/routes/orders.py` containing:
  - `POST /api/payment/razorpay/verify` (accepts signatures, checks SHA256 HMAC, locks order and deducts stock)
  - `POST /api/payment/razorpay/webhook` (accepts Razorpay webhooks, checks X-Razorpay-Signature header, locks order and deducts stock)
- SQLite/PostgreSQL database dependency via SQLAlchemy AsyncSession.
- React Frontend loading Razorpay Checkout SDK.

## Milestones / Test Focus Areas
- **Test Focus 1: Signature Mismatch**
  - Verify signature validation errors return 400.
  - Verify invalid payloads/signatures do not modify order/payment/stock states.
- **Test Focus 2: Webhook Invalid Inputs & Signatures**
  - Verify requests with missing headers or mismatching HMAC signatures return 400.
  - Verify non-payment.captured event types (e.g. payment.failed) are handled gracefully (ignored or recorded without changing payment status to Paid).
- **Test Focus 3: Double Charging / Race Conditions**
  - Simulated concurrent requests to verify/webhook for the same order ID to ensure stock is deducted exactly once, status transitions are correct, and no double-charging/double-processing occurs.
- **Test Focus 4: Database Disconnects / Network Failure Simulations**
  - Database error during transaction to ensure rollback and correct error status without orphan states.
  - SDK load failures or checkout failures.

## Interface Contracts
- `/api/payment/razorpay/verify`: `RazorpayVerifyRequest` -> `{"success": True, "message": "Payment verified successfully"}`
- `/api/payment/razorpay/webhook`: `X-Razorpay-Signature` Header -> `{"status": "success"}` or `{"status": "ignored"}` etc.
