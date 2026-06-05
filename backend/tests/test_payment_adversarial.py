import os
import sys
from pathlib import Path
import pytest
import hmac
import hashlib
import uuid
import json
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
import httpx

# Setup pathing
sys.path.append(str(Path(__file__).resolve().parent.parent))

import os
os.environ['DATABASE_URL'] = os.getenv(
    'DATABASE_URL',
    'postgresql://postgres:NxdsId4xaXIBp17y@db.vddtkiefzhcihdzxxlgp.supabase.co:5432/postgres'
)

# Import actual modules
from database import get_db, engine, async_session_factory, init_engine
from models import OrderModel, ProductModel, UserModel
from deps import get_current_user, UserSchema, hash_password
from routes.orders import router as orders_router

# Initialize database engine for tests
init_engine()

# Setup a clean test app to avoid interference from route-mutating mocks
app = FastAPI()
app.include_router(orders_router)

# Secrets
RZP_KEY_SECRET = "88I55VYE6171aOyU0pJFNYX6"
RZP_WEBHOOK_SECRET = "test_webhook_secret_key"

def generate_razorpay_signature(order_id: str, payment_id: str, secret: str = RZP_KEY_SECRET) -> str:
    msg = f"{order_id}|{payment_id}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

def generate_webhook_signature(body: bytes, secret: str = RZP_WEBHOOK_SECRET) -> str:
    return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="function")
async def db_session():
    from database import engine
    async with engine.connect() as connection:
        transaction = await connection.begin()
        session = AsyncSession(bind=connection, expire_on_commit=False)
        
        async def override_get_db():
            yield session
            try:
                await session.flush()
            except Exception:
                await session.rollback()
                raise
        
        app.dependency_overrides[get_db] = override_get_db
        yield session
        await transaction.rollback()
        app.dependency_overrides.pop(get_db, None)
    await engine.dispose()

@pytest.fixture(scope="function")
async def test_user(db_session: AsyncSession) -> UserModel:
    user_id = uuid.uuid4()
    user = UserModel(
        id=user_id,
        email=f"adversarial_{user_id.hex}@gmail.com",
        password=hash_password("Password123!"),
        full_name="Adversarial Payment Tester",
        role="customer",
        is_active=True
    )
    db_session.add(user)
    await db_session.flush()
    return user

@pytest.fixture(scope="function")
def auth_headers(test_user: UserModel) -> dict:
    # Set mock current user dependency override
    async def override_get_current_user():
        from deps import row_to_dict
        d = row_to_dict(test_user)
        d.pop("password", None)
        return UserSchema(**d)
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    return {"Authorization": "Bearer fake-token"}

@pytest.fixture(scope="function")
async def test_product(db_session: AsyncSession) -> ProductModel:
    prod_id = uuid.uuid4()
    product = ProductModel(
        id=prod_id,
        name=f"Adv Test Foil {prod_id.hex[:6]}",
        price=500.0,
        discount_price=450.0,
        stock_quantity=10,
        in_stock=True,
        category="Aluminum Foil"
    )
    db_session.add(product)
    await db_session.flush()
    return product

@pytest.fixture(scope="function")
async def client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

# -------------------------------------------------------------
# Adversarial Tests
# -------------------------------------------------------------

@pytest.mark.anyio
async def test_signature_verification_mismatch(client, auth_headers, test_product, db_session):
    # 1. Create order
    payload = {
        "items": [{"product_id": str(test_product.id), "product_name": test_product.name, "quantity": 1, "price": 450.0}],
        "total_amount": 450.0,
        "payment_method": "online",
        "shipping_address": {"full_name": "Adversarial", "phone": "+918367542954", "address_line1": "123 St", "city": "Blr", "state": "Kar", "pincode": "560001"}
    }
    res = await client.post("/api/orders", json=payload, headers=auth_headers)
    assert res.status_code == 200
    order_data = res.json()
    rzp_order_id = order_data["razorpay_order_id"]
    order_id = order_data["id"]

    # Record initial stock
    await db_session.refresh(test_product)
    initial_stock = test_product.stock_quantity

    # 2. Verify with mismatched/incorrect signature
    verify_payload = {
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": "pay_xyz",
        "razorpay_signature": "incorrect_hash_value"
    }
    verify_res = await client.post("/api/payment/razorpay/verify", json=verify_payload, headers=auth_headers)
    assert verify_res.status_code == 400
    assert verify_res.json()["detail"] == "Invalid signature"


@pytest.mark.anyio
async def test_razorpay_refund_error_normalization():
    from routes.orders import _normalize_refund_error

    message = _normalize_refund_error(Exception(
        "Razorpay refund failed: Your account does not have enough balance to carry out the refund operation."
    ))
    assert "insufficient balance" in message.lower()
    assert "add funds" in message.lower()

def test_razorpay_refund_bank_reference_detection():
    from routes.orders import _refund_has_bank_reference

    assert _refund_has_bank_reference({"acquirer_data": {"rrn": "123456789012"}})
    assert _refund_has_bank_reference({"acquirer_data": {"arn": "ARN123456"}})
    assert not _refund_has_bank_reference({"status": "processed", "acquirer_data": {}})
    assert not _refund_has_bank_reference({"status": "processed"})

@pytest.mark.anyio
async def test_razorpay_reconcile_keeps_refund_pending_without_bank_reference(db_session, monkeypatch):
    import routes.orders as orders_module

    class FakePaymentClient:
        @staticmethod
        def fetch(payment_id):
            return {
                "id": payment_id,
                "status": "refunded",
                "amount_refunded": 45000,
                "refund_status": "full",
            }

        @staticmethod
        def fetch_multiple_refund(payment_id):
            return {
                "items": [{
                    "id": "rfnd_without_reference",
                    "status": "processed",
                    "amount": 45000,
                    "created_at": 1717500000,
                    "acquirer_data": {},
                }]
            }

    class FakeRazorpayClient:
        payment = FakePaymentClient()

    monkeypatch.setattr(orders_module, "_get_razorpay_client", lambda: FakeRazorpayClient())
    order = OrderModel(
        id=uuid.uuid4(),
        order_number=f"refund-pending-{uuid.uuid4().hex[:8]}",
        user_id=None,
        customer_name="Refund Tester",
        items=[],
        total_amount=450.0,
        payment_method="online",
        payment_status="refund_pending",
        order_status="return_approved",
        stock_applied=False,
        shipping_address={},
        razorpay_payment_id="pay_refund_pending",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    reconciled = await orders_module.reconcile_order_refund_with_razorpay(order, db_session)

    assert reconciled is False
    assert order.payment_status == "refund_pending"
    assert order.order_status == "return_approved"

@pytest.mark.anyio
async def test_razorpay_reconcile_marks_refunded_with_bank_reference(db_session, monkeypatch):
    import routes.orders as orders_module

    class FakePaymentClient:
        @staticmethod
        def fetch(payment_id):
            return {
                "id": payment_id,
                "status": "refunded",
                "amount_refunded": 45000,
                "refund_status": "full",
            }

        @staticmethod
        def fetch_multiple_refund(payment_id):
            return {
                "items": [{
                    "id": "rfnd_with_reference",
                    "status": "processed",
                    "amount": 45000,
                    "created_at": 1717500000,
                    "acquirer_data": {"rrn": "123456789012"},
                }]
            }

    class FakeRazorpayClient:
        payment = FakePaymentClient()

    monkeypatch.setattr(orders_module, "_get_razorpay_client", lambda: FakeRazorpayClient())
    order = OrderModel(
        id=uuid.uuid4(),
        order_number=f"refund-final-{uuid.uuid4().hex[:8]}",
        user_id=None,
        customer_name="Refund Tester",
        items=[],
        total_amount=450.0,
        payment_method="online",
        payment_status="refund_pending",
        order_status="return_approved",
        stock_applied=False,
        shipping_address={},
        razorpay_payment_id="pay_refund_final",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    reconciled = await orders_module.reconcile_order_refund_with_razorpay(order, db_session)

    assert reconciled is True
    assert order.payment_status == "refunded"
    assert order.order_status == "refunded"

@pytest.mark.anyio
async def test_signature_verification_invalid_formats(client, auth_headers, test_product, db_session):
    payload = {
        "items": [{"product_id": str(test_product.id), "product_name": test_product.name, "quantity": 1, "price": 450.0}],
        "total_amount": 450.0,
        "payment_method": "online",
        "shipping_address": {"full_name": "Adversarial", "phone": "+918367542954", "address_line1": "123 St", "city": "Blr", "state": "Kar", "pincode": "560001"}
    }
    res = await client.post("/api/orders", json=payload, headers=auth_headers)
    order_data = res.json()
    rzp_order_id = order_data["razorpay_order_id"]

    # Test with empty signature format
    verify_payload = {
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": "pay_xyz",
        "razorpay_signature": ""
    }
    verify_res = await client.post("/api/payment/razorpay/verify", json=verify_payload, headers=auth_headers)
    assert verify_res.status_code == 400

@pytest.mark.anyio
async def test_invalid_webhook_events(client, auth_headers, test_product, db_session):
    # 1. Create order
    payload = {
        "items": [{"product_id": str(test_product.id), "product_name": test_product.name, "quantity": 1, "price": 450.0}],
        "total_amount": 450.0,
        "payment_method": "online",
        "shipping_address": {"full_name": "Adversarial", "phone": "+918367542954", "address_line1": "123 St", "city": "Blr", "state": "Kar", "pincode": "560001"}
    }
    res = await client.post("/api/orders", json=payload, headers=auth_headers)
    order_data = res.json()
    rzp_order_id = order_data["razorpay_order_id"]
    order_id = order_data["id"]

    # Record initial stock
    await db_session.refresh(test_product)
    initial_stock = test_product.stock_quantity

    # 2. Fire payment.failed webhook
    webhook_data = {
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_failed_123",
                    "amount": 45000,
                    "order_id": rzp_order_id,
                    "status": "failed"
                }
            }
        }
    }
    body_bytes = json.dumps(webhook_data).encode("utf-8")
    sig = generate_webhook_signature(body_bytes)

    webhook_res = await client.post(
        "/api/payment/razorpay/webhook",
        content=body_bytes,
        headers={"X-Razorpay-Signature": sig}
    )
    assert webhook_res.status_code == 200
    assert webhook_res.json()["status"] == "ignored"

    # 3. Verify order and stock are unchanged
    order_res = await db_session.execute(select(OrderModel).where(OrderModel.id == order_id))
    order = order_res.scalar_one()
    assert order.payment_status == "pending"
    assert order.order_status == "pending_payment"
    
    await db_session.refresh(test_product)
    assert test_product.stock_quantity == initial_stock

@pytest.mark.anyio
async def test_webhook_validation_failures(client, auth_headers, test_product, db_session):
    payload = {
        "items": [{"product_id": str(test_product.id), "product_name": test_product.name, "quantity": 1, "price": 450.0}],
        "total_amount": 450.0,
        "payment_method": "online",
        "shipping_address": {"full_name": "Adversarial", "phone": "+918367542954", "address_line1": "123 St", "city": "Blr", "state": "Kar", "pincode": "560001"}
    }
    res = await client.post("/api/orders", json=payload, headers=auth_headers)
    order_data = res.json()
    rzp_order_id = order_data["razorpay_order_id"]

    webhook_data = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_xyz",
                    "amount": 45000,
                    "order_id": rzp_order_id,
                    "status": "captured"
                }
            }
        }
    }
    body_bytes = json.dumps(webhook_data).encode("utf-8")

    # Missing signature header
    webhook_res = await client.post(
        "/api/payment/razorpay/webhook",
        content=body_bytes
    )
    assert webhook_res.status_code == 400
    assert "webhook signature" in webhook_res.json()["detail"].lower()

    # Invalid signature header
    webhook_res2 = await client.post(
        "/api/payment/razorpay/webhook",
        content=body_bytes,
        headers={"X-Razorpay-Signature": "invalid_signature"}
    )
    assert webhook_res2.status_code == 400
    assert "invalid webhook signature" in webhook_res2.json()["detail"].lower()

@pytest.mark.anyio
async def test_db_disconnect_during_verify(client, auth_headers, test_product, db_session, monkeypatch):
    payload = {
        "items": [{"product_id": str(test_product.id), "product_name": test_product.name, "quantity": 1, "price": 450.0}],
        "total_amount": 450.0,
        "payment_method": "online",
        "shipping_address": {"full_name": "Adversarial", "phone": "+918367542954", "address_line1": "123 St", "city": "Blr", "state": "Kar", "pincode": "560001"}
    }
    res = await client.post("/api/orders", json=payload, headers=auth_headers)
    order_data = res.json()
    rzp_order_id = order_data["razorpay_order_id"]
    order_id = order_data["id"]

    # Make sure stock is recorded
    await db_session.refresh(test_product)
    initial_stock = test_product.stock_quantity

    # Mock the db session's flush or commit method to raise SQLAlchemyError
    original_flush = db_session.flush
    async def mock_flush(*args, **kwargs):
        raise SQLAlchemyError("Simulated database connection loss during verify processing")

    monkeypatch.setattr(db_session, "flush", mock_flush)

    verify_payload = {
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": "pay_xyz",
        "razorpay_signature": generate_razorpay_signature(rzp_order_id, "pay_xyz")
    }

    with pytest.raises(SQLAlchemyError):
        await client.post("/api/payment/razorpay/verify", json=verify_payload, headers=auth_headers)

    # Restore flush
    monkeypatch.setattr(db_session, "flush", original_flush)
    
    # Rollback the transaction to ensure clean state
    await db_session.rollback()

    # Re-fetch order and stock to confirm no modification/rollback succeeded
    order_res = await db_session.execute(select(OrderModel).where(OrderModel.id == order_id))
    order = order_res.scalar_one()
    assert order.payment_status == "pending"
    assert order.order_status == "pending_payment"
    
    await db_session.refresh(test_product)
    assert test_product.stock_quantity == initial_stock

@pytest.mark.anyio
async def test_db_disconnect_during_webhook(client, auth_headers, test_product, db_session, monkeypatch):
    payload = {
        "items": [{"product_id": str(test_product.id), "product_name": test_product.name, "quantity": 1, "price": 450.0}],
        "total_amount": 450.0,
        "payment_method": "online",
        "shipping_address": {"full_name": "Adversarial", "phone": "+918367542954", "address_line1": "123 St", "city": "Blr", "state": "Kar", "pincode": "560001"}
    }
    res = await client.post("/api/orders", json=payload, headers=auth_headers)
    order_data = res.json()
    rzp_order_id = order_data["razorpay_order_id"]
    order_id = order_data["id"]

    await db_session.refresh(test_product)
    initial_stock = test_product.stock_quantity

    # Mock the db session's flush or commit method to raise SQLAlchemyError
    original_flush = db_session.flush
    async def mock_flush(*args, **kwargs):
        raise SQLAlchemyError("Simulated database connection loss during webhook processing")

    monkeypatch.setattr(db_session, "flush", mock_flush)

    webhook_data = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_xyz",
                    "amount": 45000,
                    "order_id": rzp_order_id,
                    "status": "captured"
                }
            }
        }
    }
    body_bytes = json.dumps(webhook_data).encode("utf-8")
    sig = generate_webhook_signature(body_bytes)

    with pytest.raises(SQLAlchemyError):
        await client.post(
            "/api/payment/razorpay/webhook",
            content=body_bytes,
            headers={"X-Razorpay-Signature": sig}
        )

    # Restore flush
    monkeypatch.setattr(db_session, "flush", original_flush)
    
    # Rollback transaction
    await db_session.rollback()

    # Re-fetch order and stock to confirm no modification/rollback succeeded
    order_res = await db_session.execute(select(OrderModel).where(OrderModel.id == order_id))
    order = order_res.scalar_one()
    assert order.payment_status == "pending"
    assert order.order_status == "pending_payment"
    
    await db_session.refresh(test_product)
    assert test_product.stock_quantity == initial_stock
