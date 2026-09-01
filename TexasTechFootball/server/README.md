# Push Notification Server

Polls ESPN for Texas Tech football updates and sends push notifications to registered iPhones.

## What it sends

- **Live score updates** during games
- **Final scores** when games end
- **Rivalry game alerts** (TCU, Baylor, Texas, Oklahoma State)
- **Breaking news** when new ESPN articles are published

## Quick start

```bash
cd server
node index.js
```

Server runs at `http://localhost:3000`.

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server status and device count |
| `/register` | POST | Register device token `{ "token": "...", "platform": "ios" }` |

## Deploy

Deploy to any Node.js host (Railway, Render, Fly.io, a VPS):

1. Push the `server/` folder to your host
2. Set `PORT` environment variable
3. Copy your server URL into the app's **Alerts → Push server URL** field

## Production APNs (real iPhone push)

For notifications to appear on a locked iPhone, connect Apple Push Notification service:

1. Create an APNs Auth Key in [Apple Developer](https://developer.apple.com/account/resources/authkeys/list)
2. Set environment variables:
   - `APNS_KEY_ID`
   - `APNS_TEAM_ID`
   - `APNS_KEY_PATH` (path to `.p8` file)
   - `APNS_BUNDLE_ID` (e.g. `com.yourname.TexasTechFootball`)

Then add the `apn` npm package and wire up `sendPush()` in `index.js`.

## Alternative: OneSignal or Firebase

If you prefer not to manage APNs directly, use [OneSignal](https://onesignal.com) or Firebase Cloud Messaging — both have free tiers and handle APNs for you.
