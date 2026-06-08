import asyncio
import logging
from dotenv import load_dotenv
load_dotenv() # Load environmental variables

from sqlalchemy import select
from database import init_engine, async_session_factory
from models import AuditLogModel

# Set up logging to print to console
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    init_engine()
    if not async_session_factory:
        print("Failed to initialize database session factory.")
        return
        
    async with async_session_factory() as db:
        # Fetch the last 10 PAYMENT_RAZORPAY_REFUND_CREATED audit logs
        stmt = (
            select(AuditLogModel)
            .where(AuditLogModel.action == "PAYMENT_RAZORPAY_REFUND_CREATED")
            .order_by(AuditLogModel.created_at.desc())
            .limit(10)
        )
        res = await db.execute(stmt)
        logs = res.scalars().all()
        
        if not logs:
            print("No PAYMENT_RAZORPAY_REFUND_CREATED logs found.")
            return

        print(f"Found {len(logs)} refund logs:")
        for log in logs:
            print("=" * 80)
            print(f"Log ID: {log.id}")
            print(f"Created At: {log.created_at}")
            print(f"Order ID: {log.target_id}")
            print(f"Metadata: {log.metadata_}")
            
if __name__ == "__main__":
    asyncio.run(main())
