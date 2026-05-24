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
from sqlalchemy import select
from models import ProductModel, OrderModel, SettingModel

async def time_queries():
    database.init_engine()
    
    t0 = time.time()
    async with database.async_session_factory() as db:
        t_conn = time.time() - t0
        print(f"Time to open session: {t_conn*1000:.2f} ms")
        
        # Query 1: Settings
        t_s = time.time()
        res = await db.execute(select(SettingModel))
        settings = res.scalars().all()
        t_s_diff = time.time() - t_s
        print(f"Settings query ({len(settings)} items): {t_s_diff*1000:.2f} ms")
        
        # Query 2: Products
        t_p = time.time()
        res = await db.execute(select(ProductModel).limit(20))
        products = res.scalars().all()
        t_p_diff = time.time() - t_p
        print(f"Products query ({len(products)} items): {t_p_diff*1000:.2f} ms")
        
        # Query 3: Orders
        t_o = time.time()
        res = await db.execute(select(OrderModel).limit(20))
        orders = res.scalars().all()
        t_o_diff = time.time() - t_o
        print(f"Orders query ({len(orders)} items): {t_o_diff*1000:.2f} ms")

if __name__ == '__main__':
    asyncio.run(time_queries())
