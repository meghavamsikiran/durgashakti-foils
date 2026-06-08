import asyncio
from database import init_engine, async_session_factory
from models import OrderModel
from sqlalchemy import select, func
from datetime import datetime, timezone, timedelta

async def main():
    init_engine()
    async with async_session_factory() as session:
        # Total orders
        total = await session.execute(select(func.count(OrderModel.id)))
        print("Total orders in DB:", total.scalar())
        
        # Pending payment orders older than 15 mins
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)
        stmt = select(func.count(OrderModel.id)).where(
            OrderModel.order_status.in_(["pending_payment", "pending"]),
            OrderModel.payment_method != "cod",
            OrderModel.created_at < cutoff
        )
        res = await session.execute(stmt)
        print("Expired pending payment orders:", res.scalar())

if __name__ == "__main__":
    asyncio.run(main())
