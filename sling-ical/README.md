# Sling → iCal

Export your [Sling](https://getsling.com) shifts into a standard **iCalendar (`.ics`)** file that Apple Calendar, Google Calendar, Outlook, and other apps can import or subscribe to.

> **Easier path if you have Sling Premium/Business:** Sling already offers a built-in calendar sync URL (Schedule → calendar sync icon on the web app). Use this tool when you want an API-based export, free-plan workaround, custom date ranges, or a self-hosted feed.

## Quick start

```bash
cd sling-ical
cp .env.example .env
# edit .env with your Sling email/password (or token + org/user ids)

# one-shot export
python3 -m sling_ical

# dry-run with sample shifts (no Sling account needed)
python3 -m sling_ical --demo -o demo.ics

# serve a live subscription URL (refresh on each poll)
python3 -m sling_ical --serve --refresh-on-request --feed-token 'pick-a-secret'
```

Output defaults to `sling-shifts.ics` in the current directory.

## Subscribe in your calendar app

### Apple Calendar (iPhone / Mac)

1. Run with `--serve` (and ideally `--feed-token`).
2. Expose the URL over HTTPS (or use a tunnel such as `ngrok` / Cloudflare Tunnel) if the phone is not on the same machine.
3. iPhone: **Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar**
4. Paste `https://YOUR-HOST/sling.ics?token=YOUR_SECRET`

### Google Calendar

1. On desktop: **Other calendars → + → From URL**
2. Paste the same feed URL.

### One-time import

Open or import the generated `.ics` file directly. This does not auto-update; re-export when the schedule changes, or use `--serve --refresh-on-request`.

## Credentials

| Method | Env vars |
| --- | --- |
| Login | `SLING_EMAIL`, `SLING_PASSWORD` |
| Existing token | `SLING_TOKEN`, `SLING_ORG_ID`, `SLING_USER_ID` |

Token login avoids storing your password. You can copy the `Authorization` header from the Sling web app network tab while logged in (session tokens expire on logout).

Official API docs: [api.getsling.com](https://api.getsling.com/) · examples: [getsling/getsling-api-docs](https://github.com/getsling/getsling-api-docs)

## How it works

1. Authenticate against `POST /account/login` (or reuse a token).
2. Read shifts from `GET /calendar/{orgId}/users/{userId}?dates=START/END` (8-week max per request; this tool chunks longer ranges).
3. Convert events (`dtstart`, `dtend`, `summary`, location/position when present) into RFC 5545 VEVENT entries.
4. Write `.ics` and optionally serve it over HTTP.

## Tests

```bash
cd sling-ical
python3 -m unittest discover -s tests -v
```

## Safety notes

- Keep `.env` private; never commit credentials.
- Prefer `--feed-token` when serving a feed on a network.
- Sling API access follows your account permissions and subscription plan.
