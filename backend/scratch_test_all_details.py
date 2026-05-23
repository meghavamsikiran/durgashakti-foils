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

from models import OrderModel, UserModel, AuditLogModel
from deps import row_to_dict

async def test():
    engine = create_async_engine(_async_url, connect_args={"ssl": "require"})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        res = await db.execute(select(OrderModel))
        orders = res.scalars().all()
        print(f"Total orders: {len(orders)}")
        
        failures = 0
        for o in orders:
            try:
                # Replicate get_admin_order_details logic exactly
                customer_dict = {
                    "full_name": o.customer_name or "Guest User",
                    "email": "N/A",
                    "phone": o.shipping_address.get("phone", "N/A") if o.shipping_address else "N/A",
                    "customer_id": str(o.user_id) if o.user_id else "Guest",
                    "account_status": "Guest"
                }
                
                if o.user_id:
                    res_user = await db.execute(select(UserModel).where(UserModel.id == o.user_id))
                    user = res_user.scalar_one_or_none()
                    if user:
                        customer_dict = {
                            "full_name": user.full_name,
                            "email": user.email,
                            "phone": user.phone or (o.shipping_address.get("phone", "N/A") if o.shipping_address else "N/A"),
                            "customer_id": str(user.id),
                            "account_status": user.account_status or ("Deleted" if user.is_deleted else "Active")
                        }
                
                res_logs = await db.execute(
                    select(AuditLogModel)
                    .where(AuditLogModel.target_type == "order", AuditLogModel.target_id == str(o.id))
                    .order_by(AuditLogModel.created_at.asc())
                )
                logs = res_logs.scalars().all()
                
                timeline = []
                timeline.append({
                    "status": "placed",
                    "title": "Order Placed",
                    "description": "Order successfully created and payment initiated.",
                    "timestamp": o.created_at.isoformat() if o.created_at else None,
                    "actor": "System"
                })
                
                for l in logs:
                    actor_name = "System"
                    if l.actor_id:
                        if l.actor_id == str(o.user_id):
                            actor_name = "Customer"
                        else:
                            res_actor = await db.execute(select(UserModel.full_name, UserModel.role).where(UserModel.id == l.actor_id))
                            act_row = res_actor.first()
                            if act_row:
                                actor_name = f"{act_row[0]} ({act_row[1]})"
                    
                    timeline.append({
                        "status": l.action.lower(),
                        "title": l.action.replace("_", " ").title(),
                        "description": l.metadata_.get("reason", "") if l.metadata_ else "",
                        "timestamp": l.created_at.isoformat() if l.created_at else None,
                        "actor": actor_name
                    })
                
                response_data = {
                    "order": row_to_dict(o),
                    "customer": customer_dict,
                    "timeline": timeline
                }
                
            except Exception as e:
                print(f"FAILED for Order {o.order_number} (ID={o.id}): {e}")
                import traceback
                traceback.print_exc()
                failures += 1
                
        print(f"Tests complete. Failures: {failures}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test())
