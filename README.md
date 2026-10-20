# AI Hotel Concierge & Booking Agent

A multi-property AI concierge for hotels, villas, guesthouses, boutique resorts and holiday apartments. Guests chat through an embeddable web widget; staff manage everything from a dashboard.

**The agent can:** answer room and policy questions (RAG over each property's docs) · check live availability · quote rates (seasons, weekends, meal plans, service charge, tax) · create, look up, modify and cancel reservations · arrange airport transfers · recommend experiences · validate promo/discount codes · log in-stay service requests · hand off to a human.

**Stack:** React (Vite) · FastAPI · LangChain tool-calling agent · OpenAI (chat + embeddings) · PostgreSQL + pgvector · Docker Compose.

## Quick start (Docker)

```bash
cp .env.example .env          # add OPENAI_API_KEY, change ADMIN_TOKEN
docker compose run --rm backend python -m app.seed --reset --demo
docker compose up
```

- Guest demo site with widget: http://localhost:8080
- Staff dashboard: http://localhost:8080/admin (token = `ADMIN_TOKEN`)
- API docs: http://localhost:8000/docs

One property is seeded: **Kandy Hills Boutique Hotel** (LKR, 4 room types — Deluxe Garden, Superior Lake View, Family Suite, Heritage Suite) plus sample bookings, service requests, and promo codes so the dashboard isn't empty.

## Local development (Mac, no Docker for app code)

```bash
docker compose up -d db                      # just Postgres + pgvector
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed --reset --demo
uvicorn app.main:app --reload                # :8000

cd ../frontend && npm install && npm run dev # :5173, proxies /api to :8000
```

Without `OPENAI_API_KEY` the seed falls back to a deterministic offline embedder, and `/chat` returns 503. Everything else (dashboard, tests) works.

## How it works

```
Widget (React / SSE streaming)
   │  POST /api/properties/{slug}/chat/stream  {session_id, message, lang}
   ▼
FastAPI ── ConciergeAgent (LangChain, tools bound to ONE property)
              │ list_room_types        search_knowledge  ──► pgvector
              │ check_availability     get_quote
              │ create/lookup/modify/cancel_reservation
              │ validate_promo_code    log_service_request
              │ list_transfer_options  book_transfer
              │ recommend_experiences  request_human
              ▼
          services.py  (pure Python: availability, pricing, locking)
              ▼
          PostgreSQL
```

Design decisions worth knowing:

- **The LLM never calculates a price or decides availability.** It only relays what `services.py` returns, so it can't hallucinate a rate or a free room.
- **Write actions need explicit consent.** Booking, modifying, cancelling, and transfers require `guest_confirmed=true`; the tool refuses otherwise.
- **No overbooking.** Reservations lock the room-type row (`SELECT … FOR UPDATE`) and re-check inventory inside the transaction.
- **Identity check.** Viewing or changing a booking needs reference **and** the email on it.
- **New bookings are `pending`.** Staff confirm in the dashboard. The agent never accepts card details.
- **Tenant isolation.** Every request is scoped to one property; knowledge search and all DB queries filter by `property_id`.
- **Promo codes.** Discounts (percentage or fixed LKR) are applied to the subtotal before service charge and tax, validated for expiry, usage limits, and minimum nights.
- **Service requests.** The agent logs in-stay requests (housekeeping, room service, maintenance, late checkout, etc.) immediately without asking the guest to confirm first.

## Admin dashboard tabs

| Tab | What it shows |
|---|---|
| **Today (Overview)** | Arrivals / departures / in-house count today · Pending bookings · Revenue MTD · ADR · RevPAR · Occupancy % · 6-month revenue trend chart · Open service requests badge |
| **Bookings** | All bookings with status filter · Confirm / cancel actions · Pre-arrival email send button · Review email indicator |
| **Transfers** | Airport transfer requests · Confirm / cancel |
| **Conversations** | Chat transcripts with handoff flag · Mark resolved |
| **Promo Codes** | Create percentage or fixed-amount codes · Set expiry, min nights, max uses · Pause / activate |
| **Requests** | In-stay service requests from guests · Filter by open / in progress / done · Update status |
| **Calendar** | Month grid with per-day occupancy fill bars and arrival counts · Click any day for a detail panel listing arrivals, in-house, and departures |

## Automated emails

Two background tasks run on startup (every hour):

- **Pre-arrival email** — sent to confirmed guests arriving in the next 1–2 days (check-in details, welcome message)
- **Post-stay review request** — sent to confirmed guests who checked out in the last 30 days (links to the property's Google review page)

Both can also be triggered manually from the admin dashboard.

## Adding a property

Create `backend/data/properties/<slug>/`:

```
property.json        # property settings, room_types, seasons, transfers, experiences
knowledge/*.md       # FAQs, policies, facilities — split on headings and embedded
```

Then `python -m app.seed` (or restart the backend container). Seeding is idempotent: room types and transfers upsert by code/route so existing bookings keep working.

Key `property.json` settings: `kind` (hotel / villa / guesthouse / …), `currency`, `tax_pct`, `service_charge_pct`, `weekend_uplift_pct`, `meal_plans`, `free_cancellation_days`, `assistant_name`, `tone`, `contact.accent` (widget colour), `contact.review_url` (post-stay review link). Overlapping seasons take the higher multiplier, and a season's `min_nights` is enforced.

## Embedding on a hotel website

```html
<script src="https://YOUR-HOST/embed.js" data-property="kandy-hills" data-accent="#2f5d3a" defer></script>
```

Set `CORS_ORIGINS` to the hotel's domain in production.

## Tests

```bash
cd backend && DATABASE_URL=postgresql+psycopg://hotel:hotel@localhost:5432/hotel_test pytest -q
```

Tests reset the target database, so point them at a separate one. They cover pricing maths, seasons and min-stay, overbooking, occupancy rules, modify/cancel, transfer validation, recommendations, RAG tenant isolation, the confirmation guard, and the chat + admin API end to end (with a scripted LLM).

## What's next

See [NEXT.md](NEXT.md) for the full backlog — deferred external-API features (WhatsApp, PayHere, OTA sync), high-priority items with no external dependency (proper auth, room/rate editor, knowledge doc editor, guest profiles), and medium/future items.
