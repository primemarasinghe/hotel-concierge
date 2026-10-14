"""Business logic: availability, pricing, reservations, transfers, experiences.

Everything here is deterministic and LLM-free, so the agent can never invent a
price or a free room — it can only report what these functions return.
"""
import secrets
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import (Booking, Experience, Property, RoomType, SeasonalRate,
                     TransferOption, TransferRequest)

REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I
CHILD_MEAL_FACTOR = 0.5


class BookingError(ValueError):
    """Raised for anything the guest can fix (bad dates, no availability…)."""


# ---------- helpers ----------

def today_at(prop: Property) -> date:
    return datetime.now(ZoneInfo(prop.timezone)).date()


def now_at(prop: Property) -> datetime:
    return datetime.now(ZoneInfo(prop.timezone)).replace(tzinfo=None)


def new_reference(prefix: str) -> str:
    return f"{prefix}-" + "".join(secrets.choice(REF_ALPHABET) for _ in range(6))


def stay_nights(check_in: date, check_out: date) -> list[date]:
    return [check_in + timedelta(days=i) for i in range((check_out - check_in).days)]


def validate_stay(prop: Property, check_in: date, check_out: date) -> None:
    if check_in < today_at(prop):
        raise BookingError("Check-in date is in the past.")
    if check_out <= check_in:
        raise BookingError("Check-out must be after check-in.")
    if (check_out - check_in).days > prop.max_stay_nights:
        raise BookingError(f"Online bookings are limited to {prop.max_stay_nights} nights; staff can arrange longer stays.")


def validate_occupancy(rt: RoomType, adults: int, children: int, units: int) -> None:
    if adults < 1 or units < 1 or children < 0:
        raise BookingError("At least one adult and one room/unit are required.")
    if adults > rt.max_adults * units or children > rt.max_children * units:
        raise BookingError(
            f"{rt.name} sleeps {rt.max_adults} adults + {rt.max_children} children per unit; "
            f"{units} unit(s) can't fit {adults} adults and {children} children."
        )


def room_type_by_code(db: Session, prop: Property, code: str) -> RoomType:
    rt = db.scalar(select(RoomType).where(RoomType.property_id == prop.id,
                                          func.lower(RoomType.code) == code.strip().lower()))
    if not rt:
        codes = ", ".join(r.code for r in prop.room_types)
        raise BookingError(f"Unknown room type '{code}'. Valid codes: {codes}.")
    return rt


# ---------- availability & pricing ----------

def units_available(db: Session, rt: RoomType, check_in: date, check_out: date,
                    exclude_booking_id: int | None = None) -> int:
    q = select(Booking).where(
        Booking.room_type_id == rt.id,
        Booking.status != "cancelled",
        Booking.check_in < check_out,
        Booking.check_out > check_in,
    )
    if exclude_booking_id:
        q = q.where(Booking.id != exclude_booking_id)
    overlapping = db.scalars(q).all()
    free = rt.total_units
    for night in stay_nights(check_in, check_out):
        used = sum(b.units for b in overlapping if b.check_in <= night < b.check_out)
        free = min(free, rt.total_units - used)
    return max(free, 0)


def quote(db: Session, prop: Property, rt: RoomType, check_in: date, check_out: date,
          adults: int, children: int = 0, units: int = 1, meal_plan: str = "RO") -> dict:
    meal_plan = (meal_plan or "RO").upper()
    if meal_plan not in (prop.meal_plans or {"RO": 0}):
        raise BookingError(f"Meal plan '{meal_plan}' not offered. Options: {', '.join(prop.meal_plans)}.")
    meal_pp = prop.meal_plans.get(meal_plan, 0)
    seasons = db.scalars(select(SeasonalRate).where(SeasonalRate.property_id == prop.id)).all()

    nightly, min_nights_required = [], 1
    for night in stay_nights(check_in, check_out):
        # overlapping seasons (e.g. "High season" + "Christmas peak"): the higher multiplier wins
        season = max((s for s in seasons if s.start_date <= night <= s.end_date),
                     key=lambda s: s.multiplier, default=None)
        mult = season.multiplier if season else 1.0
        if season:
            min_nights_required = max(min_nights_required, season.min_nights)
        weekend = night.weekday() in (prop.weekend_days or [])
        room = rt.base_rate * mult * (1 + (prop.weekend_uplift_pct / 100 if weekend else 0)) * units
        meals = meal_pp * (adults + children * CHILD_MEAL_FACTOR)
        nightly.append({"date": night.isoformat(), "season": season.name if season else "Standard",
                        "weekend": weekend, "room": round(room, 2), "meals": round(meals, 2)})

    n = len(nightly)
    if n < min_nights_required:
        raise BookingError(f"A minimum stay of {min_nights_required} nights applies for these dates.")
    subtotal = sum(x["room"] + x["meals"] for x in nightly)
    service = subtotal * prop.service_charge_pct / 100
    tax = (subtotal + service) * prop.tax_pct / 100
    return {
        "room_type": rt.code, "room_name": rt.name, "nights": n, "units": units,
        "meal_plan": meal_plan, "currency": prop.currency,
        "nightly": nightly,
        "subtotal": round(subtotal, 2), "service_charge": round(service, 2),
        "taxes": round(tax, 2), "total": round(subtotal + service + tax, 2),
        "avg_per_night": round((subtotal + service + tax) / n, 2),
    }


def units_needed(rt: RoomType, adults: int, children: int) -> int | None:
    """Smallest number of units of this type that fits the party (None = can't fit)."""
    need = -(-adults // rt.max_adults)
    if children:
        if not rt.max_children:
            return None
        need = max(need, -(-children // rt.max_children))
    return need


def search_availability(db: Session, prop: Property, check_in: date, check_out: date,
                        adults: int, children: int = 0, meal_plan: str = "RO") -> list[dict]:
    validate_stay(prop, check_in, check_out)
    results = []
    for rt in sorted(prop.room_types, key=lambda r: r.base_rate):
        free = units_available(db, rt, check_in, check_out)
        needed = units_needed(rt, adults, children)
        row = {"room_type": rt.code, "name": rt.name, "units_free": free, "units_needed": needed,
               "sleeps": f"{rt.max_adults} adults + {rt.max_children} children per unit",
               "image_url": rt.image_url}
        if needed is None:
            row.update(available=False, reason="Does not accommodate children.")
        elif needed > free:
            row["available"] = False
        else:
            try:
                q = quote(db, prop, rt, check_in, check_out, adults, children, needed, meal_plan)
                row.update(available=True, total=q["total"], avg_per_night=q["avg_per_night"],
                           currency=q["currency"])
            except BookingError as e:
                row.update(available=False, reason=str(e))
        results.append(row)
    return results


# ---------- reservations ----------

def create_booking(db: Session, prop: Property, *, room_type_code: str, check_in: date, check_out: date,
                   adults: int, guest_name: str, children: int = 0, units: int = 1, meal_plan: str = "RO",
                   email: str, phone: str, special_requests: str = "", session_id: str | None = None,
                   source: str = "chat") -> Booking:
    validate_stay(prop, check_in, check_out)
    rt = room_type_by_code(db, prop, room_type_code)
    validate_occupancy(rt, adults, children, units)
    import re as _re
    if not guest_name.strip() or not _re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email.strip()) or len(phone.strip()) < 6:
        raise BookingError("Full name, a valid email address and a phone number are required.")

    try:
        # lock the room type row so two simultaneous bookings can't take the last unit
        db.execute(select(RoomType).where(RoomType.id == rt.id).with_for_update())
        if units_available(db, rt, check_in, check_out) < units:
            raise BookingError(f"Sorry, {rt.name} is no longer available for those dates.")
        q = quote(db, prop, rt, check_in, check_out, adults, children, units, meal_plan)
    except BookingError:
        db.rollback()
        raise
    booking = Booking(
        reference=new_reference(prop.reference_prefix), property_id=prop.id, room_type_id=rt.id,
        guest_name=guest_name.strip(), email=email.strip().lower(), phone=phone.strip(),
        check_in=check_in, check_out=check_out, adults=adults, children=children, units=units,
        meal_plan=q["meal_plan"], total_amount=q["total"], currency=prop.currency,
        status="pending", special_requests=special_requests.strip(), source=source, session_id=session_id,
    )
    db.add(booking)
    db.commit()
    return booking


def find_booking(db: Session, prop: Property, reference: str, email: str) -> Booking:
    b = db.scalar(select(Booking).where(Booking.property_id == prop.id,
                                        func.upper(Booking.reference) == reference.strip().upper()))
    if not b or b.email != email.strip().lower():
        raise BookingError("No booking matches that reference and email.")
    return b


def booking_summary(b: Booking) -> dict:
    return {
        "reference": b.reference, "status": b.status, "room": b.room_type.name,
        "room_type": b.room_type.code, "guest_name": b.guest_name,
        "check_in": b.check_in.isoformat(), "check_out": b.check_out.isoformat(),
        "nights": (b.check_out - b.check_in).days, "adults": b.adults, "children": b.children,
        "units": b.units, "meal_plan": b.meal_plan, "total": b.total_amount, "currency": b.currency,
        "special_requests": b.special_requests,
    }


def modify_booking(db: Session, prop: Property, b: Booking, *, check_in: date | None = None,
                   check_out: date | None = None, adults: int | None = None, children: int | None = None,
                   meal_plan: str | None = None, special_requests: str | None = None) -> Booking:
    if b.status == "cancelled":
        raise BookingError("This booking is cancelled and can't be changed.")
    if b.check_in <= today_at(prop):
        raise BookingError("Stays that have started can only be changed by the front desk.")
    ci, co = check_in or b.check_in, check_out or b.check_out
    ad = adults if adults is not None else b.adults
    ch = children if children is not None else b.children
    mp = meal_plan or b.meal_plan
    validate_stay(prop, ci, co)
    validate_occupancy(b.room_type, ad, ch, b.units)

    try:
        db.execute(select(RoomType).where(RoomType.id == b.room_type_id).with_for_update())
        if units_available(db, b.room_type, ci, co, exclude_booking_id=b.id) < b.units:
            raise BookingError("The room isn't available for the new dates.")
        q = quote(db, prop, b.room_type, ci, co, ad, ch, b.units, mp)
    except BookingError:
        db.rollback()
        raise
    b.check_in, b.check_out, b.adults, b.children = ci, co, ad, ch
    b.meal_plan, b.total_amount = q["meal_plan"], q["total"]
    if special_requests is not None:
        b.special_requests = special_requests.strip()
    db.commit()
    return b


def cancel_booking(db: Session, prop: Property, b: Booking) -> dict:
    if b.status == "cancelled":
        raise BookingError("This booking is already cancelled.")
    days_before = (b.check_in - today_at(prop)).days
    free = days_before >= prop.free_cancellation_days
    b.status = "cancelled"
    db.commit()
    return {"reference": b.reference, "status": "cancelled", "free_cancellation": free,
            "note": "No charge." if free else
            f"Cancelled within {prop.free_cancellation_days} days of arrival; "
            "the cancellation policy may apply — the reservations team will confirm any charge."}


# ---------- transfers ----------

def transfer_options(db: Session, prop: Property, direction: str | None = None) -> list[TransferOption]:
    q = select(TransferOption).where(TransferOption.property_id == prop.id)
    if direction:
        q = q.where(TransferOption.direction == direction)
    return db.scalars(q.order_by(TransferOption.price)).all()


def request_transfer(db: Session, prop: Property, *, option_id: int, guest_name: str, phone: str,
                     pickup_at: datetime, passengers: int, bags: int = 0, flight_number: str = "",
                     booking_reference: str | None = None, notes: str = "") -> TransferRequest:
    opt = db.get(TransferOption, option_id)
    if not opt or opt.property_id != prop.id:
        raise BookingError("Unknown transfer option.")
    if passengers > opt.max_pax or bags > opt.max_bags:
        raise BookingError(f"{opt.vehicle} takes up to {opt.max_pax} passengers and {opt.max_bags} bags; choose a larger vehicle.")
    if pickup_at < now_at(prop) + timedelta(hours=12):
        raise BookingError("Transfers need at least 12 hours' notice; for sooner pickups please call the front desk.")
    booking_id = None
    if booking_reference:
        b = db.scalar(select(Booking).where(Booking.property_id == prop.id,
                                            func.upper(Booking.reference) == booking_reference.strip().upper()))
        booking_id = b.id if b else None
    tr = TransferRequest(reference=new_reference("TR"), property_id=prop.id, booking_id=booking_id,
                         option_id=opt.id, guest_name=guest_name.strip(), phone=phone.strip(),
                         pickup_at=pickup_at, flight_number=flight_number.strip().upper(),
                         passengers=passengers, bags=bags, price=opt.price, notes=notes.strip())
    db.add(tr)
    db.commit()
    return tr


# ---------- experiences ----------

def recommend_experiences(db: Session, prop: Property, interests: list[str] | None = None,
                          with_children: bool = False, max_price: float | None = None,
                          limit: int = 5) -> list[dict]:
    words = {w.lower() for i in (interests or []) for w in i.split()}
    scored = []
    for e in db.scalars(select(Experience).where(Experience.property_id == prop.id)):
        if with_children and not e.family_friendly:
            continue
        if max_price is not None and e.price and e.price > max_price:
            continue
        hay = {t.lower() for t in e.tags} | {e.category.lower()} | set(e.name.lower().split())
        scored.append((len(words & hay), e))
    scored.sort(key=lambda x: (-x[0], x[1].price or 0))
    return [{"name": e.name, "category": e.category, "description": e.description,
             "duration": e.duration, "price_per_person": e.price, "currency": prop.currency,
             "family_friendly": e.family_friendly} for _, e in scored[:limit]]
