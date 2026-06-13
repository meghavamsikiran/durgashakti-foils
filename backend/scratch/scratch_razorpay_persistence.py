import asyncio
import motor.motor_asyncio
import uuid
from datetime import datetime, timezone

async def test_order_razorpay_id():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.durgashakti
    
    # Create a dummy order
    order_id = str(uuid.uuid4())
    order = {
        "id": order_id,
        "order_number": f"DSF-{int(datetime.now().timestamp())}",
        "total_amount": 100,
        "order_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order)
    print(f"Created dummy order: {order_id}")
    
    # Simulate create_razorpay_order logic
    rz_order_id = "order_fake_123"
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"razorpay_order_id": rz_order_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    print(f"Updated order with razorpay_order_id: {rz_order_id}")
    
    # Verify
    updated = await db.orders.find_one({"id": order_id})
    if updated.get("razorpay_order_id") == rz_order_id:
        print("SUCCESS: razorpay_order_id persisted correctly")
    else:
        print("FAILURE: razorpay_order_id NOT persisted")
    
    # Cleanup
    await db.orders.delete_one({"id": order_id})
    client.close()

if __name__ == "__main__":
    asyncio.run(test_order_razorpay_id())
