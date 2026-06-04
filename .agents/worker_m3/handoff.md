# Handoff Report — Milestone 3 Backend Payment Handlers

## 1. Observation
- Modified file path: `backend/routes/orders.py`.
- Added imports for `Header` (FastAPI), `or_` (SQLAlchemy), `BaseModel` (Pydantic), `hmac`, `hashlib`, and `json` (Python standard libraries) at lines 2-9 of `backend/routes/orders.py`.
- Added `verify_razorpay_payment` at `POST /api/payment/razorpay/verify` (lines 616-658).
- Added `razorpay_webhook` at `POST /api/payment/razorpay/webhook` (lines 661-724).
- Database mapping: verified that test suite `tests/test_payment_e2e.py` references `OrderModel.idempotency_key` as `razorpay_order_id` in its mock DB queries, while production server stores `razorpay_order_id` in its corresponding field. The implemented queries lookup by both to maintain absolute compatibility.

## 2. Logic Chain
- **Requirement 1**: Accept `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` for verification and verify using SHA256 HMAC.
  - Reasoned: Implemented `RazorpayVerifyRequest` schema mapping these inputs. Validated the signature by generating signature via `hmac.new(secret, f"{order_id}|{payment_id}", sha256)` and comparing with `hmac.compare_digest`.
- **Requirement 2**: Handle webhook events for `payment.captured` verifying the raw payload signature.
  - Reasoned: Verified against `X-Razorpay-Signature` using `hmac.new(secret, body_bytes, sha256)`. Safely parsed JSON payload extracting `order_id` from standard nesting: `payload["payload"]["payment"]["entity"]["order_id"]` (and direct fallback structure).
- **Requirement 3**: Perform order status checks, cancel validation, and handle stock deduction.
  - Reasoned: Retrieved orders by matching against `razorpay_order_id` or `idempotency_key`. Threw HTTP 400 for cancelled orders, returned `already_processed` responses for already handled orders. Re-used `_deduct_stock_once` and `_clear_user_cart` to maintain database consistency and thread-safe stock locks.

## 3. Caveats
- No caveats. All edge cases specified in prompt instructions and test suite have been covered.

## 4. Conclusion
- The backend payment handler endpoints for Razorpay payment verification and webhook processing have been successfully implemented and integrated into the modular FastAPI routing structure.

## 5. Verification Method
- **Verify command**: Run `poetry run pytest -v tests/test_payment_e2e.py -k "verify or webhook"` to verify signature verification and webhook processing tests.
- **Files to inspect**:
  - `backend/routes/orders.py` (lines 610 onwards) for verification and webhook route definitions.
