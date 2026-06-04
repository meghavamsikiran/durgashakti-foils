# Scope: E2E Testing Track

## Architecture
The E2E testing framework will run opaque-box tests against the FastAPI backend (and mocks Razorpay integration).
- **Test Runner**: Pytest.
- **Mock Services**: A custom mock of Razorpay server-side verification and webhooks using Python (`pytest-mock` or custom routers/fixtures).
- **Target APIs**:
  - `POST /api/orders` (creating orders with online payment method)
  - `POST /api/payment/razorpay/verify` (verifying payment signatures)
  - `POST /api/payment/razorpay/webhook` (asynchronously processing webhook verification)
  - `GET /api/orders/{order_id}` (retrieving updated order statuses)
  - `POST /api/orders/{order_id}/cancel` (cancellation/timeout validation)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Test Infra Setup | Set up pytest fixtures, mock Razorpay payment generation/signatures, database fixtures | None | PLANNED |
| 2 | Tier 1: Feature Coverage | Implement tests for standard happy-paths (checkout initiation, verification, webhook, retry) | M1 | PLANNED |
| 3 | Tier 2: Boundary & Corner Cases | Test signature mismatch, invalid signatures, order expiration boundary, bad requests | M2 | PLANNED |
| 4 | Tier 3: Cross-Feature Combinations | Test webhook after client success, client failure with webhook success, multiple retries | M3 | PLANNED |
| 5 | Tier 4: Real-World Scenarios | Test full user flows including countdown timers, stock release after 15-minute expiration | M4 | PLANNED |
| 6 | Verification & Reporting | Run the test suite against the backend and publish TEST_INFRA.md and TEST_READY.md | M5 | PLANNED |

## Interface Contracts
### Razorpay Mocks
- Signature generation: Using SHA256 HMAC of `razorpay_order_id + "|" + razorpay_payment_id` using the key secret.
- Webhook Payload Mock:
  ```json
  {
    "event": "payment.captured",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_xyz",
          "amount": 50000,
          "order_id": "order_abc",
          "status": "captured",
          "method": "card"
        }
      }
    }
  }
  ```
