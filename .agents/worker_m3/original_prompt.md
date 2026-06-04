## 2026-06-04T22:30:39+05:30
Implement Milestone 3: Backend Payment Handlers.

1. Implement the signature verification endpoint: `POST /api/payment/razorpay/verify`
   - It must accept `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
   - Verify the Razorpay signature using SHA256 HMAC (secret key should be loaded from env, e.g. `RAZORPAY_KEY_SECRET` or defaults as needed).
   - Retrieve the order using `razorpay_order_id`. If not found, return 404.
   - If order is cancelled, return 400 (Cannot verify cancelled order).
   - If order already processed, return `{"success": true, "message": "Order already processed"}`.
   - If verified successfully: update payment_status to `"Paid"`, order_status to `"confirmed"`, update stock (deduct product quantities) if `stock_applied` is False, set `stock_applied = True`, save the `razorpay_payment_id` and `razorpay_signature` in the order record, and save/commit the changes.
2. Implement the webhook processing endpoint: `POST /api/payment/razorpay/webhook`
   - It must verify the webhook signature header `X-Razorpay-Signature` against the raw request body using SHA256 HMAC (secret should be loaded from env, e.g. `RAZORPAY_WEBHOOK_SECRET` or defaults).
   - Check the event type: only handle `payment.captured` (or return `{"status": "ignored"}` for others).
   - Extract the Razorpay order ID from the webhook payload (`payload.payment.entity.order_id`).
   - Retrieve the order. If not found, return 404.
   - If order is cancelled, return 400.
   - If order status is already confirmed/completed/Paid, return `{"status": "already_processed"}`.
   - If not already processed, deduct stock if `stock_applied` is False, set `stock_applied = True`, update payment_status to `"Paid"`, order_status to `"confirmed"`, and save/commit the changes.
3. You can either implement these routes in a new file `backend/routes/payments.py` and register it in `backend/server.py`, or append them to `backend/routes/orders.py` (which is already registered). Choose whichever is cleaner and fits best.
4. Verify by running the tests:
   - Run `poetry run pytest -v tests/test_payment_e2e.py -k "verify or webhook"` to verify that signature verification and webhook processing tests pass.
