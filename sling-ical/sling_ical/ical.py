"""Convert Sling calendar events into RFC 5545 iCalendar text."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable, Optional


def _fold(line: str) -> str:
    """Fold long content lines per RFC 5545 (75 octets)."""
    if len(line.encode("utf-8")) <= 75:
        return line
    out: list[str] = []
    current = ""
    for ch in line:
        candidate = current + ch
        if len(candidate.encode("utf-8")) > 75:
            out.append(current)
            current = " " + ch
        else:
            current = candidate
    if current:
        out.append(current)
    return "\r\n".join(out)


def _escape(text: str) -> str:
    return (
        text.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
        .replace("\r", "\\n")
    )


def _parse_dt(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    text = str(value).strip()
    if not text:
        return None
    # Handle trailing Z and missing seconds.
    try:
        if text.endswith("Z"):
            return datetime.fromisoformat(text[:-1]).replace(tzinfo=timezone.utc)
        dt = datetime.fromisoformat(text)
        return dt
    except ValueError:
        return None


def _format_dt(dt: datetime) -> tuple[str, str]:
    """Return (property_name_suffix, value) for DTSTART/DTEND."""
    if dt.tzinfo is not None:
        utc = dt.astimezone(timezone.utc).replace(tzinfo=None, microsecond=0)
        return "", utc.strftime("%Y%m%dT%H%M%SZ")
    # Naive local wall time — mark as floating time (no Z).
    return "", dt.replace(microsecond=0).strftime("%Y%m%dT%H%M%S")


def _event_summary(event: dict[str, Any]) -> str:
    if event.get("summary"):
        return str(event["summary"])
    position = event.get("position") or {}
    if isinstance(position, dict) and position.get("name"):
        return str(position["name"])
    if event.get("type"):
        return str(event["type"]).replace("_", " ").title()
    return "Sling Shift"


def _event_location(event: dict[str, Any]) -> str:
    location = event.get("location")
    if isinstance(location, dict):
        parts = [
            location.get("name"),
            location.get("address"),
            location.get("city"),
        ]
        return ", ".join(str(p) for p in parts if p)
    if isinstance(location, str):
        return location
    return ""


def _event_description(event: dict[str, Any]) -> str:
    bits: list[str] = []
    for key in ("notes", "description", "status"):
        value = event.get(key)
        if value:
            bits.append(f"{key.title()}: {value}")
    position = event.get("position")
    if isinstance(position, dict) and position.get("name"):
        bits.append(f"Position: {position['name']}")
    user = event.get("user")
    if isinstance(user, dict):
        name = " ".join(
            str(part)
            for part in (user.get("name"), user.get("lastname"), user.get("firstname"))
            if part
        ).strip()
        if not name and user.get("email"):
            name = str(user["email"])
        if name:
            bits.append(f"Assignee: {name}")
    return "\\n".join(_escape(b) for b in bits) if bits else ""


def event_to_vevent(event: dict[str, Any], *, calendar_name: str = "Sling") -> Optional[str]:
    start = _parse_dt(event.get("dtstart") or event.get("start"))
    end = _parse_dt(event.get("dtend") or event.get("end"))
    if start is None:
        return None
    if end is None:
        end = start

    uid = str(event.get("id") or f"{start.isoformat()}-{_event_summary(event)}")
    uid = f"{uid}@sling-ical.getsling"

    _, dtstart = _format_dt(start)
    _, dtend = _format_dt(end)
    now = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    lines = [
        "BEGIN:VEVENT",
        f"UID:{_escape(uid)}",
        f"DTSTAMP:{now}",
        f"DTSTART:{dtstart}",
        f"DTEND:{dtend}",
        f"SUMMARY:{_escape(_event_summary(event))}",
    ]
    location = _event_location(event)
    if location:
        lines.append(f"LOCATION:{_escape(location)}")
    description = _event_description(event)
    if description:
        lines.append(f"DESCRIPTION:{description}")
    lines.append(f"CATEGORIES:{_escape(calendar_name)}")
    lines.append("END:VEVENT")
    return "\r\n".join(_fold(line) for line in lines)


def build_ics(
    events: Iterable[dict[str, Any]],
    *,
    calendar_name: str = "Sling Shifts",
    prodid: str = "-//sling-ical//EN",
) -> str:
    vevents: list[str] = []
    for event in events:
        vevent = event_to_vevent(event, calendar_name=calendar_name)
        if vevent:
            vevents.append(vevent)

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:{prodid}",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{_escape(calendar_name)}",
        "X-WR-CALDESC:Shifts exported from Sling",
    ]
    body = "\r\n".join(lines + vevents + ["END:VCALENDAR", ""])
    # Ensure CRLF throughout
    return body.replace("\r\n", "\n").replace("\n", "\r\n")
