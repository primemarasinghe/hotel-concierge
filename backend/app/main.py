import asyncio
import calendar as cal
import json
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import email_service as em
from . import services as svc
from .agent import ConciergeAgent
from .config import settings
from .db import SessionLocal, get_db, init_db
from .models import (Booking, Conversation, Message, PromoCode, Property, RoomType,
                     ServiceRequest, TransferRequest)
from .ratelimit import ip_limiter, lookup_limiter, session_limiter

async def _cleanup_limiters():
    while True:
        await asyncio.sleep(3600)
        session_limiter.cleanup()
        ip_limiter.cleanup()
        lookup_limiter.cleanup()


def _dispatch_review_emails() -> int:
    """Find confirmed bookings that checked out before today and haven't had a review email yet.
    Sends review request emails and marks them sent. Returns the count sent."""
    sent = 0
    try:
        with SessionLocal() as db:
            props = db.scalars(select(Property)).all()
            for prop in props:
                today = svc.today_at(prop)
                cutoff = today - timedelta(days=30)
                rows = db.scalars(
                    select(Booking).where(
                        Booking.property_id == prop.id,
                        Booking.status == "confirmed",
                        Booking.check_out < today,
                        Booking.check_out >= cutoff,
                        Booking.review_email_sent.is_(False),
                    )
                ).all()
                pd = _prop_email_data(prop)
                for b in rows:
                    em.review_request(_booking_email_data(b), pd)
                    b.review_email_sent = True
                    sent += 1
                if rows:
                    db.commit()
    except Exception as exc:
        print(f"[review-scheduler] error: {exc}")
    return sent


def _dispatch_pre_arrival_emails() -> int:
    """Find confirmed bookings checking in within 48h that haven't had a pre-arrival email.
    Sends pre-arrival emails and marks them sent. Returns the count sent."""
    sent = 0
    try:
        with SessionLocal() as db:
            props = db.scalars(select(Property)).all()
            for prop in props:
                today = svc.today_at(prop)
                window_end = today + timedelta(days=2)
                rows = db.scalars(
                    select(Booking).where(
                        Booking.property_id == prop.id,
                        Booking.status == "confirmed",
                        Booking.check_in > today,
                        Booking.check_in <= window_end,
                        Booking.pre_arrival_email_sent.is_(False),
                    )
                ).all()
                pd = _prop_email_data(prop)
                for b in rows:
                    em.pre_arrival(_booking_email_data(b), pd)
                    b.pre_arrival_email_sent = True
                    sent += 1
                if rows:
                    db.commit()
    except Exception as exc:
        print(f"[pre-arrival-scheduler] error: {exc}")
    return sent


async def _review_email_scheduler():
    while True:
        await asyncio.sleep(3600)  # check every hour
        n = _dispatch_review_emails()
        if n:
            print(f"[review-scheduler] sent {n} review request email(s)")
        n2 = _dispatch_pre_arrival_emails()
        if n2:
            print(f"[pre-arrival-scheduler] sent {n2} pre-arrival email(s)")


@asynccontextmanager
async def lifespan(_app):
    init_db()
    task1 = asyncio.create_task(_cleanup_limiters())
    task2 = asyncio.create_task(_review_email_scheduler())
    yield
    for t in (task1, task2):
        t.cancel()
        try:
            await t
        except asyncio.CancelledError:
            pass


app = FastAPI(title="AI Hotel Concierge & Booking Agent", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins.split(","),
                   allow_methods=["*"], allow_headers=["*"])


def _prop_email_data(prop: Property) -> dict:
    contact = prop.contact or {}
    return {
        "name": prop.name, "location": prop.location, "kind": prop.kind,
        "check_in_time": prop.check_in_time, "check_out_time": prop.check_out_time,
        "accent": contact.get("accent", "#2f5d3a"),
        "phone": contact.get("phone", ""),
        "contact_email": contact.get("email", ""),
        "contact_review_url": contact.get("review_url", ""),
    }


def _booking_email_data(b: Booking) -> dict:
    return {
        "reference": b.reference, "email": b.email, "guest_name": b.guest_name,
        "phone": b.phone, "room": b.room_type.name,
        "check_in": b.check_in.isoformat(), "check_out": b.check_out.isoformat(),
        "nights": (b.check_out - b.check_in).days,
        "adults": b.adults, "children": b.children, "units": b.units,
        "meal_plan": b.meal_plan, "total": b.total_amount, "currency": b.currency,
        "special_requests": b.special_requests or "",
    }


def get_property(slug: str, db: Session = Depends(get_db)) -> Property:
    prop = db.scalar(select(Property).where(Property.slug == slug))
    if not prop:
        raise HTTPException(404, "Property not found")
    return prop


def require_admin(x_admin_token: str = Header(default="")):
    if x_admin_token != settings.admin_token:
        raise HTTPException(401, "Invalid admin token")


def _client_ip(request: Request) -> str:
    """Real client IP, respecting X-Forwarded-For from a trusted reverse proxy."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP", "")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


def _rate_check_chat(request: Request, body: "ChatIn"):
    """Raise 429 if per-session or per-IP chat limits are exceeded."""
    ok, retry = session_limiter.check(body.session_id)
    if not ok:
        raise HTTPException(
            429,
            "You're sending messages too quickly. Please wait a moment before trying again.",
            headers={"Retry-After": str(retry)},
        )
    ok, retry = ip_limiter.check(_client_ip(request))
    if not ok:
        raise HTTPException(
            429,
            "Too many requests from your network. Please try again shortly.",
            headers={"Retry-After": str(retry)},
        )


# ---------------- public (guest widget) ----------------

@app.get("/api/health")
def health():
    return {"ok": True, "llm_configured": bool(settings.openai_api_key)}


@app.get("/api/properties")
def list_properties(db: Session = Depends(get_db)):
    return [{"slug": p.slug, "name": p.name, "kind": p.kind, "location": p.location,
             "currency": p.currency, "assistant_name": p.assistant_name}
            for p in db.scalars(select(Property).order_by(Property.name))]


@app.get("/api/properties/{slug}")
def property_public(prop: Property = Depends(get_property)):
    return {"slug": prop.slug, "name": prop.name, "kind": prop.kind, "location": prop.location,
            "assistant_name": prop.assistant_name, "currency": prop.currency,
            "accent": (prop.contact or {}).get("accent", "#2f5d3a"),
            "greeting": (
                f"Hello! I'm {prop.assistant_name} 🙏 your AI concierge at {prop.name}. "
                "How can I help you today?"
            ),
            "suggestions": [
                "Check available rooms",
                "Book airport transfer",
                "Things to do in Kandy",
                "View my booking",
            ]}


class ChatIn(BaseModel):
    session_id: str = Field(min_length=8, max_length=64)
    message: str = Field(min_length=1, max_length=2000)
    lang: str = Field("en", pattern="^(en|si|ta)$")


@app.post("/api/properties/{slug}/chat")
def chat(request: Request, body: ChatIn, background_tasks: BackgroundTasks,
         prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    _rate_check_chat(request, body)
    if not settings.openai_api_key:
        raise HTTPException(503, "OPENAI_API_KEY is not configured on the server.")
    conv = db.get(Conversation, body.session_id)
    if conv and conv.property_id != prop.id:
        raise HTTPException(400, "Session belongs to another property")
    if not conv:
        conv = Conversation(id=body.session_id, property_id=prop.id)
        db.add(conv)
        db.commit()

    agent = ConciergeAgent(db, prop, conv)
    try:
        reply = agent.run(body.message, lang=body.lang)
    except Exception as e:  # LLM/network failure: don't lose the guest
        db.rollback()
        reply = ("Sorry, I'm having trouble right now. Please try again in a moment, or contact us at "
                 f"{(prop.contact or {}).get('phone', 'the front desk')}.")
        agent.tools_used.append(f"error:{type(e).__name__}")

    db.add_all([Message(conversation_id=conv.id, role="user", content=body.message),
                Message(conversation_id=conv.id, role="assistant", content=reply,
                        tools_used=agent.tools_used, events=agent.events)])
    conv.last_at = datetime.now(timezone.utc)
    db.commit()

    # Fire emails after commit (data is safely persisted)
    pd = _prop_email_data(prop)
    for event in agent.events:
        if event["type"] == "booking_created":
            ref = event["data"]["reference"]
            b = db.scalar(select(Booking).where(Booking.reference == ref))
            if b:
                bd = _booking_email_data(b)
                background_tasks.add_task(em.booking_received, bd, pd)
                background_tasks.add_task(em.staff_new_booking, bd, pd)

    return {"reply": reply, "events": agent.events, "session_id": conv.id}


@app.post("/api/properties/{slug}/chat/stream")
async def chat_stream(request: Request, body: ChatIn, background_tasks: BackgroundTasks,
                      prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    """SSE streaming endpoint — yields token/event/done/error frames."""
    _rate_check_chat(request, body)
    if not settings.openai_api_key:
        async def _cfg_err():
            yield f"data: {json.dumps({'type': 'error', 'message': 'OPENAI_API_KEY is not configured on the server.'})}\n\n"
        return StreamingResponse(_cfg_err(), media_type="text/event-stream")

    conv = db.get(Conversation, body.session_id)
    if conv and conv.property_id != prop.id:
        raise HTTPException(400, "Session belongs to another property")
    if not conv:
        conv = Conversation(id=body.session_id, property_id=prop.id)
        db.add(conv)
        db.commit()

    agent = ConciergeAgent(db, prop, conv)
    pd = _prop_email_data(prop)

    async def generate():
        reply_parts: list[str] = []
        try:
            async for ev in agent.arun_stream(body.message, lang=body.lang):
                if ev["type"] == "token":
                    reply_parts.append(ev["content"])
                yield f"data: {json.dumps(ev)}\n\n"
        except Exception as e:
            db.rollback()
            agent.tools_used.append(f"error:{type(e).__name__}")
            contact = (prop.contact or {}).get("phone", "the front desk")
            msg = (f"Sorry, I'm having trouble right now. "
                   f"Please try again in a moment, or contact us at {contact}.")
            yield f"data: {json.dumps({'type': 'error', 'message': msg})}\n\n"
            return

        # Persist to DB then signal done
        reply = "".join(reply_parts)
        db.add_all([
            Message(conversation_id=conv.id, role="user", content=body.message),
            Message(conversation_id=conv.id, role="assistant", content=reply,
                    tools_used=agent.tools_used, events=agent.events),
        ])
        conv.last_at = datetime.now(timezone.utc)
        db.commit()

        yield f"data: {json.dumps({'type': 'done', 'session_id': body.session_id})}\n\n"

        # Emails fire after client receives done — they don't feel this delay
        for event in agent.events:
            if event["type"] == "booking_created":
                ref = event["data"]["reference"]
                b = db.scalar(select(Booking).where(Booking.reference == ref))
                if b:
                    bd = _booking_email_data(b)
                    em.booking_received(bd, pd)
                    em.staff_new_booking(bd, pd)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


class LookupIn(BaseModel):
    reference: str = Field(min_length=3, max_length=20)
    email: str = Field(min_length=3, max_length=200)


class GuestCancelIn(BaseModel):
    email: str = Field(min_length=3, max_length=200)


def _booking_public(b: Booking, prop: Property) -> dict:
    contact = prop.contact or {}
    return {
        **svc.booking_summary(b),
        "guest_name": b.guest_name,
        "phone": b.phone,
        "property_name": prop.name,
        "property_slug": prop.slug,
        "property_kind": prop.kind,
        "property_location": prop.location,
        "property_accent": contact.get("accent", "#2f5d3a"),
        "check_in_time": prop.check_in_time,
        "check_out_time": prop.check_out_time,
        "free_cancellation_days": prop.free_cancellation_days,
        "contact_phone": contact.get("phone", ""),
        "contact_email": contact.get("email", ""),
    }


@app.post("/api/booking/lookup")
def guest_lookup_booking(request: Request, body: LookupIn, db: Session = Depends(get_db)):
    ok, retry = lookup_limiter.check(_client_ip(request))
    if not ok:
        raise HTTPException(
            429,
            "Too many lookup attempts. Please wait a few minutes before trying again.",
            headers={"Retry-After": str(retry)},
        )
    b = db.scalar(select(Booking).where(
        func.upper(Booking.reference) == body.reference.strip().upper()
    ))
    if not b or b.email != body.email.strip().lower():
        raise HTTPException(404, "No booking found with that reference and email address.")
    prop = db.get(Property, b.property_id)
    return _booking_public(b, prop)


@app.post("/api/booking/{reference}/cancel")
def guest_cancel_booking(reference: str, body: GuestCancelIn,
                         background_tasks: BackgroundTasks,
                         db: Session = Depends(get_db)):
    b = db.scalar(select(Booking).where(
        func.upper(Booking.reference) == reference.strip().upper()
    ))
    if not b or b.email != body.email.strip().lower():
        raise HTTPException(404, "No booking found with that reference and email address.")
    if b.status == "cancelled":
        raise HTTPException(400, "This booking is already cancelled.")
    prop = db.get(Property, b.property_id)
    if b.check_in <= svc.today_at(prop):
        raise HTTPException(400, "Stays that have already started can only be cancelled by contacting us directly.")
    # Snapshot data before commit (avoids DetachedInstanceError in background task)
    bd, pd = _booking_email_data(b), _prop_email_data(prop)
    out = svc.cancel_booking(db, prop, b)
    background_tasks.add_task(em.booking_cancelled, bd, pd)
    return out


@app.get("/api/properties/{slug}/chat/{session_id}")
def chat_history(session_id: str, prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    conv = db.get(Conversation, session_id)
    if not conv or conv.property_id != prop.id:
        return {"messages": []}
    return {"messages": [{"role": m.role, "content": m.content, "events": m.events or []}
                         for m in conv.messages]}


# ---------------- admin (staff dashboard) ----------------

admin = Depends(require_admin)


@app.get("/api/admin/{slug}/summary", dependencies=[admin])
def admin_summary(prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    today = svc.today_at(prop)
    active = select(Booking).where(Booking.property_id == prop.id, Booking.status != "cancelled")
    bookings = db.scalars(active.where(Booking.check_out >= today,
                                       Booking.check_in <= today + timedelta(days=14))).all()
    total_units = sum(r.total_units for r in prop.room_types)
    occupancy = []
    for i in range(14):
        d = today + timedelta(days=i)
        used = sum(b.units for b in bookings if b.check_in <= d < b.check_out)
        occupancy.append({"date": d.isoformat(), "occupied": used, "total": total_units})
    now = svc.now_at(prop)

    # Revenue — three fast SUM queries ----------------------------------------
    first_of_month = today.replace(day=1)
    next_month_first = (today.replace(day=28) + timedelta(days=4)).replace(day=1)
    revenue_mtd = float(db.scalar(
        select(func.coalesce(func.sum(Booking.total_amount), 0)).where(
            Booking.property_id == prop.id, Booking.status == "confirmed",
            Booking.check_in >= first_of_month, Booking.check_in < next_month_first,
        )
    ) or 0)
    revenue_next30 = float(db.scalar(
        select(func.coalesce(func.sum(Booking.total_amount), 0)).where(
            Booking.property_id == prop.id,
            Booking.status.in_(["confirmed", "pending"]),
            Booking.check_in >= today,
            Booking.check_in <= today + timedelta(days=30),
        )
    ) or 0)
    forecast_bks = db.scalars(
        select(Booking).where(
            Booking.property_id == prop.id,
            Booking.status.in_(["confirmed", "pending"]),
            Booking.check_in >= today,
            Booking.check_in < today + timedelta(days=14),
        )
    ).all()
    revenue_forecast = [
        {"date": (today + timedelta(days=i)).isoformat(),
         "revenue": float(sum(b.total_amount for b in forecast_bks
                              if b.check_in == today + timedelta(days=i))),
         "bookings": sum(1 for b in forecast_bks if b.check_in == today + timedelta(days=i))}
        for i in range(14)
    ]

    # ADR / RevPAR / occupancy % (month-to-date)
    days_elapsed = max((today - first_of_month).days, 1)
    available_room_nights_mtd = total_units * days_elapsed
    mtd_bks = db.scalars(select(Booking).where(
        Booking.property_id == prop.id,
        Booking.status == "confirmed",
        Booking.check_in < today,
        Booking.check_out > first_of_month,
    )).all()
    occupied_room_nights_mtd = sum(
        (min(b.check_out, today) - max(b.check_in, first_of_month)).days * b.units
        for b in mtd_bks
        if min(b.check_out, today) > max(b.check_in, first_of_month)
    )
    adr_mtd = round(revenue_mtd / occupied_room_nights_mtd, 2) if occupied_room_nights_mtd else 0
    revpar_mtd = round(revenue_mtd / available_room_nights_mtd, 2) if available_room_nights_mtd else 0
    occupancy_pct_mtd = round(occupied_room_nights_mtd / available_room_nights_mtd * 100, 1) if available_room_nights_mtd else 0

    # 6-month revenue trend
    _M_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    _M_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"]
    revenue_trend = []
    for i in range(5, -1, -1):
        tm = today.month - i
        ty = today.year
        while tm <= 0:
            tm += 12
            ty -= 1
        _, tndays = cal.monthrange(ty, tm)
        mfirst = date(ty, tm, 1)
        mnext = mfirst + timedelta(days=tndays)
        rev = float(db.scalar(
            select(func.coalesce(func.sum(Booking.total_amount), 0)).where(
                Booking.property_id == prop.id,
                Booking.status == "confirmed",
                Booking.check_in >= mfirst,
                Booking.check_in < mnext,
            )
        ) or 0)
        revenue_trend.append({
            "month": _M_SHORT[tm - 1],
            "month_full": f"{_M_FULL[tm - 1]} {ty}",
            "is_current": ty == today.year and tm == today.month,
            "revenue": rev,
        })

    open_service_requests = db.scalar(select(func.count()).select_from(ServiceRequest).where(
        ServiceRequest.property_id == prop.id,
        ServiceRequest.status.in_(["open", "in_progress"]),
    )) or 0

    return {
        "today": today.isoformat(), "currency": prop.currency,
        "arrivals_today": sum(1 for b in bookings if b.check_in == today),
        "departures_today": sum(1 for b in bookings if b.check_out == today),
        "in_house": sum(1 for b in bookings if b.check_in <= today < b.check_out),
        "pending": db.scalar(select(func.count()).select_from(Booking).where(
            Booking.property_id == prop.id, Booking.status == "pending")),
        "transfers_48h": db.scalar(select(func.count()).select_from(TransferRequest).where(
            TransferRequest.property_id == prop.id, TransferRequest.status != "cancelled",
            TransferRequest.pickup_at.between(now, now + timedelta(hours=48)))),
        "open_handoffs": db.scalar(select(func.count()).select_from(Conversation).where(
            Conversation.property_id == prop.id, Conversation.handoff_requested.is_(True))),
        "open_service_requests": open_service_requests,
        "occupancy": occupancy,
        "revenue_mtd": revenue_mtd,
        "revenue_next30": revenue_next30,
        "revenue_forecast": revenue_forecast,
        "adr_mtd": adr_mtd,
        "revpar_mtd": revpar_mtd,
        "occupancy_pct_mtd": occupancy_pct_mtd,
        "revenue_trend": revenue_trend,
    }


@app.get("/api/admin/{slug}/bookings", dependencies=[admin])
def admin_bookings(status: str | None = None, prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    q = select(Booking).where(Booking.property_id == prop.id)
    if status:
        q = q.where(Booking.status == status)
    rows = db.scalars(q.order_by(Booking.check_in.desc()).limit(500)).all()
    return [{**svc.booking_summary(b), "email": b.email, "phone": b.phone, "source": b.source,
             "created_at": b.created_at.isoformat(), "review_email_sent": b.review_email_sent,
             "pre_arrival_email_sent": b.pre_arrival_email_sent} for b in rows]


class StatusIn(BaseModel):
    status: str


@app.patch("/api/admin/{slug}/bookings/{reference}", dependencies=[admin])
def admin_set_booking(reference: str, body: StatusIn, background_tasks: BackgroundTasks,
                      prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    if body.status not in ("pending", "confirmed", "cancelled"):
        raise HTTPException(400, "Invalid status")
    b = db.scalar(select(Booking).where(Booking.property_id == prop.id, Booking.reference == reference))
    if not b:
        raise HTTPException(404, "Booking not found")
    if b.status == "cancelled" and body.status != "cancelled":
        if svc.units_available(db, b.room_type, b.check_in, b.check_out, exclude_booking_id=b.id) < b.units:
            raise HTTPException(409, "Room no longer available for those dates")
    prev_status = b.status
    b.status = body.status
    db.commit()

    # Notify guest when staff confirm or cancel (but not for pending re-opens)
    if prev_status != body.status and body.status in ("confirmed", "cancelled"):
        bd = _booking_email_data(b)
        pd = _prop_email_data(prop)
        if body.status == "confirmed":
            background_tasks.add_task(em.booking_confirmed, bd, pd)
        else:
            background_tasks.add_task(em.booking_cancelled, bd, pd)

    return svc.booking_summary(b)


@app.get("/api/admin/{slug}/transfers", dependencies=[admin])
def admin_transfers(prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    rows = db.scalars(select(TransferRequest).where(TransferRequest.property_id == prop.id)
                      .order_by(TransferRequest.pickup_at.desc()).limit(500)).all()
    return [{"reference": t.reference, "status": t.status, "route": t.option.route, "vehicle": t.option.vehicle,
             "guest_name": t.guest_name, "phone": t.phone, "pickup_at": t.pickup_at.isoformat(timespec="minutes"),
             "flight_number": t.flight_number, "passengers": t.passengers, "bags": t.bags,
             "price": t.price, "notes": t.notes} for t in rows]


@app.patch("/api/admin/{slug}/transfers/{reference}", dependencies=[admin])
def admin_set_transfer(reference: str, body: StatusIn, prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    if body.status not in ("requested", "confirmed", "cancelled"):
        raise HTTPException(400, "Invalid status")
    t = db.scalar(select(TransferRequest).where(TransferRequest.property_id == prop.id, TransferRequest.reference == reference))
    if not t:
        raise HTTPException(404, "Transfer not found")
    t.status = body.status
    db.commit()
    return {"reference": t.reference, "status": t.status}


@app.get("/api/admin/{slug}/conversations", dependencies=[admin])
def admin_conversations(prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    convs = db.scalars(select(Conversation).where(Conversation.property_id == prop.id)
                       .order_by(Conversation.handoff_requested.desc(), Conversation.last_at.desc()).limit(100)).all()
    out = []
    for c in convs:
        last = c.messages[-1] if c.messages else None
        out.append({"id": c.id, "handoff_requested": c.handoff_requested, "handoff_reason": c.handoff_reason,
                    "messages": len(c.messages), "last_at": c.last_at.isoformat(),
                    "preview": (last.content.replace("**", "")[:120] if last else "")})
    return out


@app.get("/api/admin/{slug}/conversations/{conv_id}", dependencies=[admin])
def admin_conversation(conv_id: str, prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    c = db.get(Conversation, conv_id)
    if not c or c.property_id != prop.id:
        raise HTTPException(404, "Conversation not found")
    return {"id": c.id, "handoff_requested": c.handoff_requested, "handoff_reason": c.handoff_reason,
            "messages": [{"role": m.role, "content": m.content, "tools_used": m.tools_used, "events": m.events or [],
                          "at": m.created_at.isoformat()} for m in c.messages]}


@app.post("/api/admin/{slug}/conversations/{conv_id}/resolve", dependencies=[admin])
def admin_resolve(conv_id: str, prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    c = db.get(Conversation, conv_id)
    if not c or c.property_id != prop.id:
        raise HTTPException(404, "Conversation not found")
    c.handoff_requested = False
    db.commit()
    return {"ok": True}


@app.get("/api/admin/{slug}/rooms", dependencies=[admin])
def admin_rooms(prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    return [{"code": r.code, "name": r.name, "units": r.total_units, "base_rate": r.base_rate}
            for r in db.scalars(select(RoomType).where(RoomType.property_id == prop.id))]


def _promo_out(pc: PromoCode) -> dict:
    return {
        "id": pc.id, "code": pc.code, "description": pc.description,
        "discount_type": pc.discount_type, "discount_value": pc.discount_value,
        "valid_from": pc.valid_from.isoformat() if pc.valid_from else None,
        "valid_to": pc.valid_to.isoformat() if pc.valid_to else None,
        "min_nights": pc.min_nights, "max_uses": pc.max_uses,
        "used_count": pc.used_count, "active": pc.active,
        "created_at": pc.created_at.isoformat(),
    }


class PromoIn(BaseModel):
    code: str = Field(min_length=1, max_length=32)
    description: str = Field(default="", max_length=200)
    discount_type: str = Field(pattern="^(pct|fixed)$")
    discount_value: float = Field(gt=0)
    valid_from: str | None = None
    valid_to: str | None = None
    min_nights: int = Field(1, ge=1)
    max_uses: int | None = None


@app.get("/api/admin/{slug}/promos", dependencies=[admin])
def admin_list_promos(prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    rows = db.scalars(select(PromoCode).where(PromoCode.property_id == prop.id)
                      .order_by(PromoCode.created_at.desc())).all()
    return [_promo_out(p) for p in rows]


@app.post("/api/admin/{slug}/promos", dependencies=[admin])
def admin_create_promo(body: PromoIn, prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    existing = db.scalar(select(PromoCode).where(
        PromoCode.property_id == prop.id,
        func.upper(PromoCode.code) == body.code.strip().upper(),
    ))
    if existing:
        raise HTTPException(400, f"Code '{body.code.strip().upper()}' already exists for this property.")
    pc = PromoCode(
        property_id=prop.id,
        code=body.code.strip().upper(),
        description=body.description.strip(),
        discount_type=body.discount_type,
        discount_value=body.discount_value,
        valid_from=date.fromisoformat(body.valid_from) if body.valid_from else None,
        valid_to=date.fromisoformat(body.valid_to) if body.valid_to else None,
        min_nights=body.min_nights,
        max_uses=body.max_uses,
        active=True,
    )
    db.add(pc)
    db.commit()
    return _promo_out(pc)


@app.patch("/api/admin/{slug}/promos/{code}/toggle", dependencies=[admin])
def admin_toggle_promo(code: str, prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    pc = db.scalar(select(PromoCode).where(
        PromoCode.property_id == prop.id,
        func.upper(PromoCode.code) == code.strip().upper(),
    ))
    if not pc:
        raise HTTPException(404, "Promo code not found")
    pc.active = not pc.active
    db.commit()
    return _promo_out(pc)


# ── Pre-arrival emails ────────────────────────────────────────────────────────

@app.get("/api/admin/{slug}/pre-arrival/pending", dependencies=[admin])
def admin_pre_arrival_pending(prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    today = svc.today_at(prop)
    window_end = today + timedelta(days=2)
    count = db.scalar(select(func.count()).select_from(Booking).where(
        Booking.property_id == prop.id,
        Booking.status == "confirmed",
        Booking.check_in > today,
        Booking.check_in <= window_end,
        Booking.pre_arrival_email_sent.is_(False),
    )) or 0
    return {"pending": count}


@app.post("/api/admin/{slug}/pre-arrival/send", dependencies=[admin])
def admin_send_pre_arrival(prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    today = svc.today_at(prop)
    window_end = today + timedelta(days=2)
    rows = db.scalars(select(Booking).where(
        Booking.property_id == prop.id,
        Booking.status == "confirmed",
        Booking.check_in > today,
        Booking.check_in <= window_end,
        Booking.pre_arrival_email_sent.is_(False),
    )).all()
    pd = _prop_email_data(prop)
    for b in rows:
        em.pre_arrival(_booking_email_data(b), pd)
        b.pre_arrival_email_sent = True
    db.commit()
    return {"sent": len(rows)}


# ── Service requests ──────────────────────────────────────────────────────────

def _sr_out(sr: ServiceRequest) -> dict:
    return {
        "reference": sr.reference, "category": sr.category, "details": sr.details,
        "status": sr.status, "guest_name": sr.guest_name, "session_id": sr.session_id,
        "created_at": sr.created_at.isoformat(), "updated_at": sr.updated_at.isoformat(),
    }


@app.get("/api/admin/{slug}/service-requests", dependencies=[admin])
def admin_service_requests(status: str | None = None, prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    q = select(ServiceRequest).where(ServiceRequest.property_id == prop.id)
    if status:
        q = q.where(ServiceRequest.status == status)
    rows = db.scalars(q.order_by(ServiceRequest.created_at.desc()).limit(200)).all()
    return [_sr_out(sr) for sr in rows]


@app.patch("/api/admin/{slug}/service-requests/{reference}", dependencies=[admin])
def admin_set_service_request(reference: str, body: StatusIn,
                               prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    if body.status not in ("open", "in_progress", "done"):
        raise HTTPException(400, "Invalid status")
    sr = db.scalar(select(ServiceRequest).where(
        ServiceRequest.property_id == prop.id, ServiceRequest.reference == reference))
    if not sr:
        raise HTTPException(404, "Service request not found")
    sr.status = body.status
    db.commit()
    return _sr_out(sr)


# ── Booking calendar ──────────────────────────────────────────────────────────

@app.get("/api/admin/{slug}/calendar", dependencies=[admin])
def admin_calendar(year: int | None = None, month: int | None = None,
                   prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    today = svc.today_at(prop)
    y = year or today.year
    m = month or today.month
    _, ndays = cal.monthrange(y, m)
    first = date(y, m, 1)
    last = date(y, m, ndays)
    total_units = sum(r.total_units for r in prop.room_types)

    bookings = db.scalars(select(Booking).where(
        Booking.property_id == prop.id,
        Booking.status != "cancelled",
        Booking.check_in <= last,
        Booking.check_out > first,
    )).all()

    def _bk(b):
        return {"reference": b.reference, "guest_name": b.guest_name,
                "room": b.room_type.name, "nights": (b.check_out - b.check_in).days,
                "status": b.status}

    days = []
    for i in range(ndays):
        d = date(y, m, i + 1)
        occupied = sum(b.units for b in bookings if b.check_in <= d < b.check_out)
        days.append({
            "date": d.isoformat(),
            "occupied": occupied,
            "arrivals":   [_bk(b) for b in bookings if b.check_in == d],
            "departures": [_bk(b) for b in bookings if b.check_out == d],
            "inhouse":    [_bk(b) for b in bookings if b.check_in < d < b.check_out],
            "occupancy_pct": round(occupied / total_units * 100) if total_units else 0,
        })

    return {"year": y, "month": m, "total_units": total_units, "days": days}


# ── Review email scheduler ────────────────────────────────────────────────────

def _pending_reviews_count(db, prop: Property) -> int:
    today = svc.today_at(prop)
    cutoff = today - timedelta(days=30)
    return db.scalar(select(func.count()).select_from(Booking).where(
        Booking.property_id == prop.id,
        Booking.status == "confirmed",
        Booking.check_out < today,
        Booking.check_out >= cutoff,
        Booking.review_email_sent.is_(False),
    )) or 0


@app.get("/api/admin/{slug}/reviews/pending", dependencies=[admin])
def admin_reviews_pending(prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    return {"pending": _pending_reviews_count(db, prop)}


@app.post("/api/admin/{slug}/reviews/send", dependencies=[admin])
def admin_send_reviews(prop: Property = Depends(get_property), db: Session = Depends(get_db)):
    today = svc.today_at(prop)
    cutoff = today - timedelta(days=30)
    rows = db.scalars(select(Booking).where(
        Booking.property_id == prop.id,
        Booking.status == "confirmed",
        Booking.check_out < today,
        Booking.check_out >= cutoff,
        Booking.review_email_sent.is_(False),
    )).all()
    pd = _prop_email_data(prop)
    for b in rows:
        em.review_request(_booking_email_data(b), pd)
        b.review_email_sent = True
    db.commit()
    return {"sent": len(rows)}
