from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from database import get_db
from models import ContactModel
from deps import require_permission, UserSchema, ContactCreate

router = APIRouter(prefix="/api")

# ── Public Endpoints ─────────────────────────────────────────────────────
@router.post("/contact")
async def submit_contact(payload: ContactCreate, db: AsyncSession = Depends(get_db)):
    contact = ContactModel(
        name=payload.name,
        email=payload.email,
        message=payload.message,
        phone=payload.phone
    )
    db.add(contact)
    await db.flush()
    return {"message": "Message submitted successfully", "id": str(contact.id)}

# ── Admin Endpoints ──────────────────────────────────────────────────────
@router.get("/admin/contacts")
async def list_contacts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: UserSchema = Depends(require_permission("manage_customers")),
    db: AsyncSession = Depends(get_db)
):
    base_q = select(ContactModel)
    count_q = select(func.count(ContactModel.id))

    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * limit
    res = await db.execute(base_q.order_by(ContactModel.created_at.desc()).offset(offset).limit(limit))
    items = [
        {
            "id": str(c.id),
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "message": c.message,
            "status": c.status,
            "created_at": c.created_at.isoformat()
        }
        for c in res.scalars().all()
    ]
    return {"items": items, "total": total, "page": page, "limit": limit}

@router.put("/admin/contacts/{contact_id}/status")
async def update_contact_status(
    contact_id: str,
    data: dict,
    admin: UserSchema = Depends(require_permission("manage_customers")),
    db: AsyncSession = Depends(get_db)
):
    status = data.get("status")
    if not status:
        raise HTTPException(status_code=400, detail="Status is required")
        
    res = await db.execute(select(ContactModel).where(ContactModel.id == contact_id))
    contact = res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact inquiry not found")
        
    contact.status = status
    await db.flush()
    return {"message": "Status updated successfully", "status": contact.status}
