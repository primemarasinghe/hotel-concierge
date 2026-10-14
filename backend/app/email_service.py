"""Email notifications for guest and staff.

Uses stdlib smtplib (no extra dependencies) via FastAPI BackgroundTasks so
emails are sent after the HTTP response returns and never delay bookings.
All public functions silently no-op when SMTP is not configured.
"""
import smtplib
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from .config import settings

# ── Helpers ───────────────────────────────────────────────────────────────────

def _ready() -> bool:
    return (settings.email_enabled
            and bool(settings.smtp_host)
            and bool(settings.smtp_user)
            and bool(settings.smtp_pass))


def _money(amount: float, currency: str) -> str:
    symbols = {"USD": "$", "LKR": "Rs ", "EUR": "€", "GBP": "£", "AUD": "A$"}
    sym = symbols.get(currency, f"{currency} ")
    return f"{sym}{amount:,.0f}" if currency == "LKR" else f"{sym}{amount:,.2f}"


def _fmt_date(iso: str) -> str:
    d = date.fromisoformat(iso[:10])
    return d.strftime("%A, %d %B %Y")


def _guests(adults: int, children: int) -> str:
    s = f"{adults} adult{'s' if adults != 1 else ''}"
    if children:
        s += f" + {children} child{'ren' if children != 1 else ''}"
    return s


def _smtp_send(to: str, subject: str, html: str) -> None:
    from_addr = settings.email_from or settings.smtp_user
    from_hdr = (f"{settings.email_from_name} <{from_addr}>"
                if settings.email_from_name else from_addr)
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_hdr
    msg["To"] = to
    msg.attach(MIMEText(html, "html", "utf-8"))

    if settings.smtp_port == 465:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=15) as s:
            s.login(settings.smtp_user, settings.smtp_pass)
            s.sendmail(from_addr, to, msg.as_string())
    else:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as s:
            s.ehlo()
            if settings.smtp_tls:
                s.starttls()
                s.ehlo()
            s.login(settings.smtp_user, settings.smtp_pass)
            s.sendmail(from_addr, to, msg.as_string())


def _send(to: str, subject: str, html: str) -> None:
    if not _ready() or not to:
        return
    try:
        _smtp_send(to, subject, html)
    except Exception as exc:
        print(f"[email] ✗ → {to}: {exc}")


# ── HTML template engine ──────────────────────────────────────────────────────

def _template(prop: dict, title: str, subtitle: str,
              rows: list[tuple[str, str]],
              ref: str | None = None,
              note: str | None = None,
              note_color: str | None = None) -> str:
    accent = prop["accent"]

    # Reference badge
    badge_html = ""
    if ref:
        badge_html = f"""
        <tr>
          <td style="padding:0 32px 22px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="background:#f6f7f6;border:1.5px dashed #cfd3ce;border-radius:8px;padding:16px;">
                  <div style="font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:.09em;margin-bottom:6px;">Booking Reference</div>
                  <div style="font-size:28px;font-weight:800;color:{accent};letter-spacing:.12em;font-family:Courier,'Courier New',monospace;">{ref}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>"""

    # Detail rows
    rows_html = ""
    for i, (label, value) in enumerate(rows):
        sep = "" if i == len(rows) - 1 else "border-bottom:1px solid #f0f0ee;"
        rows_html += f"""
              <tr>
                <td style="padding:10px 0;font-size:13px;color:#999;{sep}width:36%;vertical-align:top;">{label}</td>
                <td style="padding:10px 0;font-size:13px;color:#1a1a1a;font-weight:500;{sep}">{value}</td>
              </tr>"""

    # Note block
    note_html = ""
    if note:
        nc = note_color or accent
        note_html = f"""
        <tr>
          <td style="padding:0 32px 28px;">
            <p style="margin:0;font-size:13px;color:#4a5568;background:#f7f9f7;border-left:3px solid {nc};padding:12px 16px;border-radius:0 5px 5px 0;line-height:1.65;">{note}</p>
          </td>
        </tr>"""

    # Footer
    parts = [prop["name"]]
    if prop.get("phone"): parts.append(prop["phone"])
    if prop.get("contact_email"): parts.append(prop["contact_email"])
    footer = " &nbsp;&middot;&nbsp; ".join(parts)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#edf0ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:36px 16px;">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#fff;border-radius:10px;overflow:hidden;
               box-shadow:0 2px 16px rgba(0,0,0,.1);max-width:560px;width:100%;">
        <!-- Property header -->
        <tr>
          <td style="background:{accent};padding:26px 32px 22px;">
            <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.12em;margin-bottom:5px;">{prop.get('kind','hotel').upper()}&nbsp;&nbsp;CONCIERGE</div>
            <div style="font-size:21px;font-weight:700;color:#fff;letter-spacing:-.01em;">{prop['name']}</div>
            <div style="font-size:13px;color:rgba(255,255,255,.72);margin-top:4px;">{prop['location']}</div>
          </td>
        </tr>
        <!-- Title block -->
        <tr>
          <td style="padding:28px 32px 20px;">
            <h1 style="margin:0;font-size:21px;font-weight:700;color:#111;letter-spacing:-.02em;">{title}</h1>
            <p style="margin:8px 0 0;font-size:14px;color:#666;line-height:1.55;">{subtitle}</p>
          </td>
        </tr>
        {badge_html}
        <!-- Detail rows -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              {rows_html}
            </table>
          </td>
        </tr>
        {note_html}
        <!-- Footer -->
        <tr>
          <td style="padding:18px 32px;background:#f7f8f7;border-top:1px solid #eee;">
            <p style="margin:0;font-size:12px;color:#bbb;text-align:center;line-height:1.7;">{footer}</p>
            <p style="margin:5px 0 0;font-size:11px;color:#d4d4d4;text-align:center;">Sent by the AI concierge system &mdash; please do not reply to this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ── Data builders (from dicts — no ORM objects) ───────────────────────────────

def _stay_rows(d: dict, prop: dict) -> list[tuple[str, str]]:
    room = f"{d['units']} &times; {d['room']}" if d["units"] > 1 else d["room"]
    nights = d["nights"]
    rows: list[tuple[str, str]] = [
        ("Room",      room),
        ("Check-in",  f"{_fmt_date(d['check_in'])}&nbsp; "
                      f"<span style='color:#aaa;font-weight:400;font-size:12px;'>from {prop['check_in_time']}</span>"),
        ("Check-out", f"{_fmt_date(d['check_out'])}&nbsp; "
                      f"<span style='color:#aaa;font-weight:400;font-size:12px;'>by {prop['check_out_time']}</span>"),
        ("Duration",  f"{nights} night{'s' if nights != 1 else ''}"),
        ("Guests",    f"{_guests(d['adults'], d['children'])}&nbsp;&middot;&nbsp;{d['meal_plan']}"),
    ]
    if d.get("special_requests"):
        rows.append(("Requests", d["special_requests"]))
    rows.append(("Total",
        f"<span style='font-size:18px;font-weight:700;color:#111;'>{_money(d['total'], d['currency'])}</span>"))
    return rows


# ── Public API (called from BackgroundTasks — must be sync, no ORM objects) ───

def booking_received(d: dict, prop: dict) -> None:
    """Guest: booking request received, awaiting staff confirmation."""
    first = d["guest_name"].split()[0]
    html = _template(
        prop,
        title="Booking request received",
        subtitle=f"Hi {first}, we've received your booking request and will confirm it shortly.",
        rows=_stay_rows(d, prop),
        ref=d["reference"],
        note=(f"Your reservation is currently <strong>awaiting confirmation</strong>. "
              f"Our reservations team will review and confirm your booking by email &mdash; "
              f"usually within a few hours. "
              f"Your reference is <strong>{d['reference']}</strong> &mdash; please keep it handy."),
    )
    _send(d["email"],
          f"Booking received — {d['reference']} | {prop['name']}",
          html)


def booking_confirmed(d: dict, prop: dict) -> None:
    """Guest: booking confirmed by staff."""
    first = d["guest_name"].split()[0]
    html = _template(
        prop,
        title="Your booking is confirmed ✓",
        subtitle=f"Great news, {first}! Your reservation has been confirmed. We look forward to welcoming you.",
        rows=_stay_rows(d, prop),
        ref=d["reference"],
        note=(f"Check-in is from <strong>{prop['check_in_time']}</strong> "
              f"on {_fmt_date(d['check_in'])}. "
              f"If you have any questions before arrival, please don’t hesitate to contact us."),
    )
    _send(d["email"],
          f"Booking confirmed ✓ — {d['reference']} | {prop['name']}",
          html)


def booking_cancelled(d: dict, prop: dict) -> None:
    """Guest: booking cancelled."""
    first = d["guest_name"].split()[0]
    html = _template(
        prop,
        title="Booking cancelled",
        subtitle=f"Hi {first}, your booking has been cancelled.",
        rows=[
            ("Reference", f"<strong>{d['reference']}</strong>"),
            ("Room",      d["room"]),
            ("Was due",   f"{_fmt_date(d['check_in'])} – {_fmt_date(d['check_out'])}"),
            ("Guests",    _guests(d["adults"], d["children"])),
        ],
        note=("If you didn’t request this cancellation or have any questions, "
              "please contact us using the details below."),
        note_color="#c0392b",
    )
    _send(d["email"],
          f"Booking cancelled — {d['reference']} | {prop['name']}",
          html)


def staff_new_booking(d: dict, prop: dict) -> None:
    """Staff alert: new booking arrived via chat."""
    if not settings.staff_email:
        return
    nights = d["nights"]
    rows: list[tuple[str, str]] = [
        ("Reference", f"<strong>{d['reference']}</strong>"),
        ("Guest",     f"{d['guest_name']}"),
        ("Email",     d["email"]),
        ("Phone",     d.get("phone") or "&mdash;"),
        ("Room",      f"{d['units']} &times; {d['room']}" if d["units"] > 1 else d["room"]),
        ("Check-in",  _fmt_date(d["check_in"])),
        ("Check-out", _fmt_date(d["check_out"])),
        ("Duration",  f"{nights} night{'s' if nights != 1 else ''}"),
        ("Guests",    f"{_guests(d['adults'], d['children'])} &middot; {d['meal_plan']}"),
        ("Total",     f"<strong>{_money(d['total'], d['currency'])}</strong>"),
    ]
    if d.get("special_requests"):
        rows.append(("Requests", f"<em>{d['special_requests']}</em>"))

    html = _template(
        prop,
        title="New booking request",
        subtitle="A guest has submitted a booking via the concierge chat. Log in to the staff dashboard to confirm or cancel.",
        rows=rows,
        note="Action required: confirm or cancel this booking in the admin dashboard. "
             "The guest is awaiting confirmation.",
    )
    _send(settings.staff_email,
          f"New booking: {d['reference']} — {d['guest_name']} (check-in {d['check_in'][:10]})",
          html)
