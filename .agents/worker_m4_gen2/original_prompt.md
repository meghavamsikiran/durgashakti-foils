## 2026-06-04T22:50:07Z
Your working directory is: d:\archive\.agents\worker_m4_gen2
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
