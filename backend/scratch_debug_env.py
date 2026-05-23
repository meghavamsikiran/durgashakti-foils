import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent / ".env"
print(f"ENV PATH: {env_path}")
print(f"EXISTS: {env_path.exists()}")
load_dotenv(dotenv_path=env_path)
print(f"DATABASE_URL: {os.getenv('DATABASE_URL')}")
