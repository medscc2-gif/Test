# Texas Tech Football

An iPhone app for Texas Tech Red Raiders football fans. Track the full season schedule, win/loss record, national rankings, CFP standings, rivalry history, and get alerts for games and news.

**Don't have a Mac?** See [INSTALL_ON_IPHONE.md](INSTALL_ON_IPHONE.md) for how to get the app on your iPhone without Xcode.

## Features

- **Home dashboard** — Team logo, season record, AP/Coaches/CFP rankings, and next game
- **Full schedule** — Every game with opponent, date, venue, TV broadcast, and final scores
- **Rivalry tracker** — Series records vs Texas, TCU, Baylor, Oklahoma State, and Texas A&M
- **News feed** — Latest Texas Tech football headlines from ESPN
- **Live score widget** — Home screen widget showing live scores and next game
- **Alerts**
  - Game reminders (24 hours and 1 hour before kickoff)
  - Final score notifications when games end
  - Breaking news notifications for new articles
  - Server push notifications for live scores and rivalry games
- **Background refresh** — Keeps data and alerts up to date

## Data Source

Live data is pulled from ESPN's public college football API (no API key required). Rankings include:

- AP Top 25
- AFCA Coaches Poll
- College Football Playoff ranking (shown when ESPN publishes it during the season)

## Requirements

- Xcode 15+
- iOS 17.0+
- Internet connection

## Getting Started

1. Open `TexasTechFootball/TexasTechFootball.xcodeproj` in Xcode
2. Select your **Development Team** under Signing & Capabilities
3. Build and run on your iPhone or the Simulator
4. Go to the **Alerts** tab and enable notifications

## App Tabs

| Tab | Description |
|-----|-------------|
| Home | Record, rankings, next game |
| Schedule | Full season schedule with results |
| News | Latest headlines (tap to open in browser) |
| Rivalries | Head-to-head records vs key rivals |
| Alerts | Configure local and server push notifications |

## Project Structure

```
TexasTechFootball/
├── TexasTechFootball.xcodeproj
└── TexasTechFootball/
    ├── Models/           # Game, TeamRecord, NewsArticle
    ├── Services/         # ESPN API, notifications, push, background refresh
    ├── ViewModels/       # AppViewModel
    └── Views/            # Dashboard, Schedule, News, Rivalries, Settings
├── TexasTechWidget/      # Live score home screen widget
└── server/               # Push notification server (Node.js)
```

## Notes

- CFP rankings are only available once ESPN publishes them (typically mid-season). The app shows "Not yet released" until then.
- News and score alerts depend on background app refresh. For best results, keep Background App Refresh enabled in iOS Settings.
- This app is unofficial and not affiliated with Texas Tech University or ESPN.
