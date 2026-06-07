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

async def main():
    database.init_engine()
    if not database.async_session_factory:
        print("Database engine not initialized.")
        return

    async with database.async_session_factory() as session:
        result = await session.execute(
            select(OrderModel).where(OrderModel.order_number.like("%4164364%"))
        )
        order = result.scalar_one_or_none()
        if order:
            print("ORDER ID:", order.id)
            print("ORDER NUMBER:", order.order_number)
            print("TOTAL AMOUNT:", order.total_amount)
            print("PAYMENT STATUS:", order.payment_status)
            print("ORDER STATUS:", order.order_status)
            print("ITEMS:")
            import json
            print(json.dumps(order.items, indent=2))
        else:
            print("ORDER NOT FOUND!")

if __name__ == "__main__":
    asyncio.run(main())
