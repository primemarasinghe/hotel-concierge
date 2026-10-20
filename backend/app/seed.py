"""Load properties from data/properties/<slug>/ into the database (idempotent).

    python -m app.seed               # upsert all properties + reindex knowledge
    python -m app.seed --reset       # drop everything first
    python -m app.seed --demo        # also add sample bookings/transfers for the dashboard

Adding a new hotel/villa = add a folder with property.json + knowledge/*.md and re-run.
"""
import argparse
import json
from datetime import date, datetime, timedelta
from pathlib import Path

from sqlalchemy import delete, select

from . import rag, services as svc
from .db import Base, SessionLocal, engine, init_db
from .models import (Booking, Experience, PromoCode, Property, RoomType,
                     SeasonalRate, ServiceRequest, TransferOption, TransferRequest)

DATA = Path(__file__).resolve().parent.parent / "data" / "properties"


def upsert_property(db, folder: Path) -> Property:
    cfg = json.loads((folder / "property.json").read_text())
    p = cfg["property"]
    prop = db.scalar(select(Property).where(Property.slug == p["slug"])) or Property(slug=p["slug"])
    for k, v in p.items():
        setattr(prop, k, v)
    db.add(prop)
    db.flush()

    # room types: upsert by code so existing bookings keep their FK
    existing = {r.code: r for r in db.scalars(select(RoomType).where(RoomType.property_id == prop.id))}
    for r in cfg["room_types"]:
        rt = existing.get(r["code"]) or RoomType(property_id=prop.id)
        for k, v in r.items():
            setattr(rt, k, v)
        db.add(rt)

    db.execute(delete(SeasonalRate).where(SeasonalRate.property_id == prop.id))
    for s in cfg.get("seasons", []):
        db.add(SeasonalRate(property_id=prop.id, name=s["name"], multiplier=s["multiplier"],
                            min_nights=s.get("min_nights", 1),
                            start_date=date.fromisoformat(s["start_date"]),
                            end_date=date.fromisoformat(s["end_date"])))

    existing_t = {(t.route, t.vehicle): t for t in db.scalars(select(TransferOption).where(TransferOption.property_id == prop.id))}
    for t in cfg.get("transfers", []):
        opt = existing_t.get((t["route"], t["vehicle"])) or TransferOption(property_id=prop.id)
        for k, v in t.items():
            setattr(opt, k, v)
        db.add(opt)

    db.execute(delete(Experience).where(Experience.property_id == prop.id))
    for e in cfg.get("experiences", []):
        db.add(Experience(property_id=prop.id, **e))
    db.commit()
    db.refresh(prop)

    docs = {f.name: f.read_text() for f in sorted((folder / "knowledge").glob("*.md"))}
    n = rag.index_documents(db, prop, docs)
    print(f"  {prop.slug}: {len(cfg['room_types'])} room types, {n} knowledge chunks")
    return prop


def add_demo_activity(db, prop: Property) -> None:
    if db.scalar(select(Booking).where(Booking.property_id == prop.id).limit(1)):
        return
    today = svc.today_at(prop)
    rts = sorted(prop.room_types, key=lambda r: r.base_rate)
    # (name, email, phone, check_in_offset, nights, adults, children, status)
    guests = [("Emma Clarke", "emma@example.com", "+44 7700 900123", 0, 3, 2, 0, "confirmed"),
              ("Rahul Mehta", "rahul@example.com", "+91 98200 00000", 2, 4, 2, 1, "pending"),
              ("Sofia Rossi", "sofia@example.com", "+39 333 000 0000", 6, 3, 2, 0, "pending"),
              ("Kenji Sato", "kenji@example.com", "+81 90 0000 0000", 10, 5, 2, 0, "confirmed")]
    for i, (name, email, phone, offset, nights, ad, ch, status) in enumerate(guests):
        rt = rts[i % len(rts)]
        if ch > rt.max_children:
            ch = 0
        ci = today + timedelta(days=offset)
        q = svc.quote(db, prop, rt, ci, ci + timedelta(days=nights), ad, ch, 1, "BB" if "BB" in prop.meal_plans else "RO")
        db.add(Booking(reference=svc.new_reference(prop.reference_prefix), property_id=prop.id, room_type_id=rt.id,
                       guest_name=name, email=email, phone=phone, check_in=ci, check_out=ci + timedelta(days=nights),
                       adults=ad, children=ch, units=1, meal_plan=q["meal_plan"], total_amount=q["total"],
                       currency=prop.currency, status=status, source="demo"))

    # A completed stay — useful for testing post-stay review email
    rt_past = rts[1]
    ci_past = today - timedelta(days=5)
    q_past = svc.quote(db, prop, rt_past, ci_past, ci_past + timedelta(days=3), 2, 0, 1, "BB" if "BB" in prop.meal_plans else "RO")
    db.add(Booking(reference=svc.new_reference(prop.reference_prefix), property_id=prop.id, room_type_id=rt_past.id,
                   guest_name="Aiko Tanaka", email="aiko@example.com", phone="+81 80 0000 0001",
                   check_in=ci_past, check_out=ci_past + timedelta(days=3),
                   adults=2, children=0, units=1, meal_plan=q_past["meal_plan"], total_amount=q_past["total"],
                   currency=prop.currency, status="confirmed", source="demo", review_email_sent=False))
    # James Wilson — confirmed booking arriving in 2 days (for pre-arrival email testing)
    rt_jw = rts[1]
    ci_jw = today + timedelta(days=2)
    q_jw = svc.quote(db, prop, rt_jw, ci_jw, ci_jw + timedelta(days=3), 2, 0, 1, "BB" if "BB" in prop.meal_plans else "RO")
    db.add(Booking(reference=svc.new_reference(prop.reference_prefix), property_id=prop.id, room_type_id=rt_jw.id,
                   guest_name="James Wilson", email="james@example.com", phone="+44 7700 900999",
                   check_in=ci_jw, check_out=ci_jw + timedelta(days=3),
                   adults=2, children=0, units=1, meal_plan=q_jw["meal_plan"], total_amount=q_jw["total"],
                   currency=prop.currency, status="confirmed", source="demo",
                   pre_arrival_email_sent=False))

    opt = db.scalar(select(TransferOption).where(TransferOption.property_id == prop.id,
                                                 TransferOption.direction == "arrival").order_by(TransferOption.price))
    if opt:
        db.add(TransferRequest(reference=svc.new_reference("TR"), property_id=prop.id, option_id=opt.id,
                               guest_name="Rahul Mehta", phone="+91 98200 00000",
                               pickup_at=datetime.combine(today + timedelta(days=2), datetime.min.time()).replace(hour=9, minute=40),
                               flight_number="UL122", passengers=3, bags=3, price=opt.price))
    db.commit()

    # Demo service requests (Emma Clarke in-house, Kenji Sato in-house on day 10)
    db.add(ServiceRequest(reference=svc.new_reference("SR"), property_id=prop.id,
                          guest_name="Emma Clarke", category="housekeeping",
                          details="Extra towels and pillow requested for room", status="open"))
    db.add(ServiceRequest(reference=svc.new_reference("SR"), property_id=prop.id,
                          guest_name="Kenji Sato", category="late_checkout",
                          details="Requesting late checkout at 1pm on departure day", status="in_progress"))
    db.commit()


def add_demo_promos(db, prop: Property) -> None:
    if db.scalar(select(PromoCode).where(PromoCode.property_id == prop.id).limit(1)):
        return
    promos = [
        PromoCode(property_id=prop.id, code="KANDY10", description="10% off your stay",
                  discount_type="pct", discount_value=10, active=True),
        PromoCode(property_id=prop.id, code="WELCOME2000", description="LKR 2,000 welcome discount",
                  discount_type="fixed", discount_value=2000, active=True),
        PromoCode(property_id=prop.id, code="ESALA25", description="Esala Festival 25% off (3+ nights)",
                  discount_type="pct", discount_value=25, min_nights=3,
                  valid_from=date(2027, 7, 1), valid_to=date(2027, 8, 31), active=True),
    ]
    db.add_all(promos)
    db.commit()
    print(f"  {prop.slug}: {len(promos)} demo promo codes added")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--reset", action="store_true")
    ap.add_argument("--demo", action="store_true")
    args = ap.parse_args()
    if args.reset:
        Base.metadata.drop_all(engine)
    init_db()
    with SessionLocal() as db:
        for folder in sorted(p for p in DATA.iterdir() if (p / "property.json").exists()):
            prop = upsert_property(db, folder)
            if args.demo:
                add_demo_activity(db, prop)
                add_demo_promos(db, prop)
    print("Seed complete.")


if __name__ == "__main__":
    main()
