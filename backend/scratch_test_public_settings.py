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
from models import SettingModel

async def get_public():
    database.init_engine()
    async with database.async_session_factory() as db:
        res = await db.execute(select(SettingModel).where(SettingModel.key.in_(["company_profile", "payment_settings", "scrolling_banner", "shipping_settings"])))
        d = {s.key: s.value for s in res.scalars().all()}
        
        # Simulating FastAPI endpoint logic:
        if "shipping_settings" not in d:
            print("No shipping_settings in DB")
        else:
            shipping = dict(d["shipping_settings"] or {})
            if shipping.get("codCharge") is None:
                shipping["codCharge"] = shipping.get("cod_extra_service_charge", shipping.get("cod_charge", 0.0))
            shipping.pop("minimumOrderAmount", None)
            d["shipping_settings"] = shipping
            
        print("API Response shipping_settings keys:")
        for k, v in d["shipping_settings"].items():
            print(f"  {k}: {v} ({type(v).__name__})")

if __name__ == '__main__':
    asyncio.run(get_public())
