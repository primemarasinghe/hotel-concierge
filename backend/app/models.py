from datetime import date, datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (JSON, Boolean, Date, DateTime, Float, ForeignKey,
                        Integer, String, Text, func)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .config import settings
from .db import Base


class Property(Base):
    """One tenant: a hotel, villa, guesthouse, resort or apartment block."""
    __tablename__ = "properties"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(32))  # hotel | villa | guesthouse | resort | apartment
    location: Mapped[str] = mapped_column(String(200))
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Colombo")
    check_in_time: Mapped[str] = mapped_column(String(10), default="14:00")
    check_out_time: Mapped[str] = mapped_column(String(10), default="11:00")
    tax_pct: Mapped[float] = mapped_column(Float, default=0)
    service_charge_pct: Mapped[float] = mapped_column(Float, default=0)
    weekend_uplift_pct: Mapped[float] = mapped_column(Float, default=0)
    weekend_days: Mapped[list] = mapped_column(JSON, default=lambda: [4, 5])  # Mon=0 … Fri=4, Sat=5
    meal_plans: Mapped[dict] = mapped_column(JSON, default=dict)  # {"RO": 0, "BB": 12} per person per night
    contact: Mapped[dict] = mapped_column(JSON, default=dict)
    assistant_name: Mapped[str] = mapped_column(String(64), default="Concierge")
    tone: Mapped[str] = mapped_column(String(200), default="warm, concise and professional")
    reference_prefix: Mapped[str] = mapped_column(String(6), default="BK")
    free_cancellation_days: Mapped[int] = mapped_column(Integer, default=7)
    max_stay_nights: Mapped[int] = mapped_column(Integer, default=30)

    room_types: Mapped[list["RoomType"]] = relationship(back_populates="property")


class RoomType(Base):
    __tablename__ = "room_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id"), index=True)
    code: Mapped[str] = mapped_column(String(32))
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text)
    max_adults: Mapped[int] = mapped_column(Integer)
    max_children: Mapped[int] = mapped_column(Integer, default=0)
    beds: Mapped[str] = mapped_column(String(120))
    size_sqm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    amenities: Mapped[list] = mapped_column(JSON, default=list)
    base_rate: Mapped[float] = mapped_column(Float)  # per unit per night, before season/weekend
    total_units: Mapped[int] = mapped_column(Integer)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    property: Mapped[Property] = relationship(back_populates="room_types")


class SeasonalRate(Base):
    __tablename__ = "seasonal_rates"

    id: Mapped[int] = mapped_column(primary_key=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)  # inclusive
    multiplier: Mapped[float] = mapped_column(Float, default=1.0)
    min_nights: Mapped[int] = mapped_column(Integer, default=1)


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id"), index=True)
    room_type_id: Mapped[int] = mapped_column(ForeignKey("room_types.id"))
    guest_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(200))
    phone: Mapped[str] = mapped_column(String(40))
    check_in: Mapped[date] = mapped_column(Date, index=True)
    check_out: Mapped[date] = mapped_column(Date, index=True)
    adults: Mapped[int] = mapped_column(Integer)
    children: Mapped[int] = mapped_column(Integer, default=0)
    units: Mapped[int] = mapped_column(Integer, default=1)
    meal_plan: Mapped[str] = mapped_column(String(8), default="RO")
    total_amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3))
    status: Mapped[str] = mapped_column(String(16), default="pending")  # pending|confirmed|cancelled
    special_requests: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(String(16), default="chat")
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    room_type: Mapped[RoomType] = relationship()


class TransferOption(Base):
    __tablename__ = "transfer_options"

    id: Mapped[int] = mapped_column(primary_key=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id"), index=True)
    route: Mapped[str] = mapped_column(String(120))   # e.g. "BIA Airport (CMB) → Property"
    direction: Mapped[str] = mapped_column(String(16))  # arrival | departure
    vehicle: Mapped[str] = mapped_column(String(40))
    max_pax: Mapped[int] = mapped_column(Integer)
    max_bags: Mapped[int] = mapped_column(Integer)
    price: Mapped[float] = mapped_column(Float)
    duration_min: Mapped[int] = mapped_column(Integer)


class TransferRequest(Base):
    __tablename__ = "transfer_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id"), index=True)
    booking_id: Mapped[int | None] = mapped_column(ForeignKey("bookings.id"), nullable=True)
    option_id: Mapped[int] = mapped_column(ForeignKey("transfer_options.id"))
    guest_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(40))
    pickup_at: Mapped[datetime] = mapped_column(DateTime)  # property-local time
    flight_number: Mapped[str] = mapped_column(String(20), default="")
    passengers: Mapped[int] = mapped_column(Integer)
    bags: Mapped[int] = mapped_column(Integer, default=0)
    price: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(16), default="requested")  # requested|confirmed|cancelled
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    option: Mapped[TransferOption] = relationship()


class Experience(Base):
    __tablename__ = "experiences"

    id: Mapped[int] = mapped_column(primary_key=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(40))
    description: Mapped[str] = mapped_column(Text)
    duration: Mapped[str] = mapped_column(String(40))
    price: Mapped[float | None] = mapped_column(Float, nullable=True)  # per person; None = free / on request
    tags: Mapped[list] = mapped_column(JSON, default=list)
    family_friendly: Mapped[bool] = mapped_column(Boolean, default=True)


class KnowledgeChunk(Base):
    """Embedded FAQ / policy text used for RAG answers."""
    __tablename__ = "knowledge_chunks"

    id: Mapped[int] = mapped_column(primary_key=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id"), index=True)
    source: Mapped[str] = mapped_column(String(120))
    content: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float]] = mapped_column(Vector(settings.embedding_dim))


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # session id from the widget
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id"), index=True)
    handoff_requested: Mapped[bool] = mapped_column(Boolean, default=False)
    handoff_reason: Mapped[str] = mapped_column(Text, default="")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    messages: Mapped[list["Message"]] = relationship(order_by="Message.id", back_populates="conversation")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id"), index=True)
    role: Mapped[str] = mapped_column(String(16))  # user | assistant
    content: Mapped[str] = mapped_column(Text)
    tools_used: Mapped[list] = mapped_column(JSON, default=list)
    events: Mapped[list] = mapped_column(JSON, default=list)  # booking/transfer cards shown in the widget
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    conversation: Mapped[Conversation] = relationship(back_populates="messages")
