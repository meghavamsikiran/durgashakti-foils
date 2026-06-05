# Production Readiness & Audit Plan - DurgaShakti Foils

This document outlines the systematic testing, verification, validation, and potential bug-fixing steps to transition the DurgaShakti Foils React/FastAPI application into live production.

## 1. System Topology & Architecture
- **Backend**: FastAPI, SQLAlchemy (async/PostgreSQL/Supabase)
- **Frontend**: React, Tailwind CSS
- **Database**: PostgreSQL (Supabase)
- **Payment Gateway**: Razorpay Integration (Verify & Webhooks, 15-minute Retry Buffer, Background Timeout Loop)

## 2. Milestone Assessment & Plan

### Milestone 1: Automated Test Suite & E2E Validation
- **Goal**: Confirm all existing Tiers 1-4 tests (71 tests in `tests/test_payment_e2e.py`) and Tier 5 tests (`tests/test_razorpay_adversarial.py`) pass on the database backend.
- **Verification Method**: Trigger pytest. Since permissions for command execution might be restricted on the host, we will rely on subagents (`teamwork_preview_challenger` and `teamwork_preview_reviewer` or `teamwork_preview_auditor`) to execute pytest tasks in their independent workspace runs, and capture/analyze their logs.

### Milestone 3: Detailed Phase Audits
We will systematically address the required audits:
1. **Phase 1-2: Exploration & Button-by-Button Auditing**
   - Verify all routes, endpoints, auth flow, and UI components for Cart, Checkout, Wishlist, Profile, Addresses, Coupons, Admin Panel.
2. **Phase 3-4: Customer-Admin Sync & Complete Order Flow**
   - Inspect order updates and status transitions (confirmed -> processing -> shipped -> delivered, return_requested -> return_approved -> refunded / return_rejected).
3. **Phase 5-7: Razorpay, Email & Invoice Calculations**
   - Audit invoice calculations (subtotal, discounts, CGST/SGST 9% each, shipping cost, COD charge, grand total).
   - Ensure receipt email is queued exactly once per paid order and contains the correct PDF attachment.
4. **Phase 8-10: Refund, Analytics & Inventory Update**
   - Verify stock restoring when orders are cancelled, failed, or refunded.
   - Verify revenue and coupon utilization tracking updates.
5. **Phase 11-15: Security, Performance, UI/UX, and Error Handling**
   - Verify inputs, SQL injection protection, error handling (404/500/maintenance pages), and caching.

## 4. Worker Delegation Strategy
We will delegate the exploration, execution, and validation to subagents:
- **Explorer Subagent**: Explores the backend routes (`backend/routes/`) and frontend components (`frontend/src/`) to identify potential logic bugs or discrepancies.
- **Worker Subagent**: Executes fixes (if any gaps are discovered) and verifies builds.
- **Challenger / Auditor Subagent**: Runs the test verification and does the forensic integrity checks.

---
*Plan established on 2026-06-05.*
