from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.cs.resend import handle_inbound_email, verify_resend_signature
from app.db.models import QueueStatus
from app.db.session import get_db, init_db
from app.planner.daily import generate_pet_of_day
from app.planner.poll import generate_style_poll
from app.publishers.registry import get_publishers
from app.queue.service import get_item, list_queue, publish_item, set_status
from app.scheduler import start_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))


def require_admin(
    authorization: Annotated[str | None, Header()] = None,
    token: Annotated[str | None, Query()] = None,
    settings: Settings = Depends(get_settings),
) -> None:
    secret = settings.content_worker_secret
    bearer_ok = authorization == f"Bearer {secret}"
    query_ok = token == secret
    if not (bearer_ok or query_ok):
        raise HTTPException(status_code=401, detail="Unauthorized")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    init_db()
    scheduler = start_scheduler(settings)
    app.state.scheduler = scheduler
    yield
    if scheduler:
        scheduler.shutdown(wait=False)


app = FastAPI(title="Pawtraitry content worker", version="0.1.0", lifespan=lifespan)


@app.get("/health")
def health(settings: Settings = Depends(get_settings)) -> dict:
    return {
        "ok": True,
        "dry_run": settings.dry_run,
        "publishers": list(get_publishers(settings).keys()),
    }


@app.get("/admin", response_class=HTMLResponse)
def admin_ui(
    request: Request,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    items = list_queue(db)
    return templates.TemplateResponse(
        "admin.html",
        {"request": request, "items": items},
    )


class ApproveBody(BaseModel):
    approve: bool = True


@app.get("/api/queue")
def api_list_queue(
    status: str | None = None,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    items = list_queue(db, status=status)
    return {
        "items": [
            {
                "id": i.id,
                "kind": i.kind,
                "status": i.status,
                "title": i.title,
                "media_path": i.media_path,
                "created_at": i.created_at.isoformat() if i.created_at else None,
                "platform_payloads": i.platform_payloads,
            }
            for i in items
        ]
    }


@app.post("/api/queue/{item_id}/approve")
async def api_approve(
    item_id: str,
    body: ApproveBody,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    _: None = Depends(require_admin),
):
    item = get_item(db, item_id)
    if not item:
        raise HTTPException(404, "Not found")
    if not body.approve:
        set_status(db, item, QueueStatus.rejected)
        return {"id": item.id, "status": item.status}
    set_status(db, item, QueueStatus.approved)
    item = await publish_item(db, settings, item)
    return {"id": item.id, "status": item.status, "error": item.error}


@app.post("/api/plan/daily")
async def api_plan_daily(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    _: None = Depends(require_admin),
):
    return await generate_pet_of_day(db, settings)


@app.post("/api/plan/poll")
async def api_plan_poll(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    _: None = Depends(require_admin),
):
    return await generate_style_poll(db, settings)


@app.post("/webhooks/resend/inbound")
async def resend_inbound(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    raw = await request.body()
    signature = request.headers.get("resend-signature") or request.headers.get("x-resend-signature")
    if not verify_resend_signature(raw, signature, settings.resend_webhook_secret):
        raise HTTPException(401, "Invalid signature")
    payload = await request.json()
    return await handle_inbound_email(db, settings, payload)
