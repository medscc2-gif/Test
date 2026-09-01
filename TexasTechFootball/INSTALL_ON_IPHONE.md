# How to Install on Your iPhone (Without Xcode on Your Phone)

**You never need Xcode on your iPhone.** Xcode is a Mac app used to *build* iOS apps. Your phone only needs to *install* the finished app.

Here are your options, from easiest to most involved.

---

## Option 1: TestFlight (Recommended)

TestFlight lets you install the app on your iPhone like any App Store app — tap a link, install, done.

### What you need
- An **Apple Developer account** ($99/year) — [developer.apple.com](https://developer.apple.com/programs/)
- A **Mac** (yours, a friend's, or a cloud Mac — see Option 3)
- About 30 minutes for first-time setup

### Steps

1. **Get the code on a Mac** with Xcode 15+ installed
   - Clone this repo, or download it as a ZIP

2. **Open the project**
   ```
   TexasTechFootball/TexasTechFootball.xcodeproj
   ```

3. **Sign in** with your Apple ID in Xcode → Settings → Accounts

4. **Set your Team** on both targets:
   - `TexasTechFootball` (main app)
   - `TexasTechWidget` (widget extension)

5. **Archive and upload**
   - Product → Archive
   - Distribute App → App Store Connect → Upload
   - Wait for processing (~10–20 min)

6. **Add yourself as a tester** in [App Store Connect](https://appstoreconnect.apple.com) → TestFlight → Internal Testing

7. **Install TestFlight** on your iPhone from the App Store, then tap the invite link

---

## Option 2: Cloud Build with GitHub Actions (No Mac Needed)

This repo includes a GitHub Actions workflow that builds the app in the cloud. You still need an Apple Developer account for TestFlight.

### Steps

1. **Enroll** in the Apple Developer Program ($99/year)

2. **Create an App Store Connect API key**
   - App Store Connect → Users and Access → Integrations → App Store Connect API
   - Download the `.p8` key file

3. **Add GitHub repository secrets**
   | Secret | Value |
   |--------|-------|
   | `APPSTORE_ISSUER_ID` | From App Store Connect API |
   | `APPSTORE_KEY_ID` | Key ID |
   | `APPSTORE_PRIVATE_KEY` | Contents of the `.p8` file |
   | `DEVELOPMENT_TEAM` | Your 10-character Team ID |
   | `PROVISIONING_PROFILE` | Base64-encoded provisioning profile (optional for first run) |

4. **Push to GitHub** and run the **iOS Build** workflow

5. **Download from TestFlight** once the build is uploaded

> **Tip:** Services like [Codemagic](https://codemagic.io) and [Bitrise](https://bitrise.io) offer free tiers with a visual UI if GitHub Actions feels complex.

---

## Option 3: Borrow or Rent a Mac

If you don't own a Mac:

| Service | What it does | Cost |
|---------|-------------|------|
| [MacinCloud](https://www.macincloud.com) | Rent a cloud Mac by the hour | ~$1/hr |
| [MacStadium](https://www.macstadium.com) | Cloud Mac for developers | Varies |
| Friend's Mac | Install Xcode, build once | Free |

Use any Mac for 1–2 hours to archive and upload to TestFlight. After that, you install updates on your iPhone without touching a Mac again.

---

## Option 4: Run Directly from a Mac (Development)

If you have access to a Mac with Xcode:

1. Connect your iPhone via USB (or use wireless debugging)
2. Open the project in Xcode
3. Select your iPhone as the run destination
4. Click **Run** (▶)

Your iPhone must be in **Developer Mode** (Settings → Privacy & Security → Developer Mode).

> Free Apple IDs can run apps for 7 days before re-signing. A paid Developer account removes this limit.

---

## After Installing

1. Open the app and go to **Alerts** → tap **Enable Notifications**
2. Add the **Live Score widget**: long-press your home screen → **+** → search "Texas Tech"
3. (Optional) Deploy the push server and enter your server URL in **Alerts → Push server URL**

---

## Quick FAQ

**Do I need Xcode on my iPhone?**
No. Xcode only runs on Mac. Your iPhone just installs the built app.

**Can I install without paying Apple $99?**
Only temporarily. A free Apple ID lets you sideload via Xcode for 7 days. For a permanent install, you need the Developer Program or TestFlight from someone who has it.

**Can I put this on the App Store?**
Yes, with a Developer account. Archive → Upload → submit for App Store review.

**The widget shows old data?**
Open the app once to refresh. The widget updates when the app fetches new data from ESPN.

---

Guns Up! 🔴⚫
