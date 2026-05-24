import asyncio
import time
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

import database
from sqlalchemy import select, func, case, or_
from models import ProductModel, OrderModel, UserModel, AuditLogModel

REVENUE_ORDER_STATUSES = [
    "processing", "placed", "confirmed", "packaging", "shipped",
    "out_for_delivery", "delivered", "return_requested", "return_rejected"
]
REVENUE_PAYMENT_STATUSES = ["completed", "Paid"]

async def run_query_1():
    async with database.async_session_factory() as db:
        from datetime import datetime, timezone
        today_iso = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        # Orders metrics
        orders_metrics_q = select(
            func.sum(case((OrderModel.id.isnot(None), 1), else_=0)),
            func.sum(case((OrderModel.created_at >= today_iso, 1), else_=0)),
            func.sum(case(((OrderModel.order_status.in_(REVENUE_ORDER_STATUSES)) & (OrderModel.payment_status.in_(REVENUE_PAYMENT_STATUSES)), OrderModel.total_amount), else_=0.0))
        )
        res = await db.execute(orders_metrics_q)
        return res.tuples().first()

async def run_query_2():
    async with database.async_session_factory() as db:
        # Product metrics
        product_metrics_q = select(
            func.sum(ProductModel.price * ProductModel.stock_quantity),
            func.sum(ProductModel.units_sold),
            func.sum(case((ProductModel.stock_quantity <= 0, 1), else_=0)),
            func.sum(case(((ProductModel.stock_quantity > 0) & (ProductModel.stock_quantity <= ProductModel.low_stock_threshold), 1), else_=0)),
            func.count(ProductModel.id),
            func.sum(case((ProductModel.stock_quantity > 0, 1), else_=0))
        )
        res = await db.execute(product_metrics_q)
        return res.tuples().first()

async def run_query_3():
    async with database.async_session_factory() as db:
        res = await db.execute(select(ProductModel).order_by(ProductModel.units_sold.desc()).limit(1))
        return res.scalar_one_or_none()

async def run_query_4():
    async with database.async_session_factory() as db:
        st_res = await db.execute(select(OrderModel.order_status, func.count(OrderModel.id)).group_by(OrderModel.order_status))
        return st_res.all()

async def run_query_5():
    async with database.async_session_factory() as db:
        inv_res = await db.execute(select(ProductModel).order_by(ProductModel.stock_quantity.asc()).limit(50))
        return inv_res.scalars().all()

async def run_query_6():
    async with database.async_session_factory() as db:
        return (await db.execute(select(func.count(UserModel.id)).where(UserModel.role == "customer"))).scalar() or 0

async def run_query_7():
    async with database.async_session_factory() as db:
        audit_metrics_q = select(
            func.sum(case((AuditLogModel.action.in_(["ADMIN_CREATED", "ADMIN_PASSWORD_RESET"]), 1), else_=0)),
            func.sum(case((AuditLogModel.action.ilike("%DELETE%"), 1), else_=0))
        )
        res = await db.execute(audit_metrics_q)
        return res.tuples().first()

async def main():
    database.init_engine()
    
    # 1. Sequential execution benchmark
    print("Running sequential benchmark...")
    t0 = time.time()
    r1 = await run_query_1()
    r2 = await run_query_2()
    r3 = await run_query_3()
    r4 = await run_query_4()
    r5 = await run_query_5()
    r6 = await run_query_6()
    r7 = await run_query_7()
    t_seq = time.time() - t0
    print(f"Sequential Execution Time: {t_seq*1000:.2f} ms")
    
    # 2. Parallel execution benchmark
    print("\nRunning parallel benchmark using asyncio.gather...")
    t0 = time.time()
    results = await asyncio.gather(
        run_query_1(),
        run_query_2(),
        run_query_3(),
        run_query_4(),
        run_query_5(),
        run_query_6(),
        run_query_7()
    )
    t_par = time.time() - t0
    print(f"Parallel Execution Time: {t_par*1000:.2f} ms")
    print(f"Speedup: {t_seq / t_par:.2f}x")

if __name__ == '__main__':
    asyncio.run(main())
