# Architecture, Order Flow, Payment Models, and Tests Analysis

## 1. Backend Architecture & Framework
- **Framework**: FastAPI (async).
- **Database**: PostgreSQL (via Supabase) with SQLAlchemy ORM and `asyncpg` async driver.
- **Key Files**:
  - `backend/server.py`: Server entrypoint, middleware (CORS, rate limiting, maintenance, security headers), background tasks (`_payment_timeout_cleanup_loop`, `_audit_cleanup_loop`), routes mounting.
  - `backend/database.py`: Database engine/session initialization, table creation, migrations.
  - `backend/models.py`: SQLAlchemy ORM database models, including:
    - `UserModel` (`users` table): User details, roles, permissions.
    - `ProductModel` (`products` table): Product variant schema, prices, category, stock count.
    - `OrderModel` (`orders` table): Items snapshot, coupon metadata, tracking details.
  - `backend/deps.py`: Contains JWT auth logic, Pydantic request validation schemas (`OrderCreate`, `ShippingAddress`, etc.), and helper functions (e.g. email sending, audit logging, order status transition map).
- **Core Endpoints (Orders/Payment)**:
  - `POST /api/orders`: Validates cart items, stock, coupon codes, calculates shipping/CGST/SGST/COD fees, creates an order in database, deducts stock (if COD).
  - `GET /api/orders`: Retrieves all orders for the current user.
  - `GET /api/orders/{order_id}`: Retrieves a single order details.
  - `POST /api/orders/{order_id}/cancel`: Cancels pending/processing orders, releases stock.
  - `POST /api/orders/{order_id}/return`: Initiates a return request with mandatory proof upload.
  - `POST /api/payment/cod/confirm`: Confirms a Cash on Delivery order, clears the cart.

---

## 2. Frontend Architecture & Framework
- **Framework**: React.js with Tailwind CSS, configured using CRACO (`craco.config.js`).
- **Key Files**:
  - `frontend/src/pages/Checkout.jsx`: Checkout stepper component managing address selection and payment choice.
  - `frontend/src/hooks/useCheckout.js`: Handles state for checkout items, calculations, coupon applications, and checkout step validations.
  - `frontend/src/pages/OrderDetailsPage.jsx`: Renders shipping breakdown, item timeline tracking, invoice downloads, and return forms.
  - `frontend/src/utils/api.js`: Centrally routes API requests, maps backend endpoints (including legacy/planned Razorpay integration hooks).

---

## 3. Order Creation & Status Transitions
- **Current Creation Flow**:
  - When placing an order, the frontend client (`useCheckout.js` calling `orderService.createOrder`) prepares the item list, total amount, shipping info, and payment method (forces `cod`).
  - The backend receives `OrderCreate` schema, recalculates totals dynamically from db, applies coupons and taxes, generates a 3-7-7 numeric format order number, and persists the record.
  - If COD, stock is deducted atomically. If Online, order status remains `pending_payment` and stock is not deducted yet.
- **Status State Machine**:
  - Defined in `backend/deps.py:ORDER_STATUS_TRANSITIONS`:
    - `pending_payment` -> `confirmed`, `cancelled`, `overdue`
    - `pending` -> `confirmed`, `cancelled`
    - `confirmed` -> `packaging`, `cancelled`
    - `packaging` -> `shipped`, `cancelled`
    - `shipped` -> `in_transit`, `out_for_delivery`, `cancelled`
    - `in_transit` -> `out_for_delivery`, `failed`, `cancelled`
    - `out_for_delivery` -> `delivered`, `failed`, `cancelled`
    - `delivered` -> []
    - `cancelled` -> []
    - `returned` -> []
    - `return_requested` -> `return_approved`, `return_rejected`

---

## 4. Test Suites & Layout Compliance
- **Backend Tests**: Located in `backend/tests/test_core.py`. Consists of 13 unit tests verifying:
  - Password hashing & JWT token life-cycle validation.
  - Indian phone format validation and Gmail alias authentication.
  - Search sanitization, role check utilities.
  - Order status normalization and valid state transitions.
  - Dynamic category discount calculations.
- **Test Command**: Run `pytest` inside the `backend` directory.
- **Frontend Tests**: None configured in `frontend/src/` (runs `craco test` via package scripts, but no tests are collected).
- **Layout Compliance**: Source code resides in `backend` and `frontend` root folders. `.agents/` contains only agent progress/handoff logs, respecting workspace layout conventions.

---

## 5. Razorpay Integration Recommendations

To properly integrate Razorpay for prepaid payments, the following additions are recommended:

### A. Backend Architecture & API Enhancements
1. **Model Updates**: Add fields to `OrderModel` in `backend/models.py`:
   - `razorpay_order_id` (String, nullable)
   - `razorpay_payment_id` (String, nullable)
   - `razorpay_signature` (String, nullable)
2. **Order Creation Route modification**:
   - Do not override `order_data.payment_method = "cod"` if the user selects "online".
   - Initialize Razorpay Client: `import razorpay; client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))`
   - Create a Razorpay order matching the calculated `grand_total` (in paise):
     ```python
     rz_order = client.order.create({
         "amount": int(grand_total * 100),
         "currency": "INR",
         "receipt": order.order_number
     })
     order.razorpay_order_id = rz_order["id"]
     ```
   - Return the `razorpay_order_id` to the frontend client.
3. **Verification Endpoint**: Implement `POST /api/payment/razorpay/verify`:
   - Accept `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`.
   - Verify the signature:
     ```python
     client.utility.verify_payment_signature({
         'razorpay_order_id': order_id,
         'razorpay_payment_id': payment_id,
         'razorpay_signature': signature
     })
     ```
   - If verified, call `_finalize_paid_order(...)` to set status to `confirmed` / payment to `Paid`, deduct stock, clear cart, and record audit log.
4. **Webhook Endpoint**: Implement `POST /api/payment/razorpay/webhook`:
   - Verify incoming webhook signature using `client.utility.verify_webhook_signature(...)`.
   - Process events:
     - `payment.captured` / `order.paid`: Safe fallback to call `_finalize_paid_order(...)`.
     - `payment.failed`: Cancel order, log failure, release stock if applied.
     - `refund.processed`: Set order status/payment status to refunded, audit transaction.

### B. Client-side Frontend Integration
1. **Razorpay Checkout Load**:
   - Dynamically load script `"https://checkout.razorpay.com/v1/checkout.js"`.
2. **Checkout hook update**:
   - In `useCheckout.js`, if payment method is "online", call `createOrder` -> retrieve `razorpay_order_id` -> launch Razorpay handler.
   - On payment success, invoke `paymentService.verifyRazorpayPayment(...)` and route to `order-success`.
3. **15-minute Countdown & UI Expiration**:
   - Display countdown timer dynamically on `OrderDetailsPage.jsx` when order status is `pending_payment`.
   - If countdown hits zero, render order as `Expired` / `Cancelled` and disable the checkout payment retry option.
