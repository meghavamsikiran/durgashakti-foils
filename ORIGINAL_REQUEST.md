# Original User Request

## Initial Request — 2026-06-04T21:53:20Z

Secure online payment integration using Razorpay as a service, including support for UPI, Credit/Debit Cards, NetBanking, handling failure scenarios, fault-tolerance, page refresh recovery, 15-minute retry buffer on pending orders, and reflecting payment statuses.

Working directory: d:/archive
Integrity mode: development

## Requirements

### R1. Razorpay Payment Gateway Integration
- Integrate Razorpay on the checkout page to allow customers to pay via UPI, Cards, NetBanking, etc.
- Configure secure client-side and server-side verification using Razorpay keys.

### R2. Secure & Fault-Tolerant Transaction Processing
- Handle potential transaction failures, page refreshes, and tab closures securely.
- Leverage Razorpay Webhook delivery to asynchronously verify payment completion and protect customer funds from double-charging or lost states.
- Auto-verify or resolve pending/interrupted transactions before marking them failed or initiating refunds.

### R3. 15-Minute Payment Retry Buffer
- If a checkout payment fails or remains pending, allow the user to retry payment within a 15-minute countdown window.
- The countdown must display on the Order Details/History page.
- Automatically cancel/fail the order if the 15-minute window expires without successful payment.

### R4. Admin & Customer Order Status Synchronization
- Order statuses and payment details must reflect accurately for both customers and admins in real-time or upon status check.

## Acceptance Criteria

### Payment Flow & Security
- [ ] Checkout successfully initiates Razorpay SDK payment window.
- [ ] Successful payments trigger secure backend verification using signature validation.
- [ ] Webhook endpoint securely verifies signatures and transitions orders to Paid state even if client-side callbacks fail.

### Fault Tolerance & Retry
- [ ] Order transitions to "Pending Payment" on initial failure.
- [ ] Active 15-minute countdown timer is visible on the order details page during "Pending Payment".
- [ ] Order automatically cancels/fails after 15 minutes of inactivity.
- [ ] Customer can successfully re-initiate payment within the 15-minute window.
