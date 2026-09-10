"""Minimal Sling API client (stdlib only)."""

from __future__ import annotations

import json
import ssl
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any, Iterable, Optional


API_BASE = "https://api.getsling.com"
# Official examples omit /v1; some docs include it. Prefer the documented example path.
CALENDAR_PATHS = (
    "/calendar/{org_id}/users/{user_id}",
    "/v1/calendar/{org_id}/users/{user_id}",
)
# Sling rejects calendar queries longer than eight weeks.
MAX_WINDOW = timedelta(days=56)


class SlingApiError(RuntimeError):
    """Raised when the Sling API returns an unexpected response."""


@dataclass
class SlingSession:
    token: str
    org_id: str
    user_id: str
    email: Optional[str] = None


def _request(
    method: str,
    url: str,
    *,
    headers: Optional[dict[str, str]] = None,
    body: Optional[dict[str, Any]] = None,
    timeout: float = 30.0,
) -> tuple[dict[str, str], Any]:
    data = None
    req_headers = {"Accept": "application/json", "User-Agent": "sling-ical/1.0"}
    if headers:
        req_headers.update(headers)
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        req_headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    context = ssl.create_default_context()
    try:
        with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
            raw = response.read()
            response_headers = {k.lower(): v for k, v in response.headers.items()}
            if not raw:
                return response_headers, None
            try:
                return response_headers, json.loads(raw.decode("utf-8"))
            except json.JSONDecodeError:
                return response_headers, raw.decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise SlingApiError(f"HTTP {exc.code} for {method} {url}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise SlingApiError(f"Network error calling {url}: {exc}") from exc


def login(email: str, password: str) -> SlingSession:
    """Authenticate and return token + org/user ids from the login payload."""
    headers, payload = _request(
        "POST",
        f"{API_BASE}/account/login",
        body={"email": email, "password": password},
    )
    token = headers.get("authorization", "").strip()
    if not token:
        raise SlingApiError(
            "Login succeeded but no Authorization header was returned. "
            "Check credentials or try copying a token from the Sling web app."
        )
    if not isinstance(payload, dict):
        raise SlingApiError("Login response was not JSON.")

    org = payload.get("org") or payload.get("organisation") or {}
    user = payload.get("user") or payload.get("account") or payload
    org_id = str(org.get("id") or payload.get("orgId") or "").strip()
    user_id = str(
        user.get("id")
        or payload.get("userId")
        or payload.get("id")
        or ""
    ).strip()
    if not org_id or not user_id:
        raise SlingApiError(
            "Login worked, but org/user ids were missing from the response. "
            "Set SLING_ORG_ID and SLING_USER_ID explicitly."
        )
    return SlingSession(token=token, org_id=org_id, user_id=user_id, email=email)


def session_from_token(token: str, org_id: str, user_id: str) -> SlingSession:
    if not token or not org_id or not user_id:
        raise SlingApiError("token, org_id, and user_id are all required.")
    return SlingSession(token=token.strip(), org_id=str(org_id), user_id=str(user_id))


def _naive_iso(dt: datetime) -> str:
    """Sling prefers naive ISO timestamps for timezone-sensitive calendar queries."""
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt.replace(microsecond=0).isoformat()


def date_windows(
    start: datetime,
    end: datetime,
    *,
    max_span: timedelta = MAX_WINDOW,
) -> Iterable[tuple[datetime, datetime]]:
    """Yield inclusive start / exclusive end windows within Sling's max span."""
    if end <= start:
        return
    cursor = start
    while cursor < end:
        nxt = min(cursor + max_span, end)
        yield cursor, nxt
        cursor = nxt


def fetch_calendar(
    session: SlingSession,
    *,
    start: datetime,
    end: datetime,
) -> list[dict[str, Any]]:
    """Fetch calendar events for the user across one or more date windows."""
    events: list[dict[str, Any]] = []
    seen: set[str] = set()

    for window_start, window_end in date_windows(start, end):
        dates = f"{_naive_iso(window_start)}/{_naive_iso(window_end)}"
        batch = _fetch_window(session, dates)
        for event in batch:
            key = str(event.get("id") or f"{event.get('dtstart')}|{event.get('dtend')}|{event.get('summary')}")
            if key in seen:
                continue
            seen.add(key)
            events.append(event)

    events.sort(key=lambda e: str(e.get("dtstart") or ""))
    return events


def _fetch_window(session: SlingSession, dates: str) -> list[dict[str, Any]]:
    query = urllib.parse.urlencode({"dates": dates})
    last_error: Optional[Exception] = None

    for path_tmpl in CALENDAR_PATHS:
        path = path_tmpl.format(org_id=session.org_id, user_id=session.user_id)
        url = f"{API_BASE}{path}?{query}"
        try:
            _, payload = _request(
                "GET",
                url,
                headers={"Authorization": session.token},
            )
            return _normalize_events(payload)
        except SlingApiError as exc:
            last_error = exc
            # Try the alternate path on 404 only; otherwise bubble up.
            if "HTTP 404" not in str(exc):
                raise

    if last_error:
        raise last_error
    return []


def _normalize_events(payload: Any) -> list[dict[str, Any]]:
    if payload is None:
        return []
    if isinstance(payload, list):
        return [e for e in payload if isinstance(e, dict)]
    if isinstance(payload, dict):
        for key in ("events", "data", "items", "shifts", "calendar"):
            value = payload.get(key)
            if isinstance(value, list):
                return [e for e in value if isinstance(e, dict)]
        # Single event object
        if "dtstart" in payload or "id" in payload:
            return [payload]
    raise SlingApiError(f"Unexpected calendar payload type: {type(payload).__name__}")


def default_range(*, weeks_back: int = 2, weeks_forward: int = 8) -> tuple[datetime, datetime]:
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    start = today - timedelta(weeks=weeks_back)
    end = today + timedelta(weeks=weeks_forward)
    return start, end


def parse_date_arg(value: str) -> datetime:
    """Parse YYYY-MM-DD or ISO datetime into a naive datetime."""
    value = value.strip()
    try:
        if "T" in value:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if dt.tzinfo is not None:
                dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
            return dt.replace(microsecond=0)
        d = date.fromisoformat(value)
        return datetime(d.year, d.month, d.day)
    except ValueError as exc:
        raise SlingApiError(f"Invalid date '{value}'. Use YYYY-MM-DD or ISO datetime.") from exc
