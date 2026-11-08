<div align="center">

# 📍 Live Location Tracker

**by Rex Tiwari**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-0b5fff?style=for-the-badge)](https://rohitrajkumar1477-dev.github.io/live-location-tracker-by-Rex-Tiwari/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![Made by Rex Tiwari](https://img.shields.io/badge/Made%20by-Rex%20Tiwari-ffd166?style=for-the-badge)](https://github.com/rohitrajkumar1477-dev)

**See your phone's live location on the map — if it gets lost or stolen, you'll know its last location.**

🔴 Live tracking &nbsp;•&nbsp; 🗺️ Live map &nbsp;•&nbsp; 🔐 Room Code privacy &nbsp;•&nbsp; 📱 No app install — runs in the browser

</div>

---

## How it works

1. **On your phone**, open this page → enter a **Room Code** → tap **Start Sharing**. Your phone sends its GPS location every few seconds.
2. **On the other person's phone**, open the same page → enter the **same Room Code** → tap **Start Sharing**.
3. Done — **both phones see each other's live location on the same map**, labelled "My phone" and "Phone XXXX". No names to type, no accounts, no extra details.

**The Room Code works like a password.** Only people with the code can see the location. Never share it with strangers.

Locations are saved in **Firebase Realtime Database** (free), so both devices update live. The in-app map is **OpenStreetMap** (free, no API key). Every device has a **📍 Google Maps** button — tap it and that phone's live pin opens in real Google Maps.

### Extra features (all free)

- **Connection status** — the map card shows whether the app is connected to Firebase.
- **Movement trails** — each phone leaves a trail on the map so you can see where it has been.
- **Distance** — each device shows how far it is from your phone ("2.3 km away").
- **Invite link** — tap "Copy invite link" and send it to the other person; the link opens the page with the Room Code already filled in.
- **Colour-coded markers** — your phone is blue, other phones are red.
- **Last location is kept** — even if sharing stops or the phone goes offline, the last location stays on the map.

## About Google Maps — the honest truth

- Every device's live pin **opens in Google Maps** (tap the 📍 Google Maps button — it opens google.com/maps at the exact location).
- A **full Google Map inside the app** needs a Google Cloud **Maps API key + billing** (a card must be attached). That is why the in-app map is OpenStreetMap, which is free and needs no key.

## About Gmail / phone number / IMEI tracking — the honest truth

- **No app or website can track a phone directly by IMEI or phone number** — only the mobile carrier and the police can, using tower data. If a phone is stolen, the IMEI can be **blocked**: [CEIR (ceir.gov.in)](https://www.ceir.gov.in) — after that, the phone will not work on any SIM in India.
- **Tracking by Gmail ID means Google Find My Device.** With the same Gmail ID that is logged in on the phone, open [google.com/android/find](https://www.google.com/android/find) to ring, lock or erase the phone. It works at system level and is more powerful than this app.
- This app **does not ask for any Gmail ID, phone number or IMEI** — only the Room Code. Live location comes from this app; after a theft, Find My Device + CEIR + police is the way to go.

## Setup — 5 minutes

### 1. Create a Firebase project (free)
1. Open https://console.firebase.google.com → **Add project** → give it a name (e.g. `live-tracker`) → you can keep Google Analytics off → **Create project**.
2. Left menu: **Build → Realtime Database → Create Database** → pick any location (e.g. `asia-southeast1`) → **Start in locked mode**.

### 2. Add the database rules
1. On the Realtime Database page, open the **Rules** tab.
2. Delete its content and paste the lines from this repo's `database.rules.json` → **Publish**.
3. Meaning: no read/write at the root — only someone with the Room Code can see or change that room's locations.

### 3. Get the web app config
1. Project settings (⚙️ gear icon, top-left) → **Your apps → Web app (`</>`)** → give a nickname → **Register app**.
2. Copy the config shown (apiKey, databaseURL, …) into a file named **`firebase-config.js`** (copy `firebase-config.example.js` first) and paste the values.
3. ⚠️ These keys are visible in the browser anyway — the real security is the Rules + Room Code, so the config can live in the repo.

### 4. Deploy on GitHub Pages (free hosting)
1. In this repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, folder `/ (root)` → Save**.
2. In 1–2 minutes you get the link: `https://rohitrajkumar1477-dev.github.io/live-location-tracker-by-Rex-Tiwari/`
3. ⚠️ Geolocation only works over **HTTPS** — GitHub Pages gives you HTTPS, so use that. Opening with `file://` will not give a location.

## How to use

**On both phones (same steps):**
1. Open the Pages link → enter the **Room Code** → **Start Sharing** → allow the **Location** permission.
2. Keep the page open. Best: keep the phone on charging and don't let the browser close in the background.
3. Both phones appear **live on the map below**. Tap any device to open its live pin in **Google Maps** (to see the route).

**If a phone is stolen:**
1. Open the same link on another device — the **last location** will still show, even if the phone is switched off (the last location is never deleted unless sharing is stopped first).
2. File a police complaint immediately and share the location screenshot. **Do not go after the thief yourself.**

## ⚠️ Honest limits — please read

- **This is not an OS-level tracker.** As soon as the browser closes, or the internet goes off, sharing stops. If a thief closes the page, live updates stop — only the last location remains.
- **The real theft protection is:** on Android, **Google Find My Device** (Settings → Security → Find My Device → ON); on iPhone, **Find My** ON. These work at system level — they keep working even after a reset, and show the last location without the SIM. **Do not treat this app as a replacement for them — treat it as extra safety.**
- Location accuracy depends on GPS (±5–50 metres is normal; it can be worse indoors).

## Privacy

- Only use it on **your own or your family's phones**, **with their permission**. Tracking someone else's phone without telling them is wrong and may be against the law.
- Keep the Room Code long and random (e.g. `my-family-4821-xyz`), and don't share it with anyone else.
- For stronger security, add Firebase Authentication (email login) — for now, the Room Code is the protection.

## Files

| File | Purpose |
|---|---|
| `index.html` | Tracker + Viewer, one page |
| `app.js` | GPS watch, Firebase sync, map logic |
| `styles.css` | Design |
| `firebase-config.example.js` | Sample config — copy it to make `firebase-config.js` |
| `database.rules.json` | Realtime Database security rules |
| `LICENSE` | MIT |

## Local test (without deploying)

```bash
# Local server with Python (no https — localhost works for GPS)
python3 -m http.server 8000
# then open: http://localhost:8000
```

> Note: `firebase-config.js` is in the repo (Pages needs it) — its keys are visible in the browser anyway; the real security is the Rules + Room Code.
