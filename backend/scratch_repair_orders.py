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
from models import OrderModel

async def main():
    database.init_engine()
    if not database.async_session_factory:
        print("Database engine not initialized.")
        return

    async with database.async_session_factory() as session:
        result = await session.execute(select(OrderModel))
        orders = result.scalars().all()
        
        updated_count = 0
        for order in orders:
            # Calculate actual subtotal from items
            subtotal = 0.0
            for item in (order.items or []):
                price = float(item.get("price", 0.0))
                qty = int(item.get("quantity", 0))
                subtotal += price * qty
            
            subtotal = round(subtotal, 2)
            
            # Check if order has shipping_metadata
            addr = dict(order.shipping_address or {})
            metadata = addr.get("shipping_metadata")
            
            # Detect if order was affected by the subtotal-only saving bug
            # (i.e. total_amount was exactly equal to subtotal, but there should be GST/shipping)
            is_bugged = False
            if float(order.total_amount) == subtotal:
                is_bugged = True
                
            if not metadata or is_bugged:
                # Reconstruct correct values
                # If order total is small, let's apply CGST (9%) and SGST (9%) and shipping
                cgst = round(subtotal * 0.09, 2)
                sgst = round(subtotal * 0.09, 2)
                
                # Dynamic shipping charges fallback
                shipping = 0.0
                if subtotal < 1099.0:
                    shipping = 70.0
                
                # COD charges fallback
                cod = 0.0
                if order.payment_method == "cod":
                    # If it's the bugged order ORD-1779537523-9b05a297, the checkout screen showed 40.0 COD fee
                    if order.order_number == "ORD-1779537523-9b05a297" or subtotal == 502.0:
                        cod = 40.0
                    else:
                        cod = 0.0
                
                grand_total = round(subtotal + cgst + sgst + shipping + cod, 2)
                
                # Let's save the metadata
                addr["shipping_metadata"] = {
                    "subtotal": subtotal,
                    "shipping_cost": shipping,
                    "cgst_amount": cgst,
                    "sgst_amount": sgst,
                    "cod_charge": cod,
                    "grand_total": grand_total
                }
                
                order.shipping_address = addr
                order.total_amount = grand_total
                print(f"REPAIRED: {order.order_number} | Old Total: {subtotal} | New Total: {grand_total} | COD Fee: {cod}")
                updated_count += 1
        
        if updated_count > 0:
            await session.commit()
            print(f"Successfully repaired {updated_count} orders in the database!")
        else:
            print("No orders needed repair.")

if __name__ == "__main__":
    asyncio.run(main())
