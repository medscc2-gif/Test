# BeatLink

iOS-friendly web app that shows nearby police officer locations on a map and highlights the nearest unit to you.

## Features

- Full-screen interactive map (Leaflet + CARTO tiles)
- Uses your device GPS to place you on the map
- Plots demo patrol units around your location
- Calculates and highlights the **nearest officer**
- Unit roster with distances; tap a unit to fly to it on the map
- Installable on iPhone via **Add to Home Screen** (PWA meta + manifest)

> Officer positions are **demo data** generated around your location for a realistic prototype. They are not live CAD / dispatch feeds.

## Open on iPhone

1. Serve the folder over HTTPS (or use a local tunnel), or open via a static host.
2. In Safari: open the site → Share → **Add to Home Screen**.
3. Allow location when prompted, or choose **Use demo location**.

### Quick local preview

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` on your machine, or use a LAN / tunnel URL on your iPhone.

## Project layout

```
index.html              App shell
css/styles.css          Mobile-first UI
js/officers.js          Distance math + demo units
js/app.js               Map, geolocation, nearest-unit UI
manifest.webmanifest    Home Screen install metadata
icons/                  App icons
```

## Notes

- Geolocation requires a secure context (HTTPS or localhost).
- Emergency calls still go through the built-in **Call 911** link — BeatLink does not contact dispatch automatically.

## Sling → iCal

Need your [Sling](https://getsling.com) work schedule in Apple/Google Calendar? See [`sling-ical/`](sling-ical/) — a small Python tool that pulls shifts from the Sling API and writes a subscribeable `.ics` feed.
