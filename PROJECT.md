# Project: Secure Razorpay Payment Integration

## Architecture
The application is a retail web application with a FastAPI backend and a React frontend.
- **Backend**: FastAPI, SQLAlchemy (async/PostgreSQL), and background scheduler (for payment timeout cleanup).
- **Frontend**: React, Tailwind CSS, API utility wrapper (`api.js`).
- **Payment Gateway**: Razorpay (using `razorpay` Python SDK on backend, client checkout library on frontend).
- **Security**: SHA-256 HMAC signature verification on backend (verify verification endpoint and webhook signature).
- **Timeout Management**: 15-minute countdown timer tracked via `created_at` timestamp. Auto-cancellation occurs via backend background task.

## Code Layout
- Backend routes: `backend/routes/orders.py` and new endpoints in `backend/routes/payments.py` (or within orders).
- Backend models: `backend/models.py`
- Frontend Checkout: `frontend/src/pages/Checkout.jsx`, `frontend/src/hooks/useCheckout.js`
- Frontend Order Details: `frontend/src/pages/OrderDetailsPage.jsx`

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | E2E Test Suite Creation | Define opaque-box E2E test runner, mock Razorpay endpoints, and write Tiers 1-4 test cases in `tests/` | None | DONE |
| 2 | Backend Data Model & Core API | Update Order schema, migration helper, database model fields, and enable online checkout selection | None | DONE |
| 3 | Backend Payment Handlers | Implement signature verification endpoint and secure webhook router using Razorpay SDK | M2 | DONE |
| 4 | Frontend Checkout Integration | Load Razorpay checkout script, integrate payment method selection, and run checkout popups | M3 | DONE |
| 5 | Frontend Retry & Status Sync | UI countdown timer on Order Details/History, order retry payment button and state synchronization | M4 | DONE |
| 6 | E2E Verification | Integrate and execute all E2E tests (Tiers 1-4) until 100% pass | M1, M5 | DONE |
| 7 | Adversarial Hardening (Tier 5) | Conduct Challenger-led white-box coverage analysis, add tests for edge cases, and run auditor gates | M6 | PLANNED |

## Interface Contracts
### Order Model Additions
- `razorpay_order_id`: String, nullable, indexed.
- `razorpay_payment_id`: String, nullable.
- `razorpay_signature`: String, nullable.

### Backend Endpoints
- `POST /api/orders`: Allows payment method `"online"` or `"cod"`. If `"online"`, returns `razorpay_order_id` along with order metadata.
- `POST /api/payment/razorpay/verify`: Accepts:
  ```json
  {
    "razorpay_payment_id": "pay_xyz",
    "razorpay_order_id": "order_abc",
    "razorpay_signature": "sig_123"
  }
  ```
- `POST /api/payment/razorpay/webhook`: Receives webhook events directly from Razorpay. Must verify webhook signature header `X-Razorpay-Signature` with secret.
