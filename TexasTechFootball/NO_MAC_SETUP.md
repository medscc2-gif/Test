# No Mac? Use TestFlight (You Have a Developer Account)

You have exactly what you need: an **Apple Developer account**. You do **not** need a Mac or Xcode on your iPhone. A cloud build service compiles the app on a remote Mac and sends it to TestFlight. You install it on your phone like any other app.

**Total time:** ~45 minutes the first time (mostly waiting for Apple to process the build)

---

## Step 1: Confirm your Developer account

1. Go to [developer.apple.com/account](https://developer.apple.com/account)
2. Sign in and confirm your membership is **Active**
3. Note your **Team ID** (10 characters) — found under **Membership details**

---

## Step 2: Create the app in App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Click **Apps** → **+** → **New App**
3. Fill in:
   - **Platform:** iOS
   - **Name:** Texas Tech Football (or any name you like)
   - **Bundle ID:** Create a new one, e.g. `com.YOURNAME.TexasTechFootball`
     - Must be unique. Replace `YOURNAME` with something only you use.
   - **SKU:** `texastech-football` (anything unique is fine)
4. Click **Create**

> **Important:** The Bundle ID you create here must match the app. If you use Codemagic (Step 4), you'll enter this same Bundle ID there. The default in the code is `com.example.TexasTechFootball` — Codemagic can override it during signing, or you can ask someone to change it in the project for you.

---

## Step 3: Create an App Store Connect API key

Cloud build services need this to upload to TestFlight on your behalf.

1. In App Store Connect → **Users and Access** → **Integrations** → **App Store Connect API**
2. Click **+** to generate a new key
3. Name it `Codemagic` (or `GitHub Actions`)
4. Role: **App Manager** (or Admin)
5. Click **Generate**
6. **Download the `.p8` file immediately** — you can only download it once
7. Save these three values somewhere safe:
   - **Issuer ID** (shown at the top of the API page)
   - **Key ID** (shown next to your new key)
   - **The `.p8` file** you downloaded

---

## Step 4: Build in the cloud with Codemagic (recommended)

[Codemagic](https://codemagic.io) has a free tier (500 build minutes/month) and a visual UI — no command line needed.

### 4a. Sign up and connect GitHub

1. Go to [codemagic.io/signup](https://codemagic.io/signup)
2. Sign up with your **GitHub account**
3. Grant access to the repo: `medscc2-gif/Test`

### 4b. Add your Apple credentials

1. In Codemagic → **Teams** → your team → **Integrations**
2. Click **Connect** next to **Developer Portal** → sign in with your Apple ID
3. Click **Connect** next to **App Store Connect**
4. Upload your `.p8` API key and enter Issuer ID + Key ID

### 4c. Configure the app

1. Click **Add application** → select the `Test` repo
2. Codemagic should detect `TexasTechFootball/codemagic.yaml`
3. Click **Start your first build**
4. When prompted for code signing:
   - **Bundle ID:** the one you created in Step 2 (e.g. `com.YOURNAME.TexasTechFootball`)
   - **Distribution type:** App Store
   - Enable **Automatic code signing** (Codemagic creates certificates for you)

### 4d. Enable TestFlight publishing

In the workflow settings (or `codemagic.yaml` is already configured for this):
- Turn on **Publish to App Store Connect**
- Turn on **Submit to TestFlight**

### 4e. Start the build

1. Click **Start new build** → select branch `cursor/texas-tech-football-app-0f5e` (or `main` once merged)
2. Wait ~15–20 minutes for the build to finish
3. Codemagic uploads the `.ipa` to App Store Connect automatically

---

## Step 5: Install on your iPhone

1. Wait **10–20 more minutes** for Apple to process the build in App Store Connect
2. Go to App Store Connect → your app → **TestFlight**
3. Under **Internal Testing**, click **+** and add yourself as a tester (use the email tied to your Apple ID)
4. On your iPhone, install **TestFlight** from the App Store
5. Open the email invite (or find the app in TestFlight) → tap **Install**

Done. The app is on your phone. No Mac was involved.

---

## Step 6: After installing

1. Open **Texas Tech Football** → **Alerts** tab → **Enable Notifications**
2. Add the widget: long-press home screen → **+** → search **Texas Tech**
3. Pull down on any tab to refresh game data

---

## Alternative: GitHub Actions (if you prefer not to use Codemagic)

This repo also has a GitHub Actions workflow. It requires adding secrets to your GitHub repo:

| Secret | Where to find it |
|--------|-----------------|
| `DEVELOPMENT_TEAM` | developer.apple.com → Membership → Team ID |
| `APPSTORE_ISSUER_ID` | App Store Connect → API → Issuer ID |
| `APPSTORE_KEY_ID` | The Key ID from your API key |
| `APPSTORE_PRIVATE_KEY` | Paste entire contents of the `.p8` file |

Then go to GitHub → **Actions** → **iOS Build** → **Run workflow**.

> Codemagic is easier for first-time setup because it handles code signing through a visual UI. GitHub Actions requires more manual certificate setup.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "No accounts with App Store Connect access" | Make sure your Apple ID is added in App Store Connect under Users and Access |
| Build fails on signing | Double-check Bundle ID matches App Store Connect exactly |
| TestFlight invite never arrives | Check spam; make sure tester email matches your Apple ID email |
| "Developer Mode required" | iPhone Settings → Privacy & Security → Developer Mode → On (only needed for direct USB installs, not TestFlight) |
| Widget shows stale data | Open the app once to refresh |

---

## What you'll pay

| Item | Cost |
|------|------|
| Apple Developer Program | $99/year (you already have this) |
| Codemagic | Free for 500 build min/month |
| TestFlight | Free |
| Your iPhone | Already have it |

---

## Quick checklist

- [ ] Developer account active
- [ ] App created in App Store Connect with a unique Bundle ID
- [ ] App Store Connect API key downloaded (`.p8`)
- [ ] Codemagic account connected to GitHub + Apple
- [ ] First build completed successfully
- [ ] TestFlight invite accepted on iPhone
- [ ] Notifications enabled in app

Guns Up!
