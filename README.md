# 📍 Live Location Tracker

Apne phone ki **live location** map par dekho — phone kho jaye ya chori ho to uski **last location** pata chalegi. Koi app install nahi karni, browser me chalta hai.

## Kaise kaam karta hai

1. **Tracker phone** (jise track karna hai) par ye page kholo → Room Code daalo → **Start sharing** dabao. Phone apni GPS location har kuch second me bhejta rahega.
2. **Dusre device** (tumhara doosra phone / laptop) par wahi page kholo → wahi Room Code daalo → **Dekho** tab me live map par phone ki location dikhegi — naam, accuracy, speed, battery aur "last seen" time ke saath.
3. **Room Code ek secret password jaisa hai.** Jiske paas code hai, wahi location dekh sakta hai. Code kisi se share mat karo.

Location **Firebase Realtime Database** (free) me save hoti hai, isliye dono device par live update hoti hai. Map **OpenStreetMap** (free, koi API key nahi) par dikhta hai.

## Setup — 5 minute

### 1. Firebase project banao (free)
1. https://console.firebase.google.com kholo → **Add project** → naam do (jaise `live-tracker`) → Google Analytics off rakh sakte ho → **Create project**.
2. Left menu: **Build → Realtime Database → Create Database** → location koi bhi (jaise `asia-southeast1`) → **Start in locked mode**.

### 2. Database rules lagao
1. Realtime Database page par **Rules** tab kholo.
2. Wahan ka content delete karke is repo ki `database.rules.json` wali lines paste karo → **Publish**.
3. Matlab: root par koi read/write nahi — sirf jiske paas Room Code hai, wahi us room ki location dekh/badhal sakta hai.

### 3. Web app config nikalo
1. Project settings (⚙️ gear icon, top-left) → **Your apps → Web app (`</>`)** → nickname do → **Register app**.
2. Jo config dikhe (apiKey, databaseURL, …), use `firebase-config.example.js` ko copy karke **`firebase-config.js`** naam se save karo aur values paste karo.
3. ⚠️ Ye file kabhi GitHub par **public mat karo** — isliye ye repo me hai hi nahi; sirf apne deploy me rakho. (Keys browser me waise bhi dikhti hain — asli security Rules + Room Code hain.)

### 4. GitHub Pages par deploy karo (free hosting)
1. Is repo ki **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, folder `/ (root)` → Save**.
2. 1–2 minute me link milega: `https://rohitrajkumar1477-dev.github.io/live-location-tracker-by-Rex-Tiwari/`
3. ⚠️ Geolocation sirf **HTTPS** par chalta hai — GitHub Pages HTTPS deta hai, isliye yahi use karo. `file://` se khologe to location nahi milegi.

## Use kaise karein

**Tracker phone par (jise track karna hai):**
1. Pages wala link kholo → Room Code + phone ka naam daalo → **Track karo** tab → **Start sharing** → Location permission **Allow** karo.
2. Page khula rehne do. Best hai: phone ko charging par rakho, aur browser ko background me band mat hone do.

**Dusre device par (dekhne ke liye):**
1. Wahi link kholo → wahi Room Code daalo → **Dekho** tab → map par live marker dikhega.
2. Device par tap karo to Google Maps me khol sakte ho (rasta dekhne ke liye).

**Chori hone par:**
1. Dusre device se **Dekho** tab kholo — **last location** dikhegi, chahe phone band bhi ho gaya ho (Stop dabaye bina last location delete nahi hoti).
2. Turant police complaint karo aur location screenshot ke saath share karo. **Khud chor ke peeche mat jao.**

## ⚠️ Imaandaar limits — zaroor padho

- **Ye OS-level tracker nahi hai.** Browser band hote hi, ya internet off hote hi, sharing ruk jayegi. Chor page band kar de to live update band — sirf last location milegi.
- **Asli chori-protection ye hai:** Android par **Google Find My Device** (Settings → Security → Find My Device → ON) aur iPhone par **Find My** ON rakho. Ye system-level hain — phone reset hone par bhi kaam karte hain, aur SIM nikale bina bhi last location dikhate hain. **Is app ko uska replacement mat samjho — extra safety samjho.**
- Location accuracy GPS par depend karti hai (±5–50 meter aam hai; building ke andar kharab ho sakti hai).

## Privacy

- Sirf **apne ya family ke phone** par, **unki permission se** use karo. Kisi aur ka phone bina bataye track karna galat hai aur kanoon ke khilaf ho sakta hai.
- Room Code lamba aur random rakho (jaise `meri-family-4821-xyz`), aur kisi se share mat karo.
- Stronger security chahiye to Firebase Authentication (email login) add karo — abhi ke liye Room Code hi protection hai.

## Files

| File | Kaam |
|---|---|
| `index.html` | Tracker + Viewer, ek hi page |
| `app.js` | GPS watch, Firebase sync, map logic |
| `styles.css` | Design |
| `firebase-config.example.js` | Config ka sample — copy karke `firebase-config.js` banao |
| `database.rules.json` | Realtime Database ke security rules |
| `LICENSE` | MIT |

## Local test (bina deploy ke)

```bash
# Python se local server (https nahi — GPS ke liye localhost chalta hai)
python3 -m http.server 8000
# phir kholo: http://localhost:8000
```

> Note: `firebase-config.js` file repo me nahi hai (gitignore me hai) — apni config khud banao, upar Step 3 dekho.
