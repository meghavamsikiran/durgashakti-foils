import asyncio
from dotenv import load_dotenv
load_dotenv()
from database import init_engine, get_db
from models import SettingModel
from sqlalchemy import select
import json

async def main():
    init_engine()
    async for db in get_db():
        res = await db.execute(select(SettingModel).where(SettingModel.key == "popup_banner"))
        s = res.scalar_one_or_none()
        if s:
            print("popup_banner key exists in database!")
            print("Value:", json.dumps(s.value, indent=2))
        else:
            print("popup_banner key does NOT exist in database!")

if __name__ == "__main__":
    asyncio.run(main())
