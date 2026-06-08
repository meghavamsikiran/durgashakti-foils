import asyncio
import logging
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import select
from database import init_engine, async_session_factory
from models import OrderModel

logging.basicConfig(level=logging.INFO)

async def main():
    init_engine()
    order_id = "a8014faf-6000-4829-9de1-409f11916313"
    async with async_session_factory() as db:
        res = await db.execute(select(OrderModel).where(OrderModel.id == order_id))
        order = res.scalar_one_or_none()
        if not order:
            print(f"Order {order_id} not found in database.")
            return
            
        print("=" * 80)
        print(f"Order ID: {order.id}")
        print(f"Order Number: {order.order_number}")
        print(f"Order Status: {order.order_status}")
        print(f"Payment Status: {order.payment_status}")
        print(f"Items: {order.items}")
        print("=" * 80)

if __name__ == "__main__":
    asyncio.run(main())
