# Handoff Report — Explorer 1

## 1. Observation
- **Project Structure**:
  - Backend framework is FastAPI. Files are inside `d:\archive\backend`.
  - Frontend framework is React. Files are inside `d:\archive\frontend`.
- **Order Model**:
  - Found inside `d:\archive\backend\models.py:OrderModel` (lines 134-169) containing:
    ```python
    class OrderModel(Base):
        __tablename__ = "orders"
        id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
        order_number = Column(String(100), unique=True, nullable=False, index=True)
        user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
        payment_method = Column(String(50), nullable=False)
        payment_status = Column(String(50), default="pending", nullable=False)
        order_status = Column(String(50), default="processing", nullable=False, index=True)
        stock_applied = Column(Boolean, default=False, nullable=False)
        ...
    ```
- **Order Creation API**:
  - Found inside `d:\archive\backend\routes\orders.py:create_order` (lines 154-156):
    ```python
    @router.post("/orders")
    async def create_order(order_data: OrderCreate, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
        order_data.payment_method = "cod"
    ```
  - It forces all created orders to use COD.
- **Frontend Payment Steps**:
  - Found in `d:\archive\frontend\src\pages\checkout\components\PaymentStep.jsx` (lines 14-27):
    ```javascript
    useEffect(() => {
      if (selectPaymentMethod && paymentMethod !== 'cod') {
        selectPaymentMethod('cod');
      }
    }, [paymentMethod, selectPaymentMethod]);
    ```
  - Only Cash on Delivery is currently supported on the UI side.
- **Order Details Countdown**:
  - Found in `d:\archive\frontend\src\pages\OrderDetailsPage.jsx` (lines 35-44 & 46-65) which calculates countdown logic based on `order.created_at` (15 minutes).
- **Background Cleanup Job**:
  - Found in `d:\archive\backend\server.py` (lines 83-162) which runs a loop every 60 seconds to auto-cancel `pending_payment` orders older than 15 minutes and release their stock.
- **Test execution**:
  - Ran `pytest` command in `backend/` directory:
    - Collected 13 items.
    - Result: `13 passed, 1 warning in 6.92s`.

## 2. Logic Chain
- Since `order_data.payment_method = "cod"` is hardcoded in the backend order router and frontend checkout stepper restricts selections, prepaid payment flows are currently inactive.
- Re-enabling the prepaid flows requires allowing the frontend to select `"online"`, updating the backend to conditionalize online payment checks, and creating the matching Razorpay orders.
- The 15-minute countdown and background worker are already present in the backend (`_payment_timeout_cleanup_loop` in `server.py`) and partially handled on the frontend (`OrderDetailsPage.jsx`). Integrating Razorpay checkout will fully synchronize these mechanisms.

## 3. Caveats
- Did not verify if there is an existing Razorpay account/API key ready for integration testing.
- Assumed standard Razorpay SDK signature verification algorithms are sufficient for backend validation.

## 4. Conclusion
- The system is architected to support dual payment models (COD and Online/Prepaid), but Online payment is currently restricted to COD in both frontend UI controls and backend route handlers.
- Integrating Razorpay requires adding SDK parameters, relaxing forced COD settings on checkout creation paths, setting up verify/webhook API endpoints, and connecting client-side handlers.

## 5. Verification Method
- Execute the backend unit tests using:
  ```powershell
  cd d:\archive\backend
  pytest
  ```
- Inspect `d:\archive\.agents\explorer_1\analysis.md` for the detailed architecture report.
