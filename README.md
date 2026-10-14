# AI Hotel Concierge & Booking Agent

A multi-property AI concierge for hotels, villas, guesthouses, boutique resorts and holiday apartments. Guests chat through an embeddable web widget; staff manage everything from a dashboard.

**The agent can:** answer room and policy questions (RAG over each property's docs) · check live availability · quote rates (seasons, weekends, meal plans, service charge, tax) · create, look up, modify and cancel reservations · arrange airport transfers · recommend experiences · hand off to a human.

**Stack:** React (Vite) · FastAPI · LangChain tool-calling agent · OpenAI (chat + embeddings) · PostgreSQL + pgvector · Docker Compose.

## Quick start (Docker)

```bash
cp .env.example .env          # add OPENAI_API_KEY, change ADMIN_TOKEN
docker compose up --build
```

- Guest demo site with widget: http://localhost:8080
- Staff dashboard: http://localhost:8080/admin (token = `ADMIN_TOKEN`)
- API docs: http://localhost:8000/docs

Two demo properties are seeded: **Kandy Hills Boutique Hotel** (USD, 4 room types) and **Mirissa Palm Villa** (LKR, whole villa + cabanas), plus sample bookings so the dashboard isn't empty.

## Local development (Mac, no Docker for app code)

```bash
docker compose up -d db                      # just Postgres + pgvector
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed --demo
uvicorn app.main:app --reload                # :8000

cd ../frontend && npm install && npm run dev # :5173, proxies /api to :8000
```

Without `OPENAI_API_KEY` the seed falls back to a deterministic offline embedder, and `/chat` returns 503. Everything else (dashboard, tests) works.

## How it works

```
Widget (React / iframe via embed.js)
   │  POST /api/properties/{slug}/chat  {session_id, message}
   ▼
FastAPI ── ConciergeAgent (LangChain, tools bound to ONE property)
              │ list_room_types        search_knowledge  ─► pgvector
              │ check_availability     get_quote
              │ create/lookup/modify/cancel_reservation
              │ list_transfer_options  book_transfer
              │ recommend_experiences  request_human
              ▼
          services.py  (pure Python: availability, pricing, locking)
              ▼
          PostgreSQL
```

Design decisions worth knowing for a demo:

- **The LLM never calculates a price or decides availability.** It only relays what `services.py` returns, so it can't hallucinate a rate or a free room.
- **Write actions need explicit consent.** Booking, modifying, cancelling and transfers require `guest_confirmed=true`; the tool refuses otherwise and tells the model to summarise and ask first.
- **No overbooking.** Reservations lock the room-type row (`SELECT … FOR UPDATE`) and re-check inventory inside the transaction.
- **Identity check.** Viewing/changing a booking needs reference **and** the email on it.
- **New bookings are `pending`.** Staff confirm in the dashboard (where payment would be arranged). The agent never accepts card details.
- **Tenant isolation.** Each request is scoped to one property; knowledge search filters by `property_id`.
- **Handoff.** Complaints and edge cases set a flag that shows up as a badge in the dashboard.

## Adding a property (the reusable part)

Create `backend/data/properties/<slug>/`:

```
property.json        # property settings, room_types, seasons, transfers, experiences
knowledge/*.md       # FAQs, policies, facilities — split on headings and embedded
```

Then `python -m app.seed` (or restart the backend container). Seeding is idempotent: room types and transfers upsert by code/route so existing bookings keep working.

Key `property.json` settings: `kind` (hotel / villa / guesthouse / …), `currency`, `tax_pct`, `service_charge_pct`, `weekend_uplift_pct`, `meal_plans`, `free_cancellation_days`, `assistant_name`, `tone`, `contact.accent` (widget colour). Overlapping seasons take the higher multiplier, and a season's `min_nights` is enforced.

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

## Next steps

- WhatsApp channel (reuse `ConciergeAgent.run`; map phone number → session id)
- Payment links (Stripe / PayHere) on confirmation, and confirmation emails
- Two-way sync with a PMS or channel manager instead of local inventory
- Proper staff auth (JWT/OAuth, per-property roles) and rate limiting on `/chat`
- Admin UI for editing rooms, rates and knowledge docs
- Streaming responses (SSE) for faster perceived replies
