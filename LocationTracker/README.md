# Location Tracker

An iPhone app built with SwiftUI that records your GPS location over time and generates shareable trip reports.

## Features

- **Live tracking** — Start and stop recording with a live map, distance, and duration stats
- **Trip history** — Browse past trips with route maps and waypoint details
- **Reports** — Generate text or PDF reports with trip summary, coordinates, speed, and altitude
- **Share** — Export reports via the iOS share sheet (Messages, Mail, Files, etc.)
- **Local storage** — All data stays on your device

## Requirements

- Xcode 15 or later
- iOS 17.0+
- A physical iPhone (location services do not work in the Simulator for real GPS data)

## Getting Started

1. Open `LocationTracker/LocationTracker.xcodeproj` in Xcode
2. Select your **Development Team** under Signing & Capabilities for the LocationTracker target
3. Connect your iPhone and select it as the run destination
4. Build and run (`Cmd + R`)
5. When prompted, allow location access

## How to Use

### Track a Trip

1. Open the **Track** tab
2. Optionally enter a trip name
3. Tap **Start Tracking**
4. Move around — the app records waypoints every ~10 meters
5. Tap **Stop Tracking** when finished

### View History

1. Open the **History** tab
2. Tap any trip to see the route map, summary stats, and waypoint list

### Generate a Report

1. Open a trip from History
2. Tap **Report**
3. Choose **Text Report** or **PDF Report**
4. Tap **Share** to send or save the report

## Project Structure

```
LocationTracker/
├── LocationTracker.xcodeproj
└── LocationTracker/
    ├── LocationTrackerApp.swift    # App entry point
    ├── ContentView.swift             # Tab navigation
    ├── Models/
    │   ├── LocationPoint.swift       # Single GPS reading
    │   └── TrackingSession.swift     # Trip with stats
    ├── Services/
    │   ├── LocationManager.swift     # Core Location wrapper
    │   ├── StorageService.swift      # JSON persistence
    │   └── ReportService.swift       # Text/PDF generation
    └── Views/
        ├── TrackingView.swift        # Live tracking UI
        ├── SessionListView.swift     # Trip history list
        ├── SessionDetailView.swift   # Trip detail + map
        └── ReportView.swift          # Report preview + share
```

## Permissions

The app requests **When In Use** location permission. Background location mode is declared in `Info.plist` for continued tracking if you later enable **Always** authorization.

## Privacy

Location data is stored locally in the app's Documents directory as JSON. Nothing is sent to any server.
