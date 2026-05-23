import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure console supports utf-8 output on Windows
sys.stdout.reconfigure(encoding='utf-8')

# Load environment explicitly before anything else
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

import database
from sqlalchemy import select
from models import SettingModel

async def main():
    database.init_engine()
    if not database.async_session_factory:
        print("Database engine not initialized.")
        return

    async with database.async_session_factory() as session:
        result = await session.execute(select(SettingModel).where(SettingModel.key == "shipping_settings"))
        s = result.scalar_one_or_none()
        if s:
            print("KEY:", s.key)
            print("VALUE:", s.value)
        else:
            print("KEY 'shipping_settings' DOES NOT EXIST IN DATABASE!")

if __name__ == "__main__":
    asyncio.run(main())
