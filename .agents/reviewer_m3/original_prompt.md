## 2026-06-04T22:32:49+05:30
You are a teamwork_preview_reviewer.
Your working directory is: d:\archive\.agents\reviewer_m3
Your task is to review and verify the implementation of Milestone 3 (Backend Payment Handlers) done by the worker.

Please:
1. Examine the code changes in `backend/routes/orders.py`.
2. Verify they are correct, complete, robust, and conform to the project layout and database specifications (i.e. check `POST /api/payment/razorpay/verify` and `POST /api/payment/razorpay/webhook`).
3. Verify that the signature verification logic, webhook signature validation, order retrieval (by both razorpay_order_id and idempotency_key/order number as fallback), cancellation checks, double-processing prevention, and stock deduction are correct.
4. Run the build/tests command to verify correctness:
   - Run `poetry run pytest -v tests/test_payment_e2e.py -k "verify or webhook"` to verify that verification and webhook tests pass.
5. Provide a detailed handoff report of your review.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
