## 2026-06-04T21:57:40Z
Implement a comprehensive E2E test suite in d:\archive\tests\test_payment_e2e.py.
Objectives:
1. Implement 71+ test cases across 4 tiers as defined in TEST_INFRA.md:
   - Tier 1: Feature Coverage (checkout initiation, verification, webhook, retry, cancellation).
   - Tier 2: Boundary/Corner Cases (invalid signatures, empty items, maximum amounts, status transition limits).
   - Tier 3: Cross-Feature Combinations (webhook after client success, client failure but webhook success, etc.).
   - Tier 4: Real-World Scenarios (standard successful order, webhook-only success, retry payment loop, 15-minute timeout with background cancellation).
2. The tests must run using pytest against the FastAPI app defined in `backend/server.py`.
3. Use a custom mock/helper in your test code to simulate Razorpay signature verification and webhook signature generation (e.g., using `hmac` with SHA256).
4. Run pytest to check that the tests are syntactically correct. If some tests fail due to missing backend implementation, you can write them to test the FastAPI app but use mocks or check for NotImplementedError / HTTP 404 / specific errors where appropriate, or write clean, structured tests that will pass once implementation is complete.

## 2026-06-04T22:30:00Z
Resume work:
Fix route override issue in test_payment_e2e.py where 405 Method Not Allowed / KeyError occurs on route resolution. Run pytest and report back.

## 2026-06-04T16:45:54Z
You need to fix the event loop mismatch error in `tests/test_payment_e2e.py` (which causes database concurrency/loop failures).

### Tasks:
1. Modify `d:\archive\tests\test_payment_e2e.py` to use `httpx.AsyncClient` instead of Starlette's `TestClient`.
2. Define the `client` fixture as an async fixture yielding `httpx.AsyncClient(app=app, base_url="http://test")`.
3. Update all 71+ test cases to `await` the HTTP requests made via the client (e.g. change `response = client.post(...)` to `response = await client.post(...)`, and same for `client.get(...)`).
4. Ensure all `@pytest.mark.anyio` test functions remain async and function correctly.
5. Once complete, run pytest (e.g., `poetry run pytest -v tests/test_payment_e2e.py` or similar) to verify that all 71 tests compile and pass.

