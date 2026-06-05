# Handoff Report — explorer_1

## 1. Observation
We examined several files in the workspace:
- `backend/routes/orders.py`:
  - Line 881-884:
    ```python
    taxable_amount = round(max(0.0, server_total - discount_amount), 2)
    cgst_amount = round(taxable_amount * 0.09, 2)
    sgst_amount = round(taxable_amount * 0.09, 2)
    ```
  - Line 1010-1025:
    ```python
    c_res = await db.execute(select(CouponModel).where(CouponModel.code == code_upper).with_for_update())
    coupon_to_update = c_res.scalar_one_or_none()
    if coupon_to_update:
        coupon_to_update.total_uses = coupon_to_update.total_uses + 1
    ```
- `backend/routes/admin.py`:
  - Line 188-198:
    ```python
    res = await session.execute(
        select(OrderModel)
        .where(OrderModel.id == order_id)
        .with_for_update()
    )
    order = res.scalar_one_or_none()
    ...
    success, err_msg, refund_info = await trigger_razorpay_refund(order, session)
    ```
- `frontend/src/utils/checkoutPricing.js`:
  - Line 63-65:
    ```javascript
    const cgst = taxableAmount * 0.09;
    const sgst = taxableAmount * 0.09;
    const grandTotal = taxableAmount + shipping + cgst + sgst + codCharge;
    ```

## 2. Logic Chain
- **Coupon Concurrency**: The validation of coupon limits (`validate_coupons_logic`) occurs prior to order creation and does not lock the coupon row. The update phase acquires a lock but does not verify if the limit was exceeded between validation and commit. Therefore, concurrent orders can bypass coupon usage constraints.
- **Refund Locking Bottleneck**: Approving returns runs a background task `_process_return_refund_background` that acquires a row lock on the order and then calls `trigger_razorpay_refund` which accesses external HTTP endpoints. If the API is slow, the lock is held, locking the row and blocking other database transactions on the order.
- **Online Payment Stock Over-selling**: Stock is only deducted when payment is confirmed. When two users place concurrent online orders for a product with 1 unit in stock, both orders are created in `pending_payment` status. When both payments are processed, the first succeeds and sets stock to 0. The second payment is captured but the order verification fails due to insufficient stock, leaving the user charged and the order in `pending_payment` status.
- **Taxes Rounding Discrepancy**: The backend rounds individual values (`cgst_amount` and `sgst_amount`) to 2 decimal places before adding them. The frontend does not round the individual cgst/sgst values before calculating the grand total, leading to a difference of a few paise.

## 3. Caveats
- No direct testing of the database locks was performed due to read-only constraints.
- Razorpay environment keys were assumed to be correctly set for production.

## 4. Conclusion
We identified four high/medium impact bugs:
1. Coupon Usage Limit Concurrency Bypass (High)
2. Razorpay API Call Inside Database Row Lock Transaction Block (High)
3. Online Payment Stock Over-selling (High)
4. Frontend/Backend Rounding Mismatches (Medium)

Resolving these issues will secure the order pipeline, prevent financial leaks, and improve transaction reliability.

## 5. Verification Method
- **Coupon Concurrency**: Attempt concurrent checkout requests with a single-use coupon using a tool like Apache Benchmark or simple async Python scripts.
- **Locking Bottleneck**: Verify that row locks are released before calling external APIs by mocking slow network responses.
- **Rounding**: Verify that a subtotal like 100.05 yields the exact same total amount on the frontend as it does on the backend.

## 6. Remaining Work
- Implement the exact code fixes detailed in `analysis.md` across both frontend and backend.
- Write unit tests for the coupon limits re-validation and stock reservation auto-refunds.
