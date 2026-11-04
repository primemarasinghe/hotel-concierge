"""Run against a real Postgres+pgvector:  DATABASE_URL=... pytest -q
The test DB is reset and re-seeded at the start."""
import json
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage
from sqlalchemy import select

from app import rag, seed, services as svc
from app.agent import ConciergeAgent
from app.config import settings
from app.db import Base, SessionLocal, engine, init_db
from app.models import Booking, Conversation, Property


@pytest.fixture(scope="session", autouse=True)
def seeded():
    Base.metadata.drop_all(engine)
    init_db()
    with SessionLocal() as db:
        for f in sorted(seed.DATA.iterdir()):
            seed.upsert_property(db, f)


@pytest.fixture
def db():
    with SessionLocal() as s:
        yield s


def prop(db, slug="leisureville-sigiriya"):
    return db.scalar(select(Property).where(Property.slug == slug))


def future(p, days):
    return svc.today_at(p) + timedelta(days=days)


def test_quote_math(db):
    p = prop(db)
    rt = svc.room_type_by_code(db, p, "MB")
    # pick a Mon->Wed stay with no season
    ci = future(p, 3)
    while ci.weekday() != 0:
        ci += timedelta(days=1)
    q = svc.quote(db, p, rt, ci, ci + timedelta(days=2), adults=2, meal_plan="RO")
    sub = 2 * 10000                      # 2 nights at LKR 10,000, RO (no meal add-on)
    assert q["subtotal"] == sub
    assert q["total"] == round(sub * 1.10 * 1.18, 2)


def test_season_takes_correct_multiplier_and_min_nights(db):
    p = prop(db)
    rt = svc.room_type_by_code(db, p, "MB")
    from datetime import date
    # Festive Peak (Dec 20–Jan 7) has min_nights=2; a 1-night stay must be rejected
    with pytest.raises(svc.BookingError, match="minimum stay of 2"):
        svc.quote(db, p, rt, date(2026, 12, 24), date(2026, 12, 25), 2)
    q = svc.quote(db, p, rt, date(2026, 12, 24), date(2026, 12, 26), 2)
    assert all(n["season"] == "Festive Peak" for n in q["nightly"])
    assert q["nightly"][0]["room"] == round(10000 * 1.3, 2)


def test_booking_reduces_availability_and_blocks_overbooking(db):
    p = prop(db)
    ci, co = future(p, 40), future(p, 42)
    rt = svc.room_type_by_code(db, p, "MB")        # single unit
    assert svc.units_available(db, rt, ci, co) == 1
    b = svc.create_booking(db, p, room_type_code="MB", check_in=ci, check_out=co, adults=2,
                           guest_name="Test Guest", email="T@Example.com", phone="+94770000000")
    assert b.status == "pending" and b.reference.startswith("LV-") and b.email == "t@example.com"
    assert svc.units_available(db, rt, ci, co) == 0
    with pytest.raises(svc.BookingError, match="no longer available"):
        svc.create_booking(db, p, room_type_code="MB", check_in=future(p, 41), check_out=future(p, 43),
                           adults=2, guest_name="X", email="x@x.com", phone="+94770000001")
    # back-to-back stay is fine (checkout day is free)
    svc.create_booking(db, p, room_type_code="MB", check_in=co, check_out=future(p, 44), adults=1,
                       guest_name="Next Guest", email="n@x.com", phone="+94770000002")


def test_occupancy_and_children_rules(db):
    p = prop(db)
    # MB max_adults=2; booking with 3 adults must be rejected
    with pytest.raises(svc.BookingError, match="sleeps"):
        svc.create_booking(db, p, room_type_code="MB", check_in=future(p, 50), check_out=future(p, 51),
                           adults=3, children=0, guest_name="A", email="a@a.com", phone="+94770000003")
    # 3 adults + 2 children: MB needs 2 units (only 1 available), BR2 fits in 1 unit
    res = svc.search_availability(db, p, future(p, 50), future(p, 52), adults=3, children=2)
    by = {r["room_type"]: r for r in res}
    assert by["MB"]["available"] is False and by["MB"]["units_needed"] == 2
    assert by["BR2"]["available"] and by["BR2"]["units_needed"] == 1


def test_past_dates_rejected(db):
    p = prop(db)
    with pytest.raises(svc.BookingError, match="past"):
        svc.search_availability(db, p, future(p, -1), future(p, 1), 2)


def test_modify_and_cancel(db):
    p = prop(db)
    b = svc.create_booking(db, p, room_type_code="BR2", check_in=future(p, 20), check_out=future(p, 22),
                           adults=2, guest_name="Mod Guest", email="mod@x.com", phone="+94770000004")
    with pytest.raises(svc.BookingError):
        svc.find_booking(db, p, b.reference, "wrong@x.com")
    found = svc.find_booking(db, p, b.reference.lower(), "MOD@x.com")
    old_total = found.total_amount
    svc.modify_booking(db, p, found, check_out=future(p, 23), meal_plan="RO")
    assert found.total_amount > old_total and found.meal_plan == "RO"
    res = svc.cancel_booking(db, p, found)
    assert res["status"] == "cancelled" and res["free_cancellation"] is True


def test_transfer_rules(db):
    p = prop(db)
    car = next(o for o in svc.transfer_options(db, p, "arrival") if o.vehicle == "Sedan car")
    soon = svc.now_at(p) + timedelta(hours=2)
    with pytest.raises(svc.BookingError, match="12 hours"):
        svc.request_transfer(db, p, option_id=car.id, guest_name="A", phone="1234567", pickup_at=soon, passengers=2)
    with pytest.raises(svc.BookingError, match="larger vehicle"):
        svc.request_transfer(db, p, option_id=car.id, guest_name="A", phone="1234567",
                             pickup_at=soon + timedelta(days=3), passengers=5)
    tr = svc.request_transfer(db, p, option_id=car.id, guest_name="A", phone="1234567",
                              pickup_at=soon + timedelta(days=3), passengers=2, flight_number="ul 504")
    assert tr.reference.startswith("TR-") and tr.flight_number == "UL 504" and tr.price == 25000


def test_experiences_and_rag(db):
    p = prop(db)
    recs = svc.recommend_experiences(db, p, ["hiking", "nature"], with_children=False)
    assert recs[0]["name"] == "Ayurveda herbal garden walk"
    # Pidurangala (not family-friendly) must not appear when with_children=True
    recs = svc.recommend_experiences(db, p, ["hiking"], with_children=True)
    assert all(r["name"] != "Pidurangala Rock sunrise hike" for r in recs)
    hits = rag.search(db, p, "are pets allowed")
    assert any("pets" in h["content"].lower() for h in hits[:2])


def test_agent_requires_confirmation(db):
    p = prop(db)
    conv = Conversation(id="test-confirm-1234", property_id=p.id)
    db.add(conv); db.commit()
    agent = ConciergeAgent(db, p, conv)
    tools = {t.name: t for t in agent.tools()}
    args = dict(room_type_code="MB", check_in=str(future(p, 60)), check_out=str(future(p, 62)),
                adults=2, guest_name="Agent Guest", email="ag@x.com", phone="+94770000005")
    out = json.loads(tools["create_reservation"].invoke({**args, "guest_confirmed": False}))
    assert "Not executed" in out["error"]
    out = json.loads(tools["create_reservation"].invoke({**args, "guest_confirmed": True}))
    assert out["status"] == "pending" and agent.events[0]["type"] == "booking_created"
    bad = json.loads(tools["check_availability"].invoke({"check_in": "2020-01-01", "check_out": "2020-01-03", "adults": 2}))
    assert "past" in bad["error"]


class ScriptedLLM:
    """Stands in for ChatOpenAI: replays tool calls, then a final answer."""
    def __init__(self, *a, **k):
        self.turns = [
            AIMessage("", tool_calls=[{"id": "c1", "name": "check_availability",
                                       "args": {"check_in": ScriptedLLM.ci, "check_out": ScriptedLLM.co, "adults": 2}}]),
            AIMessage("We have the Master Bedroom available."),
        ]
        self.seen = []

    def bind_tools(self, tools):
        return self

    def invoke(self, messages):
        self.seen.append(messages)
        return self.turns.pop(0)


def test_chat_endpoint_end_to_end(monkeypatch):
    from app import main
    with SessionLocal() as db:
        p = prop(db)
        ScriptedLLM.ci, ScriptedLLM.co = str(future(p, 30)), str(future(p, 32))
    monkeypatch.setattr("langchain_openai.ChatOpenAI", ScriptedLLM)
    monkeypatch.setattr(settings, "openai_api_key", "sk-test")
    client = TestClient(main.app)

    r = client.post("/api/properties/leisureville-sigiriya/chat", json={"session_id": "e2e-session-0001", "message": "Room for 2?"})
    assert r.status_code == 200, r.text
    assert "Master" in r.json()["reply"]
    hist = client.get("/api/properties/leisureville-sigiriya/chat/e2e-session-0001").json()["messages"]
    assert [m["role"] for m in hist] == ["user", "assistant"]

    assert client.get("/api/admin/leisureville-sigiriya/summary").status_code == 401
    h = {"X-Admin-Token": settings.admin_token}
    s = client.get("/api/admin/leisureville-sigiriya/summary", headers=h).json()
    assert len(s["occupancy"]) == 14
    convs = client.get("/api/admin/leisureville-sigiriya/conversations", headers=h).json()
    assert any(c["id"] == "e2e-session-0001" for c in convs)
    detail = client.get("/api/admin/leisureville-sigiriya/conversations/e2e-session-0001", headers=h).json()
    assert "check_availability" in detail["messages"][1]["tools_used"]
    bookings = client.get("/api/admin/leisureville-sigiriya/bookings?status=pending", headers=h).json()
    ref = bookings[0]["reference"]
    assert client.patch(f"/api/admin/leisureville-sigiriya/bookings/{ref}", json={"status": "confirmed"}, headers=h).json()["status"] == "confirmed"
