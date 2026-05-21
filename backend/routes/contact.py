from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from database import get_db
from models import ContactModel, utcnow
from deps import require_permission, UserSchema, ContactCreate, send_email

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
    email_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
        <h2 style="color: #4f46e5; text-align: center;">DurgaShakti Foils</h2>
        <hr style="border: 0; border-top: 1px solid #e1e1e1; margin: 20px 0;">
        <p>Dear {payload.name},</p>
        <p>Thank you for reaching out to us. We have received your inquiry and our team is reviewing it. We will get back to you shortly.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #334155;">Your Message Details:</p>
            <p style="margin: 10px 0 0 0; font-style: italic; color: #475569;">"{payload.message}"</p>
        </div>
        <p>Best Regards,<br><strong>DurgaShakti Foils Team</strong></p>
    </div>
    """
    import asyncio
    asyncio.create_task(send_email(payload.email, "We've received your inquiry - DurgaShakti Foils", email_body))

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
        resolve_email_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
            <h2 style="color: #10b981; text-align: center;">Inquiry Resolved</h2>
            <hr style="border: 0; border-top: 1px solid #e1e1e1; margin: 20px 0;">
            <p>Dear {contact.name},</p>
            <p>Your inquiry submitted on {contact.created_at.strftime('%Y-%m-%d %H:%M:%S')} has been marked as <strong>Resolved/Closed</strong>.</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                <p style="margin: 0; font-weight: bold; color: #334155;">Original Inquiry Details:</p>
                <p style="margin: 10px 0 0 0; color: #475569; font-style: italic;">"{contact.message}"</p>
            </div>
            
            <p>We hope we have addressed your questions. If you need any further assistance, feel free to submit a new inquiry.</p>
            <p>Best Regards,<br><strong>DurgaShakti Foils Team</strong></p>
        </div>
        """
        import asyncio
        asyncio.create_task(send_email(contact.email, "Your inquiry is resolved - DurgaShakti Foils", resolve_email_body))

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

    customer_email_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
        <h2 style="color: #4f46e5; text-align: center;">DurgaShakti Foils</h2>
        <hr style="border: 0; border-top: 1px solid #e1e1e1; margin: 20px 0;">
        <p>Dear {contact.name},</p>
        <p>This is a reply to your inquiry submitted on {contact.created_at.strftime('%Y-%m-%d %H:%M:%S')}.</p>
        
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f46e5;">
            <p style="margin: 0; font-weight: bold; color: #1e293b;">Our Response:</p>
            <p style="margin: 10px 0 0 0; color: #334155; line-height: 1.6; white-space: pre-wrap;">{reply_body}</p>
        </div>
        
        <div style="background-color: #f8fafc; padding: 12px; border-radius: 6px; margin: 20px 0; font-size: 13px;">
            <p style="margin: 0; font-weight: bold; color: #64748b;">Your Original Inquiry:</p>
            <p style="margin: 5px 0 0 0; color: #64748b; font-style: italic;">"{contact.message}"</p>
        </div>
        
        <p>Best Regards,<br><strong>DurgaShakti Foils Support Team</strong></p>
    </div>
    """
    sent, err_msg = await send_email(contact.email, "Reply to your inquiry - DurgaShakti Foils", customer_email_body)

    return {
        "message": "Reply sent successfully" if sent else "Reply saved, but email delivery failed",
        "status": "replied",
        "email_sent": sent,
        "email_error": None if sent else err_msg
    }
