## 2026-06-04T22:52:00Z
Your working directory is: d:\archive\.agents\worker_m4_gen3
Your task is to implement Milestone 4: Frontend Checkout Integration.

Please perform the following:
1. Update `frontend/src/pages/checkout/components/PaymentStep.jsx`:
   - Remove the `useEffect` that forces the payment method to `"cod"`.
   - Add a prepaid payment option with ID `"online"` (using standard react-icons or similar, or just import `CreditCard` if available, or construct standard radio button markup).
   - Allow user to toggle between `"cod"` and `"online"` payment options.
2. Update `frontend/src/hooks/useCheckout.js` to handle the `"online"` payment method in `handlePlaceOrder`:
   - If payment method is `"online"`, call `orderService.createOrder` with `payment_method: 'online'`.
   - In the response from the backend, retrieve `razorpay_order_id`, `id` (the order's database UUID), and the total price/amount.
   - Load the Razorpay checkout script dynamically if not already loaded (URL: `https://checkout.razorpay.com/v1/checkout.js`).
   - Open the Razorpay checkout window with the required configurations:
     - `key`: Razorpay Key ID (you can fetch it from settings or use a mock placeholder/env).
     - `amount`: order amount in paise (amount * 100).
     - `currency`: "INR".
     - `order_id`: `razorpay_order_id`.
     - `handler`: a callback function triggered on payment success. Inside the callback:
       - Send a verification request to `POST /api/payment/razorpay/verify` (using the api wrapper, e.g. direct `api.post`) with verification details: `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
       - On verification success, clear the cart and navigate to `/order-success?order_id=${orderId}&order_number=${orderNumber}`.
       - On verification failure, notify the user.
     - `modal.ondismiss`: a callback triggered if the checkout modal is closed/dismissed. In this case, or on direct payment failure, redirect the user to the Order Details page for that order, so they can retry payment.
3. Check `frontend/src/services/payment.service.js` or `frontend/src/services/order.service.js` to see if API wrappers exist, and implement them or use direct `api.post` calls.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-06-04T22:53:04Z
Implement Milestone 4 (Frontend Checkout Integration) and Milestone 5 (Frontend Retry & Status Sync).

Ensure:
1. Update `frontend/src/pages/checkout/components/PaymentStep.jsx` (or check if it is already updated) to show both COD and Online payment options and allow toggling between them.
2. Update `frontend/src/hooks/useCheckout.js` to handle paymentMethod === 'online' in `handlePlaceOrder`:
   - Call `orderService.createOrder` with orderData containing payment_method: 'online'.
   - Load the Razorpay checkout script dynamically (https://checkout.razorpay.com/v1/checkout.js).
   - Initiate the Razorpay checkout window with amount, currency INR, razorpay_order_id, and standard options.
   - On success callback, send verification data to `paymentService.verifyRazorpayPayment`. If verified successfully, clear the cart and navigate to `/order-success?order_id=${orderId}&order_number=${orderNumber}&payment_method=online`. On failure, notify and redirect to the order details page (`/orders/${orderId}`).
   - On dismiss/close modal, redirect to `/orders/${orderId}` (OrderDetailsPage).
3. Ensure OrderDetailsPage has a status synchronization or retry payment button (we see handleRetryPayment is already there in `frontend/src/pages/OrderDetailsPage.jsx` and countdown timer logic is there). Review `OrderDetailsPage.jsx` and check if any changes are needed to completely satisfy Milestone 5:
   - Order retry payment button (it uses handleRetryPayment)
   - UI countdown timer on Order Details/History
   - Status checking/syncing.
4. Verify by checking if everything compiles or runs properly. Do not write dummy or hardcoded code.
