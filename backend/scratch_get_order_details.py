import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

import database
from sqlalchemy import select
from models import OrderModel

async def list_orders():
    database.init_engine()
    async with database.async_session_factory() as db:
        res = await db.execute(select(OrderModel).order_by(OrderModel.created_at.desc()).limit(5))
        orders = res.scalars().all()
        for order in orders:
            print("ORDER NUMBER:", order.order_number)
            print("TOTAL_AMOUNT:", order.total_amount)
            print("PAYMENT_METHOD:", order.payment_method)
            print("PAYMENT_STATUS:", order.payment_status)
            print("ORDER_STATUS:", order.order_status)
            print("ITEMS:", order.items)
            print("SHIPPING_ADDRESS:", order.shipping_address)
            print("-" * 50)

if __name__ == '__main__':
    asyncio.run(list_orders())
