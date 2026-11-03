from __future__ import annotations

import hashlib
import hmac
import re
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import Settings
from app.db.models import ContentKind, QueueStatus
from app.queue.service import create_queue_item


def verify_resend_signature(raw_body: bytes, signature: str | None, secret: str | None) -> bool:
    if not secret:
        return True
    if not signature:
        return False
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def _lookup_order(db: Session, settings: Settings, email: str) -> dict[str, Any] | None:
    if not settings.database_url:
        return None
    from sqlalchemy import create_engine

    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        row = conn.execute(
            text(
                """
                SELECT id, status, theme_id, created_at, delivered_at, failure_reason, results_token
                FROM orders
                WHERE lower(email) = lower(:email)
                ORDER BY created_at DESC
                LIMIT 1
                """
            ),
            {"email": email},
        ).mappings().first()
        return dict(row) if row else None


def _draft_reply(order: dict[str, Any] | None, from_email: str, subject: str, body: str) -> str:
    if not order:
        return (
            f"Hi,\n\nThanks for emailing us about \"{subject}\". "
            f"I could not find a recent order for {from_email}. "
            "If you used a different email at checkout, reply with that address and we will look again.\n\n"
            "Best,\nSupport"
        )
    status = order.get("status", "unknown")
    link = f"Results: use your delivery email link (token {order.get('results_token', '')[:8]}…)"
    if status == "delivered":
        detail = f"Your order is delivered. {link}"
    elif status in ("paid", "generating", "review"):
        detail = f"Your order is in progress (status: {status}). We will email when portraits are ready."
    elif status == "failed":
        detail = f"Your order needs attention (status: failed). Reason: {order.get('failure_reason') or 'see admin'}."
    else:
        detail = f"Latest order status: {status}."
    return (
        f"Hi,\n\nThanks for your message about \"{subject}\".\n\n{detail}\n\n"
        f"(Original message snippet: {body[:400]}…)\n\nBest,\nSupport"
    )


async def handle_inbound_email(
    db: Session,
    settings: Settings,
    payload: dict[str, Any],
) -> dict[str, Any]:
    from_email = payload.get("from", "")
    subject = payload.get("subject", "(no subject)")
    body = payload.get("text") or payload.get("html") or ""
    match = re.search(r"[\w.+-]+@[\w.-]+\.\w+", from_email)
    email = match.group(0) if match else from_email

    order = _lookup_order(db, settings, email)
    draft = _draft_reply(order, email, subject, body)

    item = create_queue_item(
        db,
        kind=ContentKind.cs_reply,
        title=f"CS reply: {subject[:80]}",
        media_path=None,
        caption_path=None,
        platform_payloads={"email": {"to": email, "subject": f"Re: {subject}", "text": draft}},
        metadata={"inbound": payload, "order_id": order.get("id") if order else None},
        status=QueueStatus.pending_approval,
    )
    return {"queue_id": item.id, "draft_preview": draft[:500]}
