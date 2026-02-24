"""Subscription router — status, invoice, webhook."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.user import User
from app.services.subscription_service import activate_subscription, get_subscription_status

router = APIRouter(prefix="/subscription", tags=["subscription"])


@router.get("/status")
async def subscription_status(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get current subscription status."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return get_subscription_status(user)


@router.post("/invoice")
async def create_invoice(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a Telegram Stars invoice link.
    In production, this calls Telegram Bot API createInvoiceLink.
    """
    # For now return a placeholder — in production this calls:
    # bot.create_invoice_link(title, description, payload, currency, prices)
    return {
        "invoice_link": "tg://invoice/placeholder",
        "stars_amount": 250,
        "description": "NutriBot Premium — 30 дней",
    }


@router.post("/webhook")
async def subscription_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle Telegram payment webhook.
    Called by Telegram after successful Stars payment.
    """
    body = await request.json()

    # Extract payment data from Telegram webhook
    payment = body.get("message", {}).get("successful_payment", {})
    if not payment:
        # Could be a pre_checkout_query
        pre_checkout = body.get("pre_checkout_query", {})
        if pre_checkout:
            return {"ok": True}  # Auto-approve pre-checkout
        raise HTTPException(status_code=400, detail="Invalid webhook payload")

    tg_id = body.get("message", {}).get("from", {}).get("id")
    if not tg_id:
        raise HTTPException(status_code=400, detail="Missing user ID")

    result = await db.execute(select(User).where(User.tg_id == tg_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    telegram_payment_id = payment.get("telegram_payment_charge_id", "")
    stars_amount = payment.get("total_amount", 0)

    sub_info = await activate_subscription(db, user, telegram_payment_id, stars_amount)

    return {"ok": True, "subscription": sub_info}
