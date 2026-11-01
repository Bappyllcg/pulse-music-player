# Pulse Player 🎵 📻 📺

> A sleek, private, all-in-one entertainment hub for offline personal music, free online streaming, live radio, and television broadcasts. Designed with an Apple iOS glassmorphic aesthetic.

[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-orange?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Privacy: Zero Tracking](https://img.shields.io/badge/Privacy-Zero%20Tracking-green)](#-privacy--architecture)

---

## ✨ Features at a Glance

Pulse brings all your audio and video entertainment together into a single, blazing-fast, ad-free Progressive Web App (PWA).

```
┌────────────────────────────────────────────────────────────────────────┐
│                              PULSE PLAYER                              │
├─────────────────┬──────────────────┬─────────────────┬─────────────────┤
│   🎵 Offline    │    🌐 Online     │    📻 Live      │    📺 Live      │
│     Music       │      Music       │     Radio       │       TV        │
├─────────────────┼──────────────────┼─────────────────┼─────────────────┤
│ • IndexedDB     │ • Jamendo Catalog│ • Radio Browser │ • HLS.js Engine │
│ • No Internet   │ • Top Genres     │ • 🇧🇩 BD Default │ • 20+ Countries │
│ • Lock Screen   │ • Live Search    │ • Global Genres │ • 1080p ABR Res │
│ • Waveform Seek │ • Instant Stream │ • One-Tap Play  │ • Diagnostics   │
└─────────────────┴──────────────────┴─────────────────┴─────────────────┘
```

---

## 🌟 Four Core Entertainment Pillars

### 1. 🎵 Offline Personal Music Library
Built for audiophiles who cherish their own audio files and want a premium, native-feeling listening experience.
- **100% Local & Private:** Your audio files are saved securely in browser **IndexedDB** on your device. Nothing is uploaded to any remote server.
- **True Airplane Mode Playback:** Works completely offline without Wi-Fi or cellular data.
- **Lock Screen & MediaSession Controls:** View high-res artwork, track titles, artist names, scrub the playback timeline, and skip songs directly from your phone's lock screen, Control Center, or Bluetooth headphones.
- **Interactive Waveform Scrubber:** Visual waveform bar for fluid and accurate track scrubbing.
- **Sleep Timer:** Relax and fall asleep without battery drain. Set timers for 5, 10, 15, 30, 45, 60 minutes or stop at the *End of current track*.
- **Playlist & Queue Management:** Liked/Favorites collection, Recently Played history, Up Next queue reordering, Shuffle (🔀), and Repeat (🔁).
- **Format Support:** MP3, M4A, AAC, WAV, FLAC, and OGG.

### 2. 🌐 Jamendo Online Music Discovery
Discover and stream millions of free, legal, and royalty-free tracks directly inside Pulse.
- **Curated Genres:** Filter by Synthwave, Lo-Fi, Rock, Chillout, Electronic, Pop, Jazz, Classical, Ambient, Indie, and more.
- **Instant Search:** Search songs, artists, or albums with responsive live queries.
- **Unified Audio Engine:** Streamed online tracks integrate smoothly with the background player and lock screen controls.

### 3. 📻 Live Global & Regional Radio
Tune into hundreds of high-quality digital radio stations worldwide powered by the Radio Browser API.
- **Regional Prioritization:** Default focus on **Bangladesh 🇧🇩** stations (Dhaka FM, Radio Foorti, ABC Radio, BBC Bangla, etc.).
- **Global Music & Talk Genres:** News, Classical, Islamic, Pop, Dance, Rock, and International Talk.
- **Instant Live Streaming:** Station artwork, live status, and one-tap switching.

### 4. 📺 Pro Live TV Broadcasts & Cinema Player
Experience live television streaming powered by iptv-org and an advanced, fine-tuned HLS.js video engine.
- **20+ Global Nations & Priority Regions:**
  - 🇧🇩 **Bangladesh** (1st priority)
  - 🇮🇳 **India** (2nd priority)
  - 🇵🇰 **Pakistan** (3rd priority)
  - 🇺🇸 United States, 🇬🇧 United Kingdom, 🇸🇦 Saudi Arabia, 🇦🇪 UAE, 🇶🇦 Qatar, 🇨🇦 Canada, 🇦🇺 Australia, 🇹🇷 Turkey, 🇩🇪 Germany, 🇫🇷 France, 🇪🇸 Spain, 🇮🇹 Italy, 🇯🇵 Japan, 🇰🇷 South Korea, 🇲🇾 Malaysia, 🇮🇩 Indonesia, 🇸🇬 Singapore, 🇧🇷 Brazil, and 🌍 World News.
- **Category Filters:** All Channels, News, Entertainment, Sports, Music, Movies, Kids, and Documentaries.
- **Real-Time Stream Health & Latency Meter:** Dynamic ping latency meter (`ms`) and cellular/Wi-Fi signal strength indicators (`Excellent`, `Good`, `Fair`, `Poor`).
- **Smart Dead-Stream Filtering:** Automatically checks streams in the background and hides offline channels to keep your channel list clean and responsive.
- **Pro Cinema Player Controls:**
  - **Adaptive Bitrate (ABR) & Manual Resolution:** Auto, 1080p, 720p, 480p, 360p.
  - **Aspect Ratio Switcher:** Fit (Letterbox), 16:9 Widescreen, 4:3 Classic, and Fill / Zoom.
  - **Auto-Scrolling Zapping Guide:** Bottom horizontal channel carousel automatically scrolls and centers the active channel on switch, zap, or next/prev.
  - **Quick Channel Zapping:** On-screen channel changer buttons with Apple TV-style animated OSD.
  - **Diagnostics HUD:** Real-time stream telemetry overlay displaying live ping, FPS, dropped frames, bitrate, and buffer health.
  - **Clean Interface:** Music mini-player bar automatically hides on the TV screen for an uncluttered cinema experience.

---

## 📱 How to Install Pulse (PWA)

Pulse is a Progressive Web App (PWA) that installs directly from the web without App Store or Play Store friction.

### 🍏 On iPhone & iPad (iOS Safari)
1. Open [`https://bappyllcg.github.io/pulse-music-player/`](https://bappyllcg.github.io/pulse-music-player/) in **Safari**.
2. Tap the **Share** button (the square icon with an upward arrow at the bottom).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add** in the top-right corner.
5. Open **Pulse** from your home screen — it will launch in standalone fullscreen mode without browser URL bars, exactly like a native iOS app!

### 🤖 On Android (Google Chrome)
1. Open [`https://bappyllcg.github.io/pulse-music-player/`](https://bappyllcg.github.io/pulse-music-player/) in **Chrome**.
2. Tap the **three-dot menu** (⋮) in the top-right corner.
3. Tap **Install app** or **Add to Home screen**.
4. Confirm installation and launch Pulse from your app drawer.

### 💻 On Mac / Windows / Linux
1. Open the URL in **Chrome**, **Edge**, or **Brave**.
2. Click the **Install Pulse** icon in the browser address bar.
3. Pulse runs in its own dedicated, high-performance desktop window.

---

## 🛠️ Tech Stack & Architecture

- **Frontend Framework:** [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Tooling:** [Vite](https://vitejs.dev/) with [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with custom glassmorphism and safe-area insets
- **Streaming Engine:** [HLS.js](https://github.com/video-dev/hls.js/) with fine-tuned live low-latency and buffer management
- **Icons:** [Lucide Vue Next](https://lucide.dev/)
- **Audio APIs:** HTML5 Audio API & Web MediaSession API
- **Local Storage:** Client-side IndexedDB for offline audio files and metadata caching

---

## 💻 Local Development Setup

To run or contribute to Pulse Player locally:

```bash
# 1. Clone the repository
git clone https://github.com/bappyllcg/pulse-music-player.git
cd pulse-music-player

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Type check and build for production
npm run build

# 5. Preview production build locally
npm run preview
```

---

## 🔒 Privacy & Architecture

- **Zero Tracking:** Pulse Player contains no third-party trackers, analytics, or behavioral surveillance code.
- **No Account Required:** No registration, email collection, or sign-ins.
- **Local Media Security:** Your imported offline audio files never leave your device's browser sandbox.
- **Direct Streaming:** Online music, radio, and television streams connect directly from public CDNs to your device.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
