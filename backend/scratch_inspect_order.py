import asyncio
import os
import sys
import json
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import init_engine, async_session_factory
from models import OrderModel
from sqlalchemy import select

load_dotenv()

async def main():
    init_engine()
    async with async_session_factory() as db:
        res = await db.execute(select(OrderModel).where(OrderModel.order_number == "955-9498234-6036388"))
        order = res.scalar_one_or_none()
        if not order:
            print("Order not found")
            return
        
        print(f"Order ID: {order.id}")
        print(f"Order Status: {order.order_status}")
        print(f"Payment Status: {order.payment_status}")
        print("Items:")
        for idx, item in enumerate(order.items or []):
            print(f"  Item {idx + 1}:")
            print(f"    Product ID: {item.get('product_id')}")
            print(f"    Name: {item.get('name') or item.get('product_name')}")
            print(f"    Price: {item.get('price')}")
            print(f"    Return Status: {item.get('return_status')}")
            print(f"    Refund Calculations: {json.dumps(item.get('refund_calculations'), indent=2)}")
            print(f"    Self Shipping Details: {json.dumps(item.get('self_shipping_details'), indent=2)}")

if __name__ == "__main__":
    asyncio.run(main())
