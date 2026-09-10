"""CLI: fetch Sling shifts and write / serve an iCalendar feed."""

from __future__ import annotations

import argparse
import os
import sys
import threading
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qs, urlparse

from . import __version__
from .client import (
    SlingApiError,
    SlingSession,
    default_range,
    fetch_calendar,
    login,
    parse_date_arg,
    session_from_token,
)
from .ical import build_ics


SAMPLE_EVENTS = [
    {
        "id": 1001,
        "summary": "Front Desk",
        "dtstart": "2026-09-12T09:00:00",
        "dtend": "2026-09-12T17:00:00",
        "location": {"name": "Main Clinic"},
        "position": {"name": "Front Desk"},
        "notes": "Sample shift for dry-run mode",
    },
    {
        "id": 1002,
        "summary": "Check In Desk",
        "dtstart": "2026-09-14T12:00:00",
        "dtend": "2026-09-14T20:00:00",
        "location": {"name": "Main Clinic"},
        "position": {"name": "Check In Desk"},
    },
]


def _load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        os.environ.setdefault(key, value)


def _resolve_session(args: argparse.Namespace) -> SlingSession:
    token = args.token or os.environ.get("SLING_TOKEN", "").strip()
    org_id = args.org_id or os.environ.get("SLING_ORG_ID", "").strip()
    user_id = args.user_id or os.environ.get("SLING_USER_ID", "").strip()
    email = args.email or os.environ.get("SLING_EMAIL", "").strip()
    password = args.password or os.environ.get("SLING_PASSWORD", "").strip()

    if token and org_id and user_id:
        return session_from_token(token, org_id, user_id)
    if email and password:
        session = login(email, password)
        # Allow overrides when login payload is incomplete / multi-org.
        if org_id:
            session.org_id = org_id
        if user_id:
            session.user_id = user_id
        return session
    raise SlingApiError(
        "Provide SLING_EMAIL + SLING_PASSWORD, or SLING_TOKEN + SLING_ORG_ID + SLING_USER_ID."
    )


def _date_range(args: argparse.Namespace) -> tuple[datetime, datetime]:
    if args.start or args.end:
        start = parse_date_arg(args.start) if args.start else default_range()[0]
        end = parse_date_arg(args.end) if args.end else default_range()[1]
        return start, end
    return default_range(weeks_back=args.weeks_back, weeks_forward=args.weeks_forward)


def export_ics(args: argparse.Namespace) -> str:
    if args.demo:
        events = SAMPLE_EVENTS
    else:
        session = _resolve_session(args)
        start, end = _date_range(args)
        print(
            f"Fetching Sling calendar for org={session.org_id} user={session.user_id} "
            f"from {start.isoformat()} to {end.isoformat()}…",
            file=sys.stderr,
        )
        events = fetch_calendar(session, start=start, end=end)
        print(f"Found {len(events)} event(s).", file=sys.stderr)

    calendar_name = args.calendar_name or os.environ.get("ICAL_NAME", "Sling Shifts")
    return build_ics(events, calendar_name=calendar_name)


def _write_output(ics_text: str, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(ics_text, encoding="utf-8", newline="")
    print(f"Wrote {output} ({len(ics_text)} bytes).", file=sys.stderr)


def _serve(args: argparse.Namespace, initial_ics: str, output: Path) -> None:
    feed_token = args.feed_token or os.environ.get("ICAL_FEED_TOKEN", "").strip()
    host = args.host
    port = args.port
    lock = threading.Lock()
    cache = {"ics": initial_ics}

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt: str, *fmt_args) -> None:  # noqa: A003
            print(f"[http] {self.address_string()} {fmt % fmt_args}", file=sys.stderr)

        def do_GET(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            if parsed.path not in ("/", "/sling.ics", "/calendar.ics"):
                self.send_error(404, "Not found")
                return
            if feed_token:
                query = parse_qs(parsed.query)
                provided = (query.get("token") or [None])[0]
                auth = self.headers.get("Authorization", "")
                bearer = auth.split(" ", 1)[1].strip() if auth.lower().startswith("bearer ") else ""
                if provided != feed_token and bearer != feed_token:
                    self.send_error(401, "Missing or invalid feed token")
                    return

            if args.refresh_on_request and not args.demo:
                try:
                    fresh = export_ics(args)
                    with lock:
                        cache["ics"] = fresh
                    _write_output(fresh, output)
                except SlingApiError as exc:
                    self.send_error(502, f"Sling fetch failed: {exc}")
                    return

            with lock:
                body = cache["ics"].encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/calendar; charset=utf-8")
            self.send_header("Content-Disposition", 'inline; filename="sling.ics"')
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(body)

    server = ThreadingHTTPServer((host, port), Handler)
    url = f"http://{host}:{port}/sling.ics"
    if feed_token:
        url = f"{url}?token={feed_token}"
    print(
        "Serving iCal feed. Subscribe in Apple Calendar / Google Calendar using:\n"
        f"  {url}\n"
        "Press Ctrl+C to stop.",
        file=sys.stderr,
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.", file=sys.stderr)
    finally:
        server.server_close()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="sling-ical",
        description="Export Sling shifts to an iCalendar (.ics) file or subscription feed.",
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    parser.add_argument(
        "--env-file",
        default=".env",
        help="Optional dotenv file to load (default: .env in the working directory).",
    )
    parser.add_argument("--email", help="Sling account email (or SLING_EMAIL).")
    parser.add_argument("--password", help="Sling account password (or SLING_PASSWORD).")
    parser.add_argument("--token", help="Existing Sling Authorization token (or SLING_TOKEN).")
    parser.add_argument("--org-id", help="Organization id (or SLING_ORG_ID).")
    parser.add_argument("--user-id", help="User id (or SLING_USER_ID).")
    parser.add_argument("--start", help="Range start YYYY-MM-DD (default: 2 weeks ago).")
    parser.add_argument("--end", help="Range end YYYY-MM-DD (default: 8 weeks ahead).")
    parser.add_argument("--weeks-back", type=int, default=2, help="Weeks before today (default 2).")
    parser.add_argument(
        "--weeks-forward",
        type=int,
        default=8,
        help="Weeks after today (default 8; fetched in ≤8-week chunks).",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="sling-shifts.ics",
        help="Output .ics path (default: sling-shifts.ics).",
    )
    parser.add_argument("--calendar-name", help="Calendar display name (or ICAL_NAME).")
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Generate a sample .ics without calling Sling (for testing).",
    )
    parser.add_argument(
        "--serve",
        action="store_true",
        help="Serve the .ics over HTTP so calendar apps can subscribe by URL.",
    )
    parser.add_argument("--host", default="127.0.0.1", help="Bind host for --serve.")
    parser.add_argument("--port", type=int, default=8765, help="Bind port for --serve.")
    parser.add_argument(
        "--feed-token",
        help="Optional shared secret required as ?token=… (or ICAL_FEED_TOKEN).",
    )
    parser.add_argument(
        "--refresh-on-request",
        action="store_true",
        help="With --serve, re-fetch Sling on each calendar poll.",
    )
    return parser


def main(argv: Optional[list[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    _load_dotenv(Path(args.env_file))

    try:
        ics_text = export_ics(args)
    except SlingApiError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    output = Path(args.output)
    _write_output(ics_text, output)

    if args.serve:
        _serve(args, ics_text, output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
