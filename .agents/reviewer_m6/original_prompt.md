## 2026-06-05T15:53:25Z
You are the Retail App Code Reviewer and Quality Gate. Inspect the changes made to the following files:
1. `backend/routes/orders.py`
2. `backend/routes/admin.py`
3. `frontend/src/utils/checkoutPricing.js`

Specifically check:
- Coupon limit validation checks within lock.
- Razorpay API database lock release in background refund task.
- Online payment stock reservation / auto-refund on stock validation failure.
- Frontend CGST/SGST rounding alignment.

Run the test suite:
`.venv\Scripts\pytest tests/test_payment_e2e.py tests/test_razorpay_adversarial.py`

Verify that all tests pass, that layout is compliant with `PROJECT.md`, and that there are no hardcoded bypasses or facade overrides. Write your detailed review report to `d:/archive/.agents/reviewer_m6/handoff.md` containing Observation, Logic Chain, Caveats, Conclusion, and Verification Method.
