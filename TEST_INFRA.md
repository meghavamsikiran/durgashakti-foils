# E2E Test Infra: Secure Razorpay Payment Integration

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design internals (only test public HTTP endpoints/behaviors).
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (Real-World) |
|---|---------|---------------------|:-----------------:|:-----------------:|:----------------------:|:-------------------:|
| 1 | Online Payment & Order Creation | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | Razorpay Checkout SDK Mocking | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 3 | Server-Side Signature Verification | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 4 | Asynchronous Webhook Processing | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 5 | 15-Minute Payment Retry Buffer | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 6 | Order Timeout & Expiration | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Test Runner**: Pytest. Run via `pytest tests/test_payment_e2e.py`.
- **Database Backend**: Uses the configured PostgreSQL backend, running queries against FastAPI test client or live test port.
- **Razorpay Simulation**:
  - The payment flow simulates the Razorpay checkout script callback by sending signature payloads to the verification endpoint.
  - Razorpay webhooks are simulated by crafting webhook JSON payloads with generated headers signed with the secret.
- **Directory Layout**:
  - `d:\archive\tests\test_payment_e2e.py`: Main E2E test file containing the suite of tests.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Standard Checkout | Create Order, Checkout Mock, Signature Verification, Status Check | Medium |
| 2 | Asynchronous Webhook Recovery | Create Order, Checkout failure/closure, Webhook Delivery, Status Check | High |
| 3 | Order Retry & Payment Completion | Create Order, Initial Failure, Status Pending, Retry Checkout, Verify Signature, Status Paid | High |
| 4 | Timer Cancellation & Stock Release | Create Order, Checkout failure, Timer expiration (15 minutes), Cancellation Check, Stock restore | High |
| 5 | Duplicate Callback/Webhook Graceful Handshake | Create Order, Client verification success, Webhook processing, Verification of single stock deduction | High |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: ≥5 test cases per feature (Total 30)
- **Tier 2 (Boundary & Corner Cases)**: ≥5 test cases per feature (Total 30)
- **Tier 3 (Cross-Feature combinations)**: ≥6 test cases covering key interaction pairs
- **Tier 4 (Real-World Application)**: 5 application-level scenario tests
- **Total Minimum**: 71 tests
