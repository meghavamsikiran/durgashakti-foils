from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from database import get_db
from models import ContactModel, utcnow
from deps import require_permission, UserSchema, ContactCreate, send_email
from email_templates import (
    contact_acknowledgement_email,
    contact_reply_email,
    contact_resolved_email
)

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

    # Send auto-acknowledgement email
    subj, email_body = contact_acknowledgement_email(payload.name, payload.message)
    import asyncio
    asyncio.create_task(send_email(payload.email, subj, email_body))

    return {"message": "Message submitted successfully", "id": str(contact.id)}

# ── Admin Endpoints ──────────────────────────────────────────────────────
@router.get("/admin/contacts")
async def list_contacts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: UserSchema = Depends(require_permission("view_inquiries")),
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
            "reply_message": c.reply_message,
            "replied_at": c.replied_at.isoformat() if c.replied_at else None,
            "created_at": c.created_at.isoformat()
        }
        for c in res.scalars().all()
    ]
    return {"items": items, "total": total, "page": page, "limit": limit}

@router.put("/admin/contacts/{contact_id}/status")
async def update_contact_status(
    contact_id: str,
    data: dict,
    admin: UserSchema = Depends(require_permission("update_inquiry_status")),
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

    if status == "resolved":
        date_str = contact.created_at.strftime('%Y-%m-%d %H:%M:%S')
        subj, resolve_email_body = contact_resolved_email(contact.name, contact.message, date_str)
        import asyncio
        asyncio.create_task(send_email(contact.email, subj, resolve_email_body))

    return {"message": f"Status updated to {status} successfully", "status": contact.status}

@router.post("/admin/contacts/{contact_id}/reply")
async def reply_contact(
    contact_id: str,
    data: dict,
    admin: UserSchema = Depends(require_permission("reply_inquiry")),
    db: AsyncSession = Depends(get_db)
):
    reply_body = data.get("reply_message")
    if not reply_body:
        raise HTTPException(status_code=400, detail="Reply message is required")

    res = await db.execute(select(ContactModel).where(ContactModel.id == contact_id))
    contact = res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact inquiry not found")

    if contact.status == "resolved":
        raise HTTPException(
            status_code=400, 
            detail="Cannot reply to a resolved/closed inquiry. Please re-open it (change status to Pending or In Progress) before replying."
        )

    contact.reply_message = reply_body
    contact.replied_at = utcnow()
    contact.status = "replied"
    await db.flush()

    date_str = contact.created_at.strftime('%Y-%m-%d %H:%M:%S')
    subj, customer_email_body = contact_reply_email(contact.name, contact.message, reply_body, date_str)
    sent, err_msg = await send_email(contact.email, subj, customer_email_body)

    return {
        "message": "Reply sent successfully" if sent else "Reply saved, but email delivery failed",
        "status": "replied",
        "email_sent": sent,
        "email_error": None if sent else err_msg
    }
