# Texas Tech Football Tracker

A Windows desktop application for tracking Texas Tech Red Raiders football — schedule, live scores, record, rankings (AP, Coaches, CFP), and news alerts.

![Texas Tech Red & Black theme](https://img.shields.io/badge/Team-Texas%20Tech%20Red%20Raiders-cc0000)
![Platform](https://img.shields.io/badge/Platform-Windows-0078d4)

## Features

- **Season schedule** — View full schedules for any season from 2000 through two years in the future
- **Live score tracking** — Real-time score updates during games with Windows toast notifications
- **Record tracking** — Overall and conference (Big 12) win-loss records
- **Rankings** — AP Poll, Coaches Poll, and CFP Playoff Committee rankings when available
- **News feed** — Latest Texas Tech football news with alerts for significant stories
- **Score alerts** — Notifications for game starts, score changes, and final scores
- **System tray** — Runs in the background; close button minimizes to tray
- **Multi-season support** — Switch between current, past, and future seasons

## Prerequisites

1. **Node.js 18+** — [Download Node.js](https://nodejs.org/)
2. **CFBD API Key** (free) — Register at [collegefootballdata.com/key](https://collegefootballdata.com/key)

## Quick Start (Development)

```bash
# Install dependencies
npm install

# Run in development mode (web UI in browser)
npm run dev

# Run as Electron desktop app
npm run electron:dev
```

Open http://localhost:5173 in your browser, or use `npm run electron:dev` for the full desktop experience with notifications.

## Building for Windows

Build a Windows installer (.exe) on a Windows machine:

```bash
npm install
npm run electron:build
```

The installer will be created in the `release/` folder.

For a portable executable (no install required):

```bash
npm run electron:build:portable
```

## First-Time Setup

1. Launch the app
2. Go to **Settings**
3. Enter your free CFBD API key from [collegefootballdata.com/key](https://collegefootballdata.com/key)
4. Select the season you want to track
5. Configure notification preferences
6. Click **Save Settings**

## Data Sources

| Data | Source |
|------|--------|
| Schedule, scores, records, rankings | [College Football Data API](https://collegefootballdata.com/) |
| News | Google News RSS (Texas Tech Red Raiders football) |

### Rankings availability

- **AP Top 25** and **Coaches Poll** — Typically available from late August through the season
- **CFP Playoff Committee Rankings** — Released weekly starting in late October (when Texas Tech is tracked in the committee's rankings)

## Settings

| Setting | Description |
|---------|-------------|
| API Key | Your CFBD API key (required for schedule/scores/rankings) |
| Season | Year to display (2000 – current year + 2) |
| Score Alerts | Windows notifications for game events |
| News Alerts | Notifications for significant news stories |
| Refresh Interval | How often to poll for updates (1–30 minutes) |

## System Tray

When you close the app window, it minimizes to the system tray and continues checking for score updates. Right-click the tray icon to show the app or quit completely.

## Tech Stack

- **Electron** — Windows desktop shell with native notifications and system tray
- **React + TypeScript** — UI
- **Vite** — Build tooling
- **CFBD API** — College football data

## License

MIT
