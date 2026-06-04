## 2026-06-04T16:54:47Z
You are a teamwork_preview_worker.
Your working directory is: d:\archive\.agents\worker_m2
Your task is to implement Milestone 2: Backend Data Model & Core API.

Please perform the following:
1. Update database models in `backend/models.py` by adding the following fields to `OrderModel`:
   - `razorpay_order_id` (String, nullable, indexed)
   - `razorpay_payment_id` (String, nullable)
   - `razorpay_signature` (String, nullable)
2. Ensure database migrations/table sync works correctly. Look at how database schemas are verified or applied (e.g. `backend/apply_migrations.py` or `backend/update_db.py`).
3. Update FastAPI endpoints (specifically order checkout in `backend/routes/orders.py`) to support:
   - `payment_method = "online"`
   - If payment method is `"online"`, the checkout must return a valid Razorpay order ID in the response as `razorpay_order_id`. Under the hood, this order ID should be fetched using the `razorpay` library (or mocked if `razorpay` credentials are fake or testing, returning a simulated order ID if Razorpay client fails/is mock).
   - The status for `"online"` orders should start as `pending_payment` (order status) and `pending` (payment status).
4. Run python verification checks or tests (e.g., `poetry run pytest -v tests/test_payment_e2e.py -k test_tier1_checkout_initiation`) to ensure your checkout order creation logic matches what the E2E tests expect.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
