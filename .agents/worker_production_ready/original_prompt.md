## 2026-06-05T15:49:45Z
You are the Retail App Code Integrator and Bug-fixer. Your task is to implement the following 4 production-readiness fixes in the codebase located at `d:/archive`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please perform the following exact modifications:

1. Concurrency: Coupon Usage Limit Race Condition
   - File: `backend/routes/orders.py`
   - In the coupon update loop (around line 1011), inside the `.with_for_update()` block of CouponModel retrieval, re-validate the coupon limits before incrementing `total_uses` and writing discount values:
     * Check if `coupon_to_update.max_usage_count is not None and coupon_to_update.total_uses >= coupon_to_update.max_usage_count` and raise an `HTTPException(status_code=400, detail="Coupon usage limit reached")`.
     * Check if the user's per-customer usage limit is breached. To do this, query other orders created by the user (excluding the current order's ID using `OrderModel.id != order.id`) where `coupon_codes` contains the coupon code. If the usage count meets or exceeds `per_customer_usage_limit` (or 1 if `is_reusable` is False), raise an `HTTPException(status_code=400, detail="You have already redeemed this coupon code on a past order.")`.

2. Performance: Razorpay External HTTP Call Inside Database Lock
   - File: `backend/routes/admin.py`
   - In `_process_return_refund_background(order_id, actor_id)`, do not hold the `with_for_update()` lock on the order while calling the slow external `trigger_razorpay_refund(...)` API.
   - Fetch the order first without row lock to validate its status and call `trigger_razorpay_refund(order, session)`. Commit or release the first session.
   - Then, start a new database session/transaction, query the order again with `.with_for_update()`, check the success/fail result of the API call, update `order.payment_status`, `order.order_status`, `order.updated_at`, write the audit logs, and commit.

3. Concurrency: Online Payment Stock Reservation / Auto-refund
   - File: `backend/routes/orders.py`
   - In `_finalize_paid_order` (around line 532), if stock deduction fails (i.e., `await _deduct_stock_once(...)` returns False):
     * Transition the order's status to `failed` and `payment_status` to `refund_pending` (or `refund_failed` depending on the refund result).
     * Automatically trigger the Razorpay refund by calling `trigger_razorpay_refund(order, db)`.
     * Log the appropriate audit logs (`PAYMENT_RAZORPAY_REFUND_INITIATED` or `PAYMENT_RAZORPAY_REFUND_FAILED` with the reason "Insufficient stock") and commit the database transaction.
     * Finally, raise `HTTPException(status_code=400, detail="Insufficient stock, payment refunded automatically.")`.

4. Calculation: Frontend/Backend Rounding Mismatches
   - File: `frontend/src/utils/checkoutPricing.js`
   - Align the frontend intermediate tax calculation with the backend's two-decimal rounding logic.
   - Around line 63, compute `cgst` and `sgst` using `Math.round(taxableAmount * 0.09 * 100) / 100` and compute `grandTotal` using `Number((taxableAmount + shipping + cgst + sgst + codCharge).toFixed(2))`.

After implementing these fixes:
1. Run the existing test suites using `pytest tests/test_payment_e2e.py` and `pytest tests/test_razorpay_adversarial.py` to verify all 71+ tests pass.
2. Verify layout compliance with `PROJECT.md`.
3. Write a handoff report at `d:/archive/.agents/worker_production_ready/handoff.md` detailing the exact code modifications and confirming test suite verification results.
