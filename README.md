# AI Hotel Concierge & Booking Agent

A multi-property AI concierge for hotels, villas, guesthouses, boutique resorts and holiday apartments. Guests chat through an embeddable web widget; staff manage everything from a dashboard.

**The agent can:** answer room and policy questions (RAG over each property's docs) · check live availability · quote rates (seasons, weekends, meal plans, service charge, tax) · create, look up, modify and cancel reservations · arrange airport transfers · recommend experiences · validate promo/discount codes · log in-stay service requests · hand off to a human.

**Stack:** React 18 (Vite) · FastAPI · LangChain tool-calling agent · OpenAI (chat + embeddings + Realtime voice) · PostgreSQL + pgvector · Docker Compose · Alembic migrations.

## Quick start (Docker)

```bash
cp .env.example .env          # add OPENAI_API_KEY; set ADMIN_TOKEN (≥16 chars) and JWT_SECRET (≥16 chars)
docker compose run --rm backend python -m app.seed --reset --demo
DOCKER_BUILDKIT=0 docker compose up
```

> **Note:** `DOCKER_BUILDKIT=0` is required for all Docker builds in this project.

- Guest demo site with widget: http://localhost:8080
- Staff dashboard: http://localhost:8080/admin (token = `ADMIN_TOKEN`)
- API docs: http://localhost:8000/docs

One property is seeded: **Kandy Hills Boutique Hotel** (LKR, 4 room types — Deluxe Garden, Superior Lake View, Family Suite, Heritage Suite) plus sample bookings, service requests, promo codes, and experiences so the dashboard isn't empty.

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

## Security requirements

The backend **refuses to start** if either secret is weak or unset:

| Variable | Minimum | Description |
|---|---|---|
| `ADMIN_TOKEN` | 16 characters | Staff dashboard master token |
| `JWT_SECRET` | 16 characters | Signs per-property login JWTs |

Weak values (`change-me`, `secret`, `password`, `admin`, blank, or anything under 16 chars) cause a startup error. Set both in `.env` before the first run.

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

**Voice concierge** — a separate WebSocket endpoint (`/api/properties/{slug}/voice`) bridges the browser to the OpenAI Realtime API (`gpt-realtime` model). The same tools and property context apply.

Design decisions worth knowing:

- **The LLM never calculates a price or decides availability.** It only relays what `services.py` returns, so it can't hallucinate a rate or a free room.
- **Write actions need explicit consent.** Booking, modifying, cancelling, and transfers require `guest_confirmed=true`; the tool refuses otherwise.
- **No overbooking.** A PostgreSQL advisory lock (`pg_advisory_xact_lock`) is acquired per room type inside each booking transaction, replacing the earlier `SELECT … FOR UPDATE`. Advisory locks are released automatically on commit/rollback and work correctly under concurrent requests.
- **Identity check.** Viewing or changing a booking needs reference **and** the email on it.
- **New bookings are `pending`.** Staff confirm in the dashboard. The agent never accepts card details.
- **Tenant isolation.** Every request is scoped to one property; knowledge search and all DB queries filter by `property_id`.
- **Session IDs are enforced.** Chat `session_id` must be at least 32 characters — short or guessable IDs are rejected.
- **Rate limiting.** Login attempts are limited to 5 per 15 minutes per IP. The rate limiter reads only `X-Real-IP` (set by nginx); `X-Forwarded-For` is ignored to prevent header spoofing.
- **Promo codes.** Discounts (percentage or fixed) are applied to the subtotal before service charge and tax, validated for expiry, usage limits, and minimum nights.
- **Service requests.** The agent logs in-stay requests (housekeeping, room service, maintenance, late checkout, etc.) immediately without asking the guest to confirm first.

## Database migrations (Alembic)

Migrations run automatically on every startup via `init_db()`. The initial migration (`0001_initial_schema`) is safe on both fresh and existing databases — it uses `CREATE TABLE IF NOT EXISTS` for new tables and `ADD COLUMN IF NOT EXISTS` for columns that may be missing on live deployments.

To create a new migration after a model change:

```bash
cd backend
alembic revision --autogenerate -m "describe the change"
# migrations are applied automatically on next startup
```

## Per-property JWT authentication

Each property has its own login:

```bash
POST /api/auth/{slug}/login
{"email": "admin@yourproperty.com", "password": "YourPassword"}
# → {"access_token": "...", "token_type": "bearer"}
```

Use the returned JWT as `Authorization: Bearer <token>` for all admin endpoints. The global `X-Admin-Token` header also works for super-admin access.

## Admin dashboard tabs

| Tab | What it shows |
|---|---|
| **Today (Overview)** | Arrivals / departures / in-house count today · Pending bookings · Revenue MTD · ADR · RevPAR · Occupancy % · 6-month revenue trend chart · Open service requests badge |
| **Bookings** | All bookings with status filter · Confirm / cancel actions · Pre-arrival email send button · Review email indicator |
| **Transfers** | Airport transfer requests · Confirm / cancel |
| **Conversations** | Chat transcripts with handoff flag · Mark resolved |
| **Promo Codes** | Create percentage or fixed-amount codes · Set expiry, min nights, max uses · Pause / activate |
| **Experiences** | Add and manage experiences the agent recommends to guests · Category, description, duration, price, tags, family-friendly flag |
| **Requests** | In-stay service requests from guests · Filter by open / in progress / done · Update status |
| **Calendar** | Month grid with per-day occupancy fill bars and arrival counts · Click any day for a detail panel listing arrivals, in-house, and departures |
| **Rooms** | Room type editor — base rate, inventory, weekend uplift |
| **Seasons** | Date-range pricing seasons with rate multipliers and min-night rules |
| **Knowledge Base** | Upload or write knowledge documents (FAQs, policies) — embedded into pgvector for RAG |
| **Analytics** | KPIs (ADR, RevPAR, occupancy) · 12-month revenue chart · 6-month occupancy · Revenue by source / room type · Lead-time buckets — all computed via SQL aggregations |
| **Settings** | SMTP / email config, property details, credentials |

## Analytics

All analytics are computed with SQL aggregations — no Python loops over unbounded booking lists. The 6-month occupancy loads only bookings that overlap the target window, keeping memory bounded even on large datasets.

## Automated emails

Background tasks run on startup (every hour):

- **Pre-arrival email** — sent to confirmed guests arriving in the next 1–2 days (check-in details, welcome message)
- **Post-stay review request** — sent to confirmed guests who checked out in the last 30 days (links to the property's Google review page)
- **New booking alert** — sent to staff email on every new booking (runs in a background task, never blocks the API response)

All can also be triggered manually from the admin dashboard.

## Adding a property

Create `backend/data/properties/<slug>/`:

```
property.json        # property settings, room_types, seasons, transfers, experiences
knowledge/*.md       # FAQs, policies, facilities — split on headings and embedded
```

Then `python -m app.seed` (or restart the backend container). Seeding is idempotent: room types and transfers upsert by code/route so existing bookings keep working.

Key `property.json` settings: `kind` (hotel / villa / guesthouse / …), `currency`, `timezone` (IANA, e.g. `Asia/Colombo`), `tax_pct`, `service_charge_pct`, `weekend_uplift_pct`, `weekend_days` (0=Mon … 6=Sun), `meal_plans`, `free_cancellation_days`, `assistant_name`, `tone`, `contact.accent` (widget colour), `contact.review_url` (post-stay review link). Overlapping seasons take the higher multiplier, and a season's `min_nights` is enforced.

## Embedding on a hotel website

```html
<script src="https://YOUR-HOST/embed.js" data-property="kandy-hills" data-accent="#2f5d3a" defer></script>
```

Set `CORS_ORIGINS` to the hotel's domain in production.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes | Chat, embeddings, voice realtime |
| `ADMIN_TOKEN` | Yes | ≥16 chars — staff dashboard master token |
| `JWT_SECRET` | Yes | ≥16 chars — signs per-property login tokens |
| `SMTP_HOST` | No | Leave empty to disable all email |
| `SMTP_PORT` | No | Default 587 (STARTTLS) |
| `SMTP_USER` | No | SMTP login |
| `SMTP_PASS` | No | SMTP password |
| `EMAIL_FROM` | No | Sender address (falls back to `SMTP_USER`) |
| `STAFF_EMAIL` | No | Where new-booking alerts are sent |
| `CORS_ORIGINS` | No | Comma-separated origins; default `*` |

## Tests

```bash
cd backend && DATABASE_URL=postgresql+psycopg://hotel:hotel@localhost:5432/hotel_test pytest -q
```

Tests reset the target database, so point them at a separate one. They cover pricing maths, seasons and min-stay, overbooking (advisory lock), occupancy rules, modify/cancel, transfer validation, recommendations, RAG tenant isolation, the confirmation guard, and the chat + admin API end to end (with a scripted LLM).

## What's next

- **B6** — KB file upload: stream body to avoid RAM spike on large files (15 min)
- **D2** — JWT refresh endpoint so tabs don't silently 401 after 24-hr inactivity (1 hr)
- **D3** — Bookings search / filter by guest name or date range (2 hrs)
- **D6** — Link conversations to the booking they created (2 hrs)
- **D7** — Staff assignment + notes on service requests (2 hrs)
- **D9** — Bookings list pagination (currently hard-capped at 500) (1 hr)
- Payment gateway (Stripe / PayHere) — commercial blocker (1–2 weeks)
- Per-property email From address (2 hrs)
- Analytics date range filter (3 hrs)
