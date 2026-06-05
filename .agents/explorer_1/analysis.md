# Audit Report — White-box Exploration of DurgaShakti Foils

This report documents the security vulnerabilities, logic bugs, calculation discrepancies, and concurrency issues identified during a white-box audit of the backend (FastAPI) and frontend (React/Context hooks).

---

## 1. Concurrency: Coupon Usage Limit Race Condition

### Module
Coupons & Order Checkout (`backend/routes/coupons.py` and `backend/routes/orders.py`)

### Severity
High

### Root Cause
Coupon validation is performed at order creation time using `validate_coupons_logic` (line 870 in `backend/routes/orders.py`), which executes a `SELECT` query on the `CouponModel` table without acquiring any database row locks (no `.with_for_update()`).
Later, in the same transaction block, coupon usage is incremented:
```python
c_res = await db.execute(select(CouponModel).where(CouponModel.code == code_upper).with_for_update())
coupon_to_update = c_res.scalar_one_or_none()
if coupon_to_update:
    coupon_to_update.total_uses = coupon_to_update.total_uses + 1
```
While `with_for_update()` is correctly used during the update, there is NO check within the locked write block to verify if `total_uses` has reached `max_usage_count` or if the user's usage count has exceeded `per_customer_usage_limit`. 

### Reproduction Steps
1. Create a coupon with `max_usage_count = 1`.
2. Two users (or one user submitting two concurrent requests) checkout at the same time using that coupon code.
3. Both requests call `validate_coupons_logic` concurrently. Since the coupon has `total_uses = 0`, both validations succeed.
4. Both requests proceed to the order creation phase, acquire locks sequentially, and increment the coupon uses without re-validating the limits.
5. The coupon is used twice, bypassing `max_usage_count`.

### Risk
High. Bad actors can stack or reuse single-use or limited coupons concurrently to obtain massive discounts multiple times, draining company revenue.

### Impact
Financial losses, abuse of limited promotional campaigns, and incorrect analytics.

### Exact Fix
In `backend/routes/orders.py`, during the coupon usage update block, re-validate the usage limits inside the locked row transaction block before committing the order.
Alternatively, lock the coupon rows during the initial validation step, or raise an exception if `coupon_to_update.total_uses >= coupon_to_update.max_usage_count` or customer limits are breached during the update step.

### Code Changes Required
In `backend/routes/orders.py` around line 1014, modify the update logic:
```python
c_res = await db.execute(select(CouponModel).where(CouponModel.code == code_upper).with_for_update())
coupon_to_update = c_res.scalar_one_or_none()
if coupon_to_update:
    # Re-validate limits inside lock
    if coupon_to_update.max_usage_count is not None and coupon_to_update.total_uses >= coupon_to_update.max_usage_count:
        raise HTTPException(status_code=400, detail=f"Coupon {coupon_to_update.code} limit reached.")
    
    # Re-validate customer limits if applicable
    # ...
    coupon_to_update.total_uses = coupon_to_update.total_uses + 1
```

### Test Cases
- Concurrent Checkout Coupon Test: Send 5 concurrent checkout requests with a single-use coupon and assert only 1 succeeds while 4 fail with a 400 error.

### Verification Steps
- Inspect `backend/routes/orders.py` to ensure coupon limit checks are executed within the row lock block.

---

## 2. Performance: Razorpay External HTTP Call Inside Database Lock

### Module
Order Status Updates / Background Refund Queue (`backend/routes/admin.py`)

### Severity
High

### Root Cause
In `backend/routes/admin.py`, order status transitions to `return_approved` trigger the background task `_process_return_refund_background`:
```python
async with database.async_session_factory() as session:
    res = await session.execute(
        select(OrderModel)
        .where(OrderModel.id == order_id)
        .with_for_update()
    )
    order = res.scalar_one_or_none()
    ...
    success, err_msg, refund_info = await trigger_razorpay_refund(order, session)
```
Inside `trigger_razorpay_refund` (`backend/routes/orders.py`), an external API request is made to Razorpay. Because this is an external HTTP call, it is slow and can hang or take several seconds. Holding a database row lock (`with_for_update`) during an external network call blocks other processes (like customer updates, webhooks, or admin dashboards) from accessing that order, and wastes database connection pool resources.

### Reproduction Steps
1. An admin approves a return for an order, launching `_process_return_refund_background`.
2. The background task locks the order row in the database.
3. The task makes an external HTTP request to Razorpay's refund API.
4. If Razorpay is slow or times out, the row lock remains held.
5. Concurrently, a webhook or user request tries to read or update the order, resulting in a hang or database connection timeout.

### Risk
High. Under high load or during payment provider degradation, this will exhaust the database connection pool, causing application-wide downtime.

### Impact
Severe performance degradation, API gateway timeouts, and database connection pool starvation.

### Exact Fix
Release the database lock before making the external HTTP request. Once the HTTP request finishes, start a new transaction, acquire the row lock, check the state, and commit the database updates.

### Code Changes Required
In `_process_return_refund_background` or `trigger_razorpay_refund`, do not invoke `trigger_razorpay_refund` inside the database lock block. Or fetch the order without `with_for_update()`, initiate the refund, and then perform `with_for_update()` to apply the refund results.

### Test Cases
- Verify database lock duration by mocking a slow Razorpay response (e.g. 5 seconds delay) and checking if the order row remains locked.

---

## 3. Concurrency: Online Payment Stock Reservation Vulnerability

### Module
Order Creation / Online Payment Verification (`backend/routes/orders.py`)

### Severity
High

### Root Cause
Stock deduction occurs at order creation ONLY for COD orders. For online payments, stock deduction is deferred until payment is verified or reconciled (`_finalize_paid_order`).
If a product has 1 item in stock, two users can add it to their cart and initiate online payment. Both orders will successfully be created in the database with status `pending_payment`. Both users will proceed to pay on Razorpay. The first payment captured will successfully transition to `Paid` and deduct stock. The second payment captured will fail to deduct stock in `_finalize_paid_order`, raising an `HTTPException` and rolling back the transaction. The second user's payment is taken, but their order remains `pending_payment` on the backend without any automatic refund mechanism.

### Reproduction Steps
1. A product has a stock quantity of 1.
2. User A and User B place online payment orders for the product at the same time. Both orders are successfully created.
3. Both users pay on Razorpay.
4. User A's verification webhook finishes first, confirming the order and reducing stock to 0.
5. User B's verification webhook fails with `400 Insufficient stock`. User B's money is debited, but their order status remains `pending_payment`.

### Risk
High. Results in double charging / over-selling without auto-refund, violating user trust and consumer protection laws.

### Impact
Customer complaints, operational overhead for manual refunds, and discrepancies between payment capture and inventory.

### Exact Fix
Implement temporary stock reservation upon order creation (e.g. reserve stock for 15 minutes). If payment fails or expires, release the stock. Alternatively, if payment verification fails due to insufficient stock, catch the exception, change order status to `failed`, and trigger an automatic Razorpay refund.

### Code Changes Required
In `backend/routes/orders.py`, wrap the stock deduction failure inside `_finalize_paid_order` or the webhook handler to trigger an automatic refund of the captured payment if stock is exhausted.

### Test Cases
- Multi-user Checkout Out of Stock: Simulating concurrent online payments on a low-stock product, asserting the second transaction triggers an automatic refund.

---

## 4. Calculation: Frontend/Backend Rounding Mismatches

### Module
Checkout Pricing Calculation (`frontend/src/utils/checkoutPricing.js` vs `backend/routes/orders.py`)

### Severity
Medium

### Root Cause
The backend rounds intermediate tax values to two decimal places:
```python
taxable_amount = round(max(0.0, server_total - discount_amount), 2)
cgst_amount = round(taxable_amount * 0.09, 2)
sgst_amount = round(taxable_amount * 0.09, 2)
```
The frontend calculates these fields without intermediate rounding, only applying rounding on the grand total using `toFixed(2)` or `Math.round(totalAmount * 100)`.
For certain values (e.g., fractional subtotal or discount amounts), the sum of unrounded taxes differs from the sum of rounded taxes by a few paise (e.g., frontend displays ₹118.06 but backend processes ₹118.05).

### Reproduction Steps
1. Check out with a taxable subtotal of 100.05.
2. The backend calculates `cgst = 9.00`, `sgst = 9.00`, and `grand_total = 118.05`.
3. The frontend calculates `cgst = 9.0045`, `sgst = 9.0045`, and `grand_total = 118.059`.
4. The frontend displays the total as `₹118.06`.

### Risk
Medium. Causes visual jump / mismatch between checkout screen and payment window/invoice.

### Impact
Confusing UX and minor discrepancies in financial auditing.

### Exact Fix
Align the frontend utility (`frontend/src/utils/checkoutPricing.js`) to round intermediate values (`taxableAmount`, `cgst`, and `sgst`) to two decimal places, matching the backend logic.

### Code Changes Required
In `frontend/src/utils/checkoutPricing.js` around line 63:
```javascript
  const cgst = Math.round(taxableAmount * 0.09 * 100) / 100;
  const sgst = Math.round(taxableAmount * 0.09 * 100) / 100;
  const grandTotal = Number((taxableAmount + shipping + cgst + sgst + codCharge).toFixed(2));
```

### Test Cases
- Compare frontend pricing results with backend pricing calculation for subtotals containing decimals (e.g., .05, .45, .85).
