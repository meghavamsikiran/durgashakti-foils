from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

def check():
    client = MongoClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"))
    db = client[os.getenv("DB_NAME", "durgashaktifoils_db")]
    user = db.users.find_one()
    print("User Keys:", user.keys() if user else "No users found")
    if user:
        print("User ID field:", user.get("id"))
        print("User Full Name field:", user.get("full_name"))
    
    order = db.orders.find_one()
    print("Order Keys:", order.keys() if order else "No orders found")
    if order:
        print("Order User ID field:", order.get("user_id"))

if __name__ == "__main__":
    check()
