# What to build next

## Deferred (need external API)

These were intentionally skipped in the current phase — they require third-party accounts or credentials before development can start.

| Feature | Notes |
|---|---|
| **WhatsApp channel** | Reuse `ConciergeAgent.run`; map phone number → session id via Twilio / Meta Cloud API |
| **Payment integration** | PayHere (LKR) or Stripe; generate a payment link on booking confirmation; mark booking `paid` on webhook |
| **OTA sync** | Two-way sync with a channel manager (Siteminder, Cloudbeds) so inventory and bookings flow both ways |

---

## High priority — no external dependency

### 1. Proper staff authentication
- Replace the single `ADMIN_TOKEN` env-var with JWT login (email + password)
- Per-property roles: `owner`, `manager`, `front_desk`
- Session expiry + refresh tokens

### 2. Admin: edit rooms, rates, and seasons
- UI to add / edit / delete room types and seasonal rate rules without touching `property.json`
- Live preview of how a rate change affects a sample quote

### 3. Admin: knowledge doc editor
- CRUD for the markdown knowledge files that feed the RAG index
- "Re-index" button to rebuild embeddings after a doc is saved

### 4. Guest profiles and repeat-guest recognition
- Identify returning guests by email at booking time
- Show prior stay history to the chatbot so it can greet repeat guests by name and reference past preferences
- Loyalty discount tier (e.g. 5% after 3 stays)

### 5. Rate limiter and abuse protection on `/chat`
- Per-IP and per-session token-bucket rate limit
- Block or CAPTCHA if a session fires more than N requests / minute

### 6. Export / reporting
- CSV export of bookings from the admin dashboard
- Monthly revenue PDF report (one-click, matching the existing Word-doc format used elsewhere in the business)

---

## Medium priority

### 7. Push notifications for staff
- Browser push when a new booking arrives or a service request is logged
- Email alert to the property's inbox for pending bookings that are >2 hours old

### 8. Multi-image room gallery
- Replace the single `image_url` per room type with an array of images
- Carousel in the chat widget when the agent shows room options

### 9. Booking modification from chat
- Currently guests can only modify dates via the admin; expose it through the agent too
- Agent calls `modify_reservation` tool with guest-confirmed guard

### 10. Availability block calendar (admin)
- Allow front desk to block specific dates on a room type (maintenance, VIP hold, etc.)
- Blocked dates show in the calendar view and are excluded from agent availability checks

---

## Nice to have / future

- iOS / Android wrapper for the admin dashboard (React Native or PWA install)
- Multi-currency display in the widget (show LKR with live FX to guest's locale)
- AI-generated upsell suggestions at checkout based on stay history
- Integration with Google Business Profile to auto-reply to reviews
