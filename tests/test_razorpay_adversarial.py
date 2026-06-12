import os
import sys
from pathlib import Path

# Setup pathing
sys.path.append(str(Path(__file__).resolve().parent.parent / 'backend'))

# Disable maintenance mode for testing
os.environ['BACKEND_MAINTENANCE_MODE'] = 'false'
# Use the database URL
os.environ['DATABASE_URL'] = os.getenv(
    'DATABASE_URL',
    'postgresql://postgres:NxdsId4xaXIBp17y@db.vddtkiefzhcihdzxxlgp.supabase.co:5432/postgres'
)

# Ensure RAZORPAY key secrets are configured for local signature generation
os.environ['RAZORPAY_KEY_ID'] = 'fake_key_id'
os.environ['RAZORPAY_KEY_SECRET'] = '88I55VYE6171aOyU0pJFNYX6'
os.environ['RAZORPAY_WEBHOOK_SECRET'] = 'test_webhook_secret_key'

import pytest
import hmac
import hashlib
import uuid
import json
import asyncio
from datetime import datetime, timezone
import httpx
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

# Import models
import database

@pytest.fixture(scope="function", autouse=True)
async def db_setup():
    database.init_engine()
    yield
    if database.engine:
        await database.engine.dispose()


# Import models
from models import OrderModel, ProductModel, UserModel
from deps import UserSchema, get_current_user, create_token, hash_password

# Import the actual router from routes.orders
from routes.orders import router as orders_router

# Create a clean app instance containing ONLY the orders router to prevent any side effects or overrides from other tests
app = FastAPI()
app.include_router(orders_router)

# Helper to generate signatures
def generate_razorpay_signature(order_id: str, payment_id: str, secret: str = '88I55VYE6171aOyU0pJFNYX6') -> str:
    msg = f"{order_id}|{payment_id}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

def generate_webhook_signature(body: bytes, secret: str = 'test_webhook_secret_key') -> str:
    return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="function")
async def client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.fixture(scope="function")
async def setup_data():
    # We will use a session to insert a test user and a test product
    async with database.async_session_factory() as session:
        # Create user
        user_id = uuid.uuid4()
        user = UserModel(
            id=user_id,
            email=f"adversarial_{user_id.hex}@test.com",
            password=hash_password("Password123!"),
            full_name="Adversarial Tester",
            role="customer",
            is_active=True
        )
        # Create product
        prod_id = uuid.uuid4()
        product = ProductModel(
            id=prod_id,
            name=f"Adversarial Product {prod_id.hex[:6]}",
            price=1000.0,
            discount_price=900.0,
            stock_quantity=10,
            in_stock=True,
            category="Test Category"
        )
        session.add(user)
        session.add(product)
        await session.commit()
        
        # Return user and product info
        user_data = {"id": str(user.id), "email": user.email, "role": user.role, "full_name": user.full_name}
        product_data = {"id": str(product.id), "name": product.name, "stock_quantity": product.stock_quantity}
        
    yield user_data, product_data
    
    # Cleanup
    async with database.async_session_factory() as session:
        await session.execute(delete(OrderModel).where(OrderModel.user_id == uuid.UUID(user_data["id"])))
        await session.execute(delete(UserModel).where(UserModel.id == uuid.UUID(user_data["id"])))
        await session.execute(delete(ProductModel).where(ProductModel.id == uuid.UUID(product_data["id"])))
        await session.commit()

@pytest.fixture(scope="function")
async def auth_setup(setup_data):
    user_data, product_data = setup_data
    user_schema = UserSchema(
        id=user_data["id"],
        email=user_data["email"],
        role=user_data["role"],
        full_name=user_data["full_name"],
        is_active=True
    )
    app.dependency_overrides[get_current_user] = lambda: user_schema
    
    # Generate Bearer Token just to pass validation if needed (though dependency override bypasses it)
    token = create_token(user_data["id"], user_data["email"], user_data["role"])
    headers = {"Authorization": f"Bearer {token}"}
    
    yield headers, user_data, product_data
    
    app.dependency_overrides.pop(get_current_user, None)

@pytest.mark.anyio
async def test_concurrent_payment_verify_and_webhook(client, auth_setup):
    headers, user_data, product_data = auth_setup
    
    # 1. Create order
    payload = {
        "items": [{"product_id": product_data["id"], "quantity": 1}],
        "payment_method": "online",
        "shipping_address": {"full_name": "Adversarial", "phone": "+918367542954", "address_line1": "123 St", "city": "Blr", "state": "Kar", "pincode": "560001"}
    }
    create_res = await client.post("/api/orders", json=payload, headers=headers)
    assert create_res.status_code == 200
    order_res = create_res.json()
    rzp_order_id = order_res["razorpay_order_id"]
    order_id = order_res["id"]
    
    # Verify stock is not yet deducted for online payment pending
    async with database.async_session_factory() as session:
        res = await session.execute(select(ProductModel).where(ProductModel.id == uuid.UUID(product_data["id"])))
        prod = res.scalar_one()
        assert prod.stock_quantity == 10
        
    # 2. Fire concurrent verification and webhook requests
    rzp_payment_id = f"pay_{uuid.uuid4().hex[:10]}"
    total_amount_paise = int(round(float(order_res["total_amount"]) * 100))
    
    # Verify payload
    sig = generate_razorpay_signature(rzp_order_id, rzp_payment_id)
    verify_payload = {
        "razorpay_order_id": rzp_order_id,
        "razorpay_payment_id": rzp_payment_id,
        "razorpay_signature": sig
    }
    
    # Webhook payload
    webhook_data = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": rzp_payment_id,
                    "amount": total_amount_paise,
                    "order_id": rzp_order_id,
                    "status": "captured"
                }
            }
        }
    }
    body_bytes = json.dumps(webhook_data).encode("utf-8")
    web_sig = generate_webhook_signature(body_bytes)
    
    # Prepare concurrent tasks:
    # 2 verify requests and 2 webhook requests
    tasks = [
        client.post("/api/payment/razorpay/verify", json=verify_payload, headers=headers),
        client.post("/api/payment/razorpay/verify", json=verify_payload, headers=headers),
        client.post(
            "/api/payment/razorpay/webhook",
            content=body_bytes,
            headers={"x-razorpay-signature": web_sig}
        ),
        client.post(
            "/api/payment/razorpay/webhook",
            content=body_bytes,
            headers={"x-razorpay-signature": web_sig}
        )
    ]
    
    results = await asyncio.gather(*tasks)
    
    # Print status codes and response bodies for analysis
    for idx, r in enumerate(results):
        print(f"Task {idx} Response: {r.status_code} - {r.json()}")
        
    # Check that all succeeded (200 OK)
    assert all(r.status_code == 200 for r in results)
    
    # Verify that the order is marked paid and stock is deducted exactly ONCE
    async with database.async_session_factory() as session:
        # Refresh order
        res = await session.execute(select(OrderModel).where(OrderModel.id == uuid.UUID(order_id)))
        order = res.scalar_one()
        assert order.payment_status == "Paid"
        assert order.order_status == "confirmed"
        assert order.stock_applied is True
        
        # Refresh product stock
        res = await session.execute(select(ProductModel).where(ProductModel.id == uuid.UUID(product_data["id"])))
        prod = res.scalar_one()
        # Stock should be 9 (10 - 1), NOT lower (which would indicate double charging / double deduction)
        assert prod.stock_quantity == 9

@pytest.mark.anyio
async def test_razorpay_api_failure_handling(client, auth_setup):
    headers, user_data, product_data = auth_setup
    
    from unittest.mock import patch
    
    # We mock client.order.create to raise a ConnectionError (simulating network error / Razorpay downtime)
    with patch("razorpay.Client") as MockClient:
        mock_instance = MockClient.return_value
        mock_instance.order.create.side_effect = Exception("Razorpay API Network Timeout")
        
        # Create order payload
        payload = {
            "items": [{"product_id": product_data["id"], "quantity": 1}],
            "payment_method": "online",
            "shipping_address": {"full_name": "Adversarial", "phone": "+918367542954", "address_line1": "123 St", "city": "Blr", "state": "Kar", "pincode": "560001"}
        }
        
        # Temporarily ensure RAZORPAY_KEY_ID is not "fake" to trigger the else block that calls razorpay.Client
        with patch.dict(os.environ, {"RAZORPAY_KEY_ID": "rzp_live_real_key", "RAZORPAY_KEY_SECRET": "real_secret"}):
            response = await client.post("/api/orders", json=payload, headers=headers)
            
            assert response.status_code == 200
            order_data = response.json()
            assert "razorpay_order_id" in order_data
            # It should have generated a fallback mock order ID starting with "order_"
            assert order_data["razorpay_order_id"].startswith("order_")
            print(f"Fallback Razorpay Order ID: {order_data['razorpay_order_id']}")
