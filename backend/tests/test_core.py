import pytest
from datetime import datetime, timezone, timedelta
import uuid

# Import dependencies from backend
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from deps import (
    hash_password,
    verify_password,
    create_token,
    decode_token,
    sanitize_search_term,
    is_super_admin_role,
    normalize_order_status,
    ORDER_STATUS_TRANSITIONS,
    UserRegister,
    UserLogin,
    ShippingAddress,
    CartItem,
    OrderItemSchema,
    OrderCreate,
    _best_price
)
from pydantic import ValidationError


def test_password_hashing():
    password = "SecurePassword123!"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_jwt_token_lifecycle():
    user_id = str(uuid.uuid4())
    email = "test@durgashakti.com"
    role = "SUPER_ADMIN"
    
    token = create_token(user_id, email, role)
    assert isinstance(token, str)
    assert len(token) > 20
    
    payload = decode_token(token)
    assert payload["user_id"] == user_id
    assert payload["email"] == email
    assert payload["role"] == role
    assert "exp" in payload


def test_login_accepts_gmail_username_alias():
    login = UserLogin(email="durgashaktifoils", password="123456")
    assert login.email == "durgashaktifoils@gmail.com"


def test_invalid_token():
    with pytest.raises(Exception):
        decode_token("invalid.token.string")


def test_sanitize_search_term():
    assert sanitize_search_term(None) is None
    assert sanitize_search_term("   hello world   ") == "hello world"
    long_str = "a" * 200
    assert len(sanitize_search_term(long_str, max_length=50)) == 50


def test_is_super_admin_role():
    assert is_super_admin_role("SUPER_ADMIN") is True
    assert is_super_admin_role("admin") is False
    assert is_super_admin_role("customer") is False
    assert is_super_admin_role(None) is False


def test_order_status_normalizer():
    assert normalize_order_status("confirm") == "confirmed"
    assert normalize_order_status("ship") == "shipped"
    assert normalize_order_status("deliver") == "delivered"
    assert normalize_order_status("cancel") == "cancelled"
    assert normalize_order_status("refund") == "refunded"
    assert normalize_order_status("PLACED") == "placed"


def test_order_status_transitions():
    assert "confirmed" in ORDER_STATUS_TRANSITIONS["pending"]
    assert "cancelled" in ORDER_STATUS_TRANSITIONS["pending"]
    assert "packaging" in ORDER_STATUS_TRANSITIONS["confirmed"]
    assert "shipped" in ORDER_STATUS_TRANSITIONS["packaging"]
    assert "in_transit" in ORDER_STATUS_TRANSITIONS["shipped"]
    assert "returned" not in ORDER_STATUS_TRANSITIONS["delivered"]
    assert "returned" in ORDER_STATUS_TRANSITIONS["failed"]
    assert len(ORDER_STATUS_TRANSITIONS["cancelled"]) == 0
    assert len(ORDER_STATUS_TRANSITIONS["refunded"]) == 0


def test_shipping_address_schema():
    valid_data = {
        "full_name": "Rajesh Kumar",
        "phone": "+918367542954",
        "address_line1": "12/4 Industrial Area",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560001"
    }
    addr = ShippingAddress(**valid_data)
    assert addr.full_name == "Rajesh Kumar"
    assert addr.pincode == "560001"
    
    # Invalid pincode length/format
    invalid_data = valid_data.copy()
    invalid_data["pincode"] = "123"
    with pytest.raises(ValidationError):
        ShippingAddress(**invalid_data)


def test_cart_item_schema():
    item = CartItem(product_id="prod_1", quantity=5)
    assert item.product_id == "prod_1"
    assert item.quantity == 5
    
    with pytest.raises(ValidationError):
        CartItem(product_id="prod_1", quantity=0)


def test_uuid_validators():
    from deps import validate_uuid, is_valid_uuid
    from fastapi import HTTPException
    
    valid_id = str(uuid.uuid4())
    assert is_valid_uuid(valid_id) is True
    assert validate_uuid(valid_id) == valid_id
    
    assert is_valid_uuid("prod_1") is False
    assert is_valid_uuid(None) is False
    assert is_valid_uuid("None") is False
    
    with pytest.raises(HTTPException) as exc:
        validate_uuid("invalid-uuid-string")
    assert exc.value.status_code == 400
    
    with pytest.raises(HTTPException):
        validate_uuid("None")


def test_category_global_discount_overrides_offer_price():
    assert _best_price(3499, item_discount_price=2999, category_discount_percent=10) == 3149.1
    assert _best_price(3499, item_discount_price=2999, category_discount_percent=0) == 2999


def test_admin_requests_schemas():
    from deps import AdminCreateRequest, AdminUpdateRequest
    
    create_req = AdminCreateRequest(
        email="admin@gmail.com",
        password="SuperPassword123",
        full_name="Rajesh Sharma",
        permissions={"manage_orders": True}
    )
    assert create_req.email == "admin@gmail.com"
    assert create_req.permissions == {"manage_orders": True}
    
    update_req = AdminUpdateRequest(
        full_name="Rajesh Sharma Updated",
        permissions={"manage_orders": False}
    )
    assert update_req.permissions == {"manage_orders": False}

