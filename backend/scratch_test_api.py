import os
import asyncio
from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

load_dotenv()
DATABASE_URL_RAW = os.environ.get('DATABASE_URL', '')

import re
from urllib.parse import unquote
from sqlalchemy.engine import URL

_m = re.match(r'postgresql(?:\+asyncpg)?://([^:@]+):(.+)@([^:/]+):(\d+)/(.+)', DATABASE_URL_RAW)
if _m:
    _user, _enc_pw, _host, _port, _db = _m.groups()
    _password = unquote(_enc_pw)
    _async_url = URL.create(
        drivername="postgresql+asyncpg",
        username=_user,
        password=_password,
        host=_host,
        port=int(_port),
        database=_db.split("?")[0],
    )
else:
    _async_url = DATABASE_URL_RAW.replace("postgresql://", "postgresql+asyncpg://", 1)

from database import Base
from models import OrderModel, UserModel, AuditLogModel

async def test_order_details():
    engine = create_async_engine(_async_url, connect_args={"ssl": "require"})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # Get a sample order first
        res = await db.execute(select(OrderModel).limit(1))
        order = res.scalar_one_or_none()
        if not order:
            print("No orders in DB!")
            return
        
        order_id = str(order.id)
        print(f"Testing order_id = {order_id} (order_number = {order.order_number})")
        
        import uuid
        from deps import is_valid_uuid, row_to_dict
        
        try:
            # 1. Fetch Order
            print("Step 1: Fetching order...")
            if is_valid_uuid(order_id):
                res = await db.execute(select(OrderModel).where(OrderModel.id == uuid.UUID(order_id)))
            else:
                res = await db.execute(select(OrderModel).where(OrderModel.order_number == order_id))
            order_fetched = res.scalar_one_or_none()
            if not order_fetched:
                print("Order not found in DB!")
                return
            print("Order fetched successfully:", order_fetched.order_number)
            
            # 2. Convert to dict
            print("Step 2: row_to_dict...")
            order_dict = row_to_dict(order_fetched)
            print("Dict keys:", order_dict.keys())
            
            # 3. Customer dict
            print("Step 3: Fetching user...")
            customer_dict = {
                "full_name": order_fetched.customer_name or "Guest User",
                "email": "N/A",
                "phone": order_fetched.shipping_address.get("phone", "N/A") if order_fetched.shipping_address else "N/A",
                "customer_id": str(order_fetched.user_id) if order_fetched.user_id else "Guest",
                "account_status": "Guest"
            }
            if order_fetched.user_id:
                res_user = await db.execute(select(UserModel).where(UserModel.id == order_fetched.user_id))
                user = res_user.scalar_one_or_none()
                if user:
                    customer_dict = {
                        "full_name": user.full_name,
                        "email": user.email,
                        "phone": user.phone or (order_fetched.shipping_address.get("phone", "N/A") if order_fetched.shipping_address else "N/A"),
                        "customer_id": str(user.id),
                        "account_status": user.account_status or ("Deleted" if user.is_deleted else "Active")
                    }
            print("Customer info:", customer_dict)
            
            # 4. Fetch Logs
            print("Step 4: Fetching timeline logs...")
            res_logs = await db.execute(
                select(AuditLogModel)
                .where(AuditLogModel.target_type == "order", AuditLogModel.target_id == order_id)
                .order_by(AuditLogModel.created_at.asc())
            )
            logs = res_logs.scalars().all()
            print(f"Found {len(logs)} logs.")
            
            timeline = []
            timeline.append({
                "event": "Order Created",
                "timestamp": order_fetched.created_at.isoformat(),
                "actor": "Customer",
                "message": f"Order placement initiated via {order_fetched.payment_method.upper()}"
            })
            
            for l in logs:
                event_name = l.action
                actor_name = "System"
                msg = ""
                
                # Resolve actor name
                if l.actor_id:
                    if l.actor_id == str(order_fetched.user_id):
                        actor_name = "Customer"
                    else:
                        res_actor = await db.execute(select(UserModel.full_name, UserModel.role).where(UserModel.id == uuid.UUID(l.actor_id) if is_valid_uuid(l.actor_id) else UserModel.id == l.actor_id))
                        act_row = res_actor.first()
                        if act_row:
                            actor_name = f"{act_row[0]} ({act_row[1]})"

                if l.action == "ORDER_COD_CONFIRMED":
                    event_name = "Confirmed"
                    msg = "Cash On Delivery payment mode confirmed."
                elif l.action == "ORDER_PAYMENT_CAPTURED_WEBHOOK":
                    event_name = "Payment Received"
                    msg = f"Razorpay payment captured. ID: {l.metadata_.get('payment_id', 'N/A')}"
                elif l.action == "ORDER_STATUS_UPDATED":
                    to_status = l.metadata_.get("to", "").lower()
                    from_status = l.metadata_.get("from", "").lower()
                    event_name = to_status.replace("_", " ").title()
                    msg = f"Status updated from {from_status} to {to_status}."
                elif l.action == "ORDER_AUTO_CANCELLED_USER_DELETION":
                    event_name = "Cancelled"
                    msg = "Automatically cancelled due to customer account deletion."
                else:
                    event_name = l.action.replace("_", " ").title()
                    msg = str(l.metadata_)
                    
                timeline.append({
                    "event": event_name,
                    "timestamp": l.created_at.isoformat(),
                    "actor": actor_name,
                    "message": msg
                })
            
            timeline.sort(key=lambda x: x["timestamp"])
            print("Timeline created successfully. Length =", len(timeline))
            
        except Exception as e:
            import traceback
            print("ERROR:")
            traceback.print_exc()

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_order_details())
