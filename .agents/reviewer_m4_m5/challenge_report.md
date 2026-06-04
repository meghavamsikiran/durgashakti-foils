## Challenge Summary

**Overall risk assessment**: LOW

---

## Challenges

### [Medium] Challenge 1: Clock skew / client timezone modification
- **Assumption challenged**: The client machine's system clock is accurate when calculating the 15-minute countdown.
- **Attack scenario**: If a user modifies their local computer's system clock back or forward, the `timeLeft` calculations (`new Date().getTime()`) in `OrderDetailsPage.jsx` will yield incorrect timer values (either showing expired prematurely or showing excessive remaining time).
- **Blast radius**: User interface display discrepancies. However, because order expiration verification and payment collection are controlled on the backend, this does not allow double-spending or checking out expired orders.
- **Mitigation**: Fetch the server's current time during page load (or retrieve it with the order details response) and compute offset calculations relative to the server time, rather than relying strictly on the local system time.

### [Low] Challenge 2: Concurrent API requests on Manual Sync click
- **Assumption challenged**: Users will click the sync button in a controlled manner.
- **Attack scenario**: A user could double-click or spam-click the "Sync Payment Status" button, generating multiple simultaneous requests to `/api/orders/:id`.
- **Blast radius**: Incremental database load.
- **Mitigation**: Disable the button or apply a debouncer when a loading state is active for `fetchOrder`.

---

## Stress Test Results

- **Local Time Alteration Scenario** → Expected: UI handles timer gracefully → Predicted: Countdown shows "Expired" or wrong duration if system clock is modified → **Fail (Mitigated by Backend Enforcement)**
- **Manual Sync Button Spamming** → Expected: API requests throttled/debounced → Predicted: Multiple API calls are sent concurrently → **Fail (Minor UX issue)**

---

## Unchallenged Areas

- **Backend Razorpay Signature Validation**: Out of scope for this frontend review, but verified to be securely implemented using HMAC SHA256 in backend test fixtures.
