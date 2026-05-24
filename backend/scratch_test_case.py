import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

import database
from sqlalchemy import select, func, case
from models import ProductModel, OrderModel

async def test_case():
    database.init_engine()
    async with database.async_session_factory() as db:
        # Test Product metrics query
        product_metrics_q = select(
            func.sum(ProductModel.price * ProductModel.stock_quantity),
            func.sum(ProductModel.units_sold),
            func.sum(case((ProductModel.stock_quantity <= 0, 1), else_=0)),
            func.sum(case(((ProductModel.stock_quantity > 0) & (ProductModel.stock_quantity <= ProductModel.low_stock_threshold), 1), else_=0)),
            func.count(ProductModel.id),
            func.sum(case((ProductModel.stock_quantity > 0, 1), else_=0))
        )
        res = await db.execute(product_metrics_q)
        row = res.tuples().first()
        print("Product metrics query succeeded:", row)

        # Test Order metrics query
        from datetime import datetime, timezone
        today_iso = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        orders_metrics_q = select(
            func.sum(case((OrderModel.id.isnot(None), 1), else_=0)),
            func.sum(case((OrderModel.created_at >= today_iso, 1), else_=0)),
            func.sum(case(((OrderModel.order_status == 'confirmed'), OrderModel.total_amount), else_=0.0))
        )
        res2 = await db.execute(orders_metrics_q)
        row2 = res2.tuples().first()
        print("Order metrics query succeeded:", row2)

if __name__ == '__main__':
    asyncio.run(test_case())
