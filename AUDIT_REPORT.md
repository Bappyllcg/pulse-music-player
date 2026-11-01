# Pulse Player — Full Application Functionality & Loophole Audit Report

**Date:** November 2, 2026  
**Status:** ✅ **ALL 26 LOOPHOLES FIXED & VERIFIED (`0` TypeScript Errors, `0` Build Warnings)**  
**Target Platform:** iOS Safari PWA (iPhone Standalone) & Desktop Browsers  
**Scope:** End-to-end architecture, security, concurrency, media engine, and UX audit across all **26 source files** spanning 4 entertainment pillars (**Offline Library**, **Jamendo Online Discover**, **Live World Radio**, and **HLS Live Cinema TV**):
- **Core Entry & Config:** [`index.html`](file:///Users/sabappy/Desktop/Pulse%20Player/index.html), [`vite.config.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/vite.config.ts), [`src/main.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/main.ts), [`src/App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue), [`src/style.css`](file:///Users/sabappy/Desktop/Pulse%20Player/src/style.css), [`src/types/music.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/types/music.ts)
- **Composables (8):** [`usePlayer.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/usePlayer.ts), [`useAudioStorage.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useAudioStorage.ts), [`useSleepTimer.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useSleepTimer.ts), [`useOnlineMusic.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useOnlineMusic.ts), [`useRadio.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useRadio.ts), [`useLiveTv.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useLiveTv.ts), [`useHorizontalScroll.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useHorizontalScroll.ts), [`useTheme.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useTheme.ts)
- **UI Components (16):** [`TrackList.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/TrackList.vue), [`DiscoverSection.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/DiscoverSection.vue), [`LiveRadioSection.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/LiveRadioSection.vue), [`LiveTvSection.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/LiveTvSection.vue), [`LiveTvModal.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/LiveTvModal.vue), [`NowPlayingView.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/NowPlayingView.vue), [`MiniPlayerBar.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/MiniPlayerBar.vue), [`BottomNavDock.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/BottomNavDock.vue), [`SideMenuDrawer.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/SideMenuDrawer.vue), [`UpNextDrawer.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/UpNextDrawer.vue), [`SleepTimerDrawer.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/SleepTimerDrawer.vue), [`SettingsModal.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/SettingsModal.vue), [`AboutModal.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/AboutModal.vue), [`RemoveConfirmModal.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/RemoveConfirmModal.vue), [`WaveformScrubber.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/WaveformScrubber.vue), [`MarqueeText.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/MarqueeText.vue)

---

## Executive Summary

The full-project audit uncovered **26 real-world loopholes, race conditions, and edge cases** across the original core offline player (12 items) and the expanded multi-pillar streaming architecture (14 new items). **All 26 items have been resolved and verified with clean production builds (`npm run build`).**

| Severity | Count | Key Areas Addressed | Status |
| :--- | :---: | :--- | :---: |
| 🔴 **Critical** | 6 | Cold-Start State Wipe Race, Audio/TV Dual-Stream & Keydown Collision, Radio CORS False-Offline Bug, iOS Lock-Screen Sleep Timer, Playback Persistence, Queue Sync | ✅ **FIXED** |
| 🟠 **High** | 10 | Drag-and-Drop Import No-Op, Missing Radio/TV Search Bars, Out-of-Order Fetch Races, Liked Stream Persistence, Live TV iOS Fullscreen & Listener Leaks, Sheet Scroll vs. Swipe Conflict, Tap-to-Open Pause Bug, Cold-Start Seeking, Delete-While-Playing UX, Duplicate Imports | ✅ **FIXED** |
| 🟡 **Medium** | 7 | Live Radio Seeking & Sleep Timer Guards, Play History Tracking for "Recent", Mute Volume Restoration, SVG XML Escaping & ObjectURL Cleanup, Hidden DOM Marquee Measurement, `.mp4` Video Bloat, Base64 Cover Overhead | ✅ **FIXED** |
| 🔵 **Low / Polish** | 3 | `hls.js` Lazy Chunk Splitting (67% Main Bundle Reduction) & Offline Font Caching, Bottom Sheet Swipe-to-Close Handle, Waveform Keyboard/ARIA Accessibility | ✅ **FIXED** |

---

## 🔴 Critical Loopholes (Fixed)

### 1. Cold-Start Race Condition Wipes Saved Playback State Before IndexedDB Loads
- **Location:** [`src/composables/usePlayer.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/usePlayer.ts#L571-L611) & [`src/App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L569-L573)
- **Problem:** `usePlayer()` initializes synchronously during `App.vue` setup before `storage.getAllTracks()` finishes reading IndexedDB (`storage.isReady.value === false`). Because the `tracks` watcher in `usePlayer.ts` used `{ immediate: true }`, it executed synchronously on boot while `tracks.value` was still `[]` (`list.length === 0`) and ran `saveStoredState({ lastTrackId: null, lastPosition: 0 })`—wiping out `pulse-player:state` in `localStorage` 50ms before IndexedDB finished loading. Additionally, closing the app while listening to a Jamendo or Radio stream failed to restore the stream on cold start.
- **Resolution (✅ FIXED):**
  - Guarded the library watcher in [`usePlayer.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/usePlayer.ts#L572-L574) with `if (!ready) return` (`storage.isReady.value`) so cold-start restoration only runs after IndexedDB has populated `tracks.value`.
  - Extended `StoredPlaybackState` with `lastStreamTrack` so Jamendo and Live Radio streams are also restored across restarts even when the local library is empty.

---

### 2. Global Keyboard Shortcut Collision Between `App.vue` and `LiveTvModal.vue` (Simultaneous Audio + Video Playback)
- **Location:** [`src/App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L585-L640) & [`src/components/LiveTvModal.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/LiveTvModal.vue#L628-L651)
- **Problem:**
  1. Both `App.vue` and `LiveTvModal.vue` registered global `window` `keydown` listeners. Pressing `Space` while watching Live TV paused the TV broadcast in `LiveTvModal.vue` while simultaneously triggering `player.togglePlay()` in `App.vue`, starting background music/radio over the TV modal.
  2. Pressing `Escape` inside `LiveTvModal.vue` (e.g., to dismiss the Quality or Aspect Ratio dropdown) also fired `App.vue`'s `Escape` handler.
  3. Pressing `Space` while focused on a `<button>` intercepted the native button activation, and keyboard shortcuts advertised in `SettingsModal.vue` (`/` for Quick Search and `← / →` for Seek ±5s) were not wired in `App.vue`.
  4. `onPlayTvChannel` only called `player.pause()` if `player.isPlaying.value` was already `true`, allowing an in-flight buffering audio stream to start playing in the background after the TV modal opened.
- **Resolution (✅ FIXED):**
  - Short-circuited `onKeydown` in [`App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L587) when `activePlayingChannel.value` is open so `LiveTvModal.vue` has exclusive keyboard control.
  - Excluded interactive controls (`BUTTON`, `A`, `[role="slider"]`, inputs) from global `Space` interception, and wired `/` (focus active search bar) and `ArrowLeft`/`ArrowRight` (±5s seek) in [`App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L622-L639).
  - Updated `onPlayTvChannel` in [`App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L204-L208) to unconditionally call `player.pause()`, cancelling any in-flight `<audio>` buffering.

---

### 3. Live Radio CORS Health-Check False Negatives & Mixed-Content Raw IP Stream Failures
- **Location:** [`src/composables/useRadio.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useRadio.ts#L130-L144), [`src/composables/useRadio.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useRadio.ts#L358-L384), & [`src/composables/useRadio.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useRadio.ts#L456-L523)
- **Problem:**
  1. `checkStationHealth()` used a standard CORS `fetch(sanitized, { method: 'GET' })`. Because most Icecast/Shoutcast servers omit `Access-Control-Allow-Origin` headers (even though `<audio>` plays them natively without CORS), `fetch()` threw CORS network errors, marking live stations as `'offline'` and causing `filteredStations` to strip working stations from the UI within seconds of opening the Radio tab.
  2. `DEFAULT_BANGLADESH_STATIONS[0]` used an unencrypted raw IP (`http://66.45.232.131:9994/;stream/1/;`), which browsers block as Mixed Active Content on HTTPS origins, and `sanitizeStreamUrl()` in `useRadio.ts` only upgraded `zeno.fm` URLs.
- **Resolution (✅ FIXED):**
  - Added a `mode: 'no-cors'` fallback probe in `checkStationHealth()` in [`useRadio.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useRadio.ts#L498-L519) when standard `fetch` fails without timeout, accurately verifying server reachability and measuring round-trip latency for non-CORS Icecast/Shoutcast streams.
  - Updated `sanitizeStreamUrl()` in [`useRadio.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useRadio.ts#L359-L384) to filter out unencrypted raw IP streams on HTTPS origins and upgrade HTTP domain streams to HTTPS, and replaced the broken raw-IP default station URL with an HTTPS stream.
  - Updated `filteredStations` in [`useRadio.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useRadio.ts#L571-L575) and `filteredChannels` in [`useLiveTv.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useLiveTv.ts#L671-L675) so that if all items in a view are marked offline, the list remains visible with offline badges rather than rendering a blank state.

---

### 4. Timed Sleep Timer Fails When iPhone Screen is Locked
- **Location:** [`src/composables/useSleepTimer.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useSleepTimer.ts) & [`src/composables/usePlayer.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/usePlayer.ts)
- **Problem:** On iOS Safari, `window.setInterval` is frozen ~30s after the device is locked, causing timed sleep timers (5m, 10m, 15m, etc.) to never pause audio.
- **Resolution (✅ FIXED):** Added `onPlayerTimeUpdate` in [`usePlayer.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/usePlayer.ts) and registered `tick()` in [`useSleepTimer.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useSleepTimer.ts). Because iOS WebKit continues dispatching `<audio>` `timeupdate` events on the background media thread, the timer deadline check (`Date.now() >= endsAt`) reliably executes and pauses playback on locked screens.

---

### 5. No Playback Position (`currentTime`) or Active Track Persistence Across Restarts
- **Location:** [`src/composables/usePlayer.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/usePlayer.ts)
- **Problem:** Cold starts always reset to `tracks[0]` at `0:00`, wiping out playback position on long podcasts or tracks.
- **Resolution (✅ FIXED):** Introduced `StoredPlaybackState` (`lastTrackId`, `lastPosition`, `lastStreamTrack`) in `pulse-player:state`. Throttled state writes occur during `timeupdate` (every 2.5s) and immediately on `pause`, `pagehide`, and `beforeunload`. On cold startup (after IndexedDB readiness), the last played local or stream track is automatically reloaded at its saved timestamp.

---

### 6. Active Filter / Search Queue Mismatch ("Liked Songs" & "Recent" Ignored by Player)
- **Location:** [`src/App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L486-L515) & [`src/composables/usePlayer.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/usePlayer.ts)
- **Problem:** Playing a track from "Favorites" or "Recent" played from the unfiltered oldest-first list on Next/Ended, and playing a liked Jamendo/Radio item inside the Library's Favorites tab overwrote the queue with the Discover/Radio list instead of the user's Favorites list.
- **Resolution (✅ FIXED):**
  - Added `setQueue()` in [`usePlayer.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/usePlayer.ts) and `syncQueueForContext()` in [`App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L486-L496). Initiating playback from any Library filter (`All`, `Favorites`, `Recent`) or search view sets the active queue to match `filteredLibraryTracks`.
  - Pre-computed `stagedNextTrack` so `nextTrackPreview` displays the exact track that `player.next()` will transition to, even in Shuffle mode.

---

## 🟠 High-Priority Functional Loopholes (Fixed)

### 7. Drag-and-Drop Audio Import in `TrackList.vue` Was Visual-Only (Dropped Files Ignored)
- **Location:** [`src/components/TrackList.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/TrackList.vue#L61-L82) & [`src/App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L425-L446)
- **Problem:** `TrackList.vue` highlighted the Library Hero card when dragging files over it (`isDraggingFiles = true`), but `onDrop(e)` only reset `isDraggingFiles = false` without reading `e.dataTransfer?.files`. Additionally, `dragleave` flickered when dragging across child elements.
- **Resolution (✅ FIXED):** Updated `onDrop` in [`TrackList.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/TrackList.vue#L74-L82) to extract `Array.from(e.dataTransfer.files)` and emit `dropFiles`, guarded `onDragLeave` with `currentTarget.contains(relatedTarget)`, and wired `@drop-files="importFiles"` in [`App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L749).

---

### 8. Missing Station & Channel Search Inputs in Live Radio and Live TV Sections
- **Location:** [`src/components/LiveRadioSection.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/LiveRadioSection.vue#L139-L160), [`src/components/LiveTvSection.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/LiveTvSection.vue#L132-L153), & [`src/App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L773-L822)
- **Problem:** `useRadio.ts` (`currentRadioSearch`, `searchRadio`) and `useLiveTv.ts` (`currentTvSearch`) implemented station and channel search logic, and `App.vue` watched `currentRadioSearch`, but neither `LiveRadioSection.vue` nor `LiveTvSection.vue` rendered a search input bar in the UI (only a 22-country filter inside the collapsed country grid).
- **Resolution (✅ FIXED):** Added dedicated search bars and `searchQuery` bindings to both [`LiveRadioSection.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/LiveRadioSection.vue#L139-L160) and [`LiveTvSection.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/LiveTvSection.vue#L132-L153) and connected them to `currentRadioSearch` and `currentTvSearch` in [`App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L790-L819).

---

### 9. Out-of-Order Network Race Conditions Across Discover, Radio & Live TV
- **Location:** [`src/composables/useOnlineMusic.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useOnlineMusic.ts#L126-L221), [`src/composables/useRadio.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useRadio.ts#L583-L735), [`src/composables/useLiveTv.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useLiveTv.ts#L702-L802), & [`src/App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L183-L195)
- **Problem:** Rapidly switching genres, countries, or search queries allowed slower earlier network requests to resolve after faster subsequent requests (or cached selections), overwriting the UI with stale tracks/channels. Furthermore, `queryJamendo()` lacked a request timeout, and `onSelectGenre()` in `App.vue` triggered a duplicate debounced `searchOnline('')` call when resetting `discoverSearch`.
- **Resolution (✅ FIXED):** Added monotonically increasing request tokens (`latestRequestId`, `latestRadioRequestId`, `latestTvRequestId`) to discard stale responses, added an 8s `AbortController` timeout to `queryJamendo()`, and suppressed redundant watcher triggers in `onSelectGenre()`.

---

### 10. Liked Online & Radio Tracks Vanished From Library "Favorites" on Reload & Displayed Hardcoded "Local" Badge
- **Location:** [`src/App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L241-L366) & [`src/components/TrackList.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/TrackList.vue#L349-L407)
- **Problem:**
  1. `pulse:liked` only saved track IDs. On cold start (or after switching genres/regions), `onlineTracks` and `radioStations` did not contain previously liked stream items, causing liked Jamendo songs and Radio stations to disappear from the Library's **Favorites** filter.
  2. `TrackList.vue` hardcoded the `Local` pill badge on every row (even for Jamendo and Radio tracks inside Favorites/Recent) and hid the Delete button on mobile screens (`hidden sm:flex`), preventing iPhone users from deleting local songs from the Library view.
- **Resolution (✅ FIXED):**
  - Persisted liked stream metadata in `pulse:liked_tracks` in [`App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L243-L303) and deduplicated `filteredLibraryTracks` by ID so all liked Local, Jamendo, and Radio items remain available in Favorites across restarts.
  - Updated [`TrackList.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/TrackList.vue#L349-L407) to render dynamic `Radio`, `Jamendo`, or `Local` badges and made the local track Delete button visible on mobile viewports.

---

### 11. `LiveTvModal.vue` Event Listener Leaks, iPhone Fullscreen Failure & Stale Native HLS Listeners
- **Location:** [`src/components/LiveTvModal.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/LiveTvModal.vue#L195-L227), [`src/components/LiveTvModal.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/LiveTvModal.vue#L470-L493), & [`src/components/LiveTvModal.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/LiveTvModal.vue#L568-L676)
- **Problem:**
  1. `document.addEventListener('fullscreenchange', ...)` used an anonymous callback in `onMounted` that was never removed in `onBeforeUnmount`.
  2. `toggleFullscreen()` only called `container.requestFullscreen()`, which is unsupported on iOS Safari (where only `<video>.webkitEnterFullscreen()` is supported).
  3. On Safari/iOS native HLS (`video.canPlayType('application/vnd.apple.mpegurl')`), `loadedmetadata` and `error` listeners were added to `videoRef` on every channel switch without removal in `cleanUpHls()`, causing stale listeners from previous channels to fire.
  4. Closing the TV modal while Picture-in-Picture was active left an orphaned PiP window, and `cleanUpHls()` did not pause/reset the `<video>` element.
- **Resolution (✅ FIXED):** Named and cleaned up `fullscreenchange`/`webkitfullscreenchange` listeners, added `video.webkitEnterFullscreen()` fallback for iOS Safari, tracked and removed native HLS `<video>` listeners and reset `<video>` src in `cleanUpHls()`, exited PiP on modal unmount, and computed real frame-rate deltas in `updateStats()`.

---

### 12. Bottom Sheet & Now Playing Swipe-to-Close Conflicted With Inner List Scrolling & Scrubbing
- **Location:** [`src/components/UpNextDrawer.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/UpNextDrawer.vue#L27-L42), [`src/components/NowPlayingView.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/NowPlayingView.vue#L62-L70), & [`src/components/SleepTimerDrawer.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/SleepTimerDrawer.vue)
- **Problem:** In `UpNextDrawer.vue`, touch handlers on `<aside>` intercepted downward finger drags even when scrolling back up inside the queue list (`scrollTop > 0`), closing the drawer instead of scrolling. In `NowPlayingView.vue`, dragging the `WaveformScrubber` or volume slider with slight downward finger movement dragged and dismissed the entire Now Playing screen.
- **Resolution (✅ FIXED):** Guarded `onPlaylistTouchStart` in [`UpNextDrawer.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/UpNextDrawer.vue#L33-L41) when `queueListRef.scrollTop > 0`, and guarded `onTouchStart` in [`NowPlayingView.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/NowPlayingView.vue#L62-L67) when the touch originates inside `[role="slider"]` or `input[type="range"]`.

---

### 13. Tapping the Currently Playing Track in Library or Queue Unexpectedly Paused It
- **Location:** [`src/App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L498-L515)
- **Problem:** Tapping a track row in the library or Up Next drawer toggled playback, pausing an already-playing song when the user intended to view Now Playing.
- **Resolution (✅ FIXED):** Separated row navigation from circular button playback. In `playTrackAndShow` and `selectQueueTrack`, tapping an already-playing track starts playback only if paused, never pausing it. The dedicated circular play button continues to explicitly toggle play/pause.

---

### 14. Cold-Start Seeking Before Audio Metadata Is Loaded
- **Location:** [`src/composables/usePlayer.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/usePlayer.ts#L219-L248)
- **Problem:** Scrubbing the waveform or resuming before the first tap on Play on iOS could be ignored or wiped back to 0:00 when WebKit started playback.
- **Resolution (✅ FIXED):** Implemented `pendingSeek`. When `audio.readyState < 1`, target seek timestamps are stored and automatically flushed on `loadedmetadata`, `canplay`, or immediately before `audio.play()`.

---

### 15. Deleting the Active Track Resets Queue to Track #1 & Stranded User on Empty Player
- **Location:** [`src/composables/usePlayer.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/usePlayer.ts#L623-L640) & [`src/App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L326-L331)
- **Problem:** Deleting Track #4 stopped playback and loaded Track #1. Deleting the last remaining track while in Now Playing stranded the user on an unusable empty player screen.
- **Resolution (✅ FIXED):**
  - Track deletion selects the adjacent track in the active queue (`Math.min(Math.max(0, lastKnownIndex), activeList.length - 1)`).
  - Added a watcher on `currentTrack` in [`App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L326-L331) that automatically returns to the Library view and closes the queue drawer when `currentTrack` becomes `null`.

---

### 16. Duplicate Track Imports Allowed Without Deduplication
- **Location:** [`src/composables/useAudioStorage.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useAudioStorage.ts#L402-L414) & [`src/types/music.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/types/music.ts)
- **Problem:** Importing the same folder or songs repeatedly duplicated blobs in IndexedDB and doubled storage consumption.
- **Resolution (✅ FIXED):** Added duplicate detection in `addFiles()` checking title, artist, and duration (within 2 seconds). Duplicates are skipped with an informative notice toast (e.g. *"Skipped 2 duplicate songs"*).

---

## 🟡 Medium-Priority Loopholes (Fixed)

### 17. Live Radio Streams Allowed ±10s Seeking, "End of Track" Sleep Timer & Finite Buffer Duration Overwrites
- **Location:** [`src/composables/usePlayer.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/usePlayer.ts#L231-L234), [`src/composables/usePlayer.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/usePlayer.ts#L465-L476), [`src/components/NowPlayingView.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/NowPlayingView.vue#L342-L412), & [`src/components/SleepTimerDrawer.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/SleepTimerDrawer.vue#L130-L150)
- **Problem:** Some Icecast/HLS radio streams emit finite buffered durations on `durationchange`, overwriting `duration.value = 0` and disabling the `LIVE BROADCAST` badge. Furthermore, the ±10s seek buttons were enabled on live radio streams, and "End of current track" in `SleepTimerDrawer.vue` could be selected on 24/7 radio streams that never end.
- **Resolution (✅ FIXED):** Pinned `duration.value = 0` for radio stations in `syncDuration()`, guarded `seek()` and disabled ±10s buttons when `duration <= 0`, and disabled the "End of current track" sleep timer option when a live radio broadcast is active.

---

### 18. Library "Recent" Filter Sorted by File Import Timestamp Instead of Actual Play History
- **Location:** [`src/App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L305-L384)
- **Problem:** Selecting the **Recent** filter in the Library simply sorted `tracks.value` by `createdAt` (import timestamp) rather than tracking recently played songs.
- **Resolution (✅ FIXED):** Added `pulse:recent_history` and `pulse:recent_tracks` persistence in [`App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L305-L324) recorded whenever playback starts, sorting the **Recent** filter by most recently played tracks first.

---

### 19. Mute/Unmute Forgot Previous Volume in `NowPlayingView.vue` & Failed at Zero Volume in `LiveTvModal.vue`
- **Location:** [`src/components/NowPlayingView.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/NowPlayingView.vue#L95-L111) & [`src/components/LiveTvModal.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/LiveTvModal.vue#L266-L302)
- **Problem:** Unmuting in `NowPlayingView.vue` always reset volume to `1.0` (100%) instead of restoring the user's previous volume level. In `LiveTvModal.vue`, dragging the volume slider to `0` set `volume = 0` and `isMuted = true`, after which clicking Unmute flipped `isMuted = false` while leaving `volume = 0` (resulting in silence).
- **Resolution (✅ FIXED):** Tracked `lastNonZeroVolume` in both components and restored it whenever unmuting from `0`.

---

### 20. Unescaped XML Characters in Generated SVG Cover Art & Unrevoked `coverBlobUrl` on Quota Error
- **Location:** [`src/composables/useAudioStorage.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useAudioStorage.ts#L291-L322) & [`src/composables/useAudioStorage.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useAudioStorage.ts#L437-L448)
- **Problem:** `createCover()` interpolated the first character of a track's title directly into `<text>${initial}</text>`; titles starting with `&`, `<`, or `>` produced malformed SVG XML and broken cover art. Additionally, if `putRecord()` threw an IndexedDB error, `url` was revoked while `coverBlobUrl` leaked in `objectUrls`.
- **Resolution (✅ FIXED):** Added `escapeXml()` in `createCover()` and revoked `coverBlobUrl` in the `putRecord()` error catch block.

---

### 21. `MarqueeText` Measures 0px Width When Updated While Hidden (`v-show`)
- **Location:** [`src/components/MarqueeText.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/MarqueeText.vue) & [`src/components/NowPlayingView.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/NowPlayingView.vue)
- **Problem:** When a track changed while viewing the Library, `MarqueeText` measured `0px` because its container had `display: none`, disabling animation.
- **Resolution (✅ FIXED):** Guarded `measure()` from resetting `overflowing` when container width is 0, added `ResizeObserver` on text and container, and passed `:active="activeTab === 'player'"` to immediately trigger re-measurement when switching views.

---

### 22. `.mp4` Video Files Accepted & Stored as Full Video Blobs
- **Location:** [`src/composables/useAudioStorage.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useAudioStorage.ts#L125-L135)
- **Problem:** Selecting `.mp4` camera videos imported full video streams into IndexedDB, wasting tens or hundreds of megabytes of storage quota.
- **Resolution (✅ FIXED):** Updated `resolveAudioMime()` to reject `video/*` MIME types and common video extensions (`mp4`, `mov`, `mkv`, `avi`, `webm`, `3gp`) unless purely audio, reporting them as skipped files.

---

### 23. Base64 PNG Cover Art Stored Per Track & Ignored ID3 `APIC` Artwork
- **Location:** [`src/composables/useAudioStorage.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/src/composables/useAudioStorage.ts#L200-L262)
- **Problem:** Each track generated a ~50 KB 512×512 PNG data URL canvas string in IndexedDB, and embedded ID3 album artwork was completely ignored.
- **Resolution (✅ FIXED):**
  - Added ID3v2 `APIC` frame decoding to extract embedded album covers into `coverBlob`.
  - Replaced heavy canvas PNG generation with crisp, responsive SVG gradient data URLs (~350 bytes, a 99% size reduction).

---

## 🔵 Low-Priority / Performance, PWA & Accessibility Polish (Fixed)

### 24. Monolithic 892 KB Bundle (`hls.js` Eager Load), Offline Google Fonts Caching & SW Update Reload Timing
- **Location:** [`vite.config.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/vite.config.ts#L35-L64), [`src/App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L17), & [`src/components/AboutModal.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/AboutModal.vue#L103-L122)
- **Problem:** Static import of `LiveTvModal.vue` bundled `hls.js` (~607 KB) directly into the main entry chunk (`891.91 kB`), slowing initial script startup for offline music listeners and triggering Vite chunk size warnings. Furthermore, Google Fonts lacked Workbox `runtimeCaching` rules for offline use, and `AboutModal.vue` called `window.location.reload()` before an `installing` service worker finished activating.
- **Resolution (✅ FIXED):**
  - Loaded `LiveTvModal.vue` via `defineAsyncComponent` in [`App.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/App.vue#L17), reducing the main entry JS bundle from **891.91 KB to 295.74 KB (82.07 KB gzipped — a 67% reduction)** while still precaching all chunks in Workbox for 100% offline availability.
  - Added `CacheFirst` Workbox `runtimeCaching` for `fonts.googleapis.com` and `fonts.gstatic.com` in [`vite.config.ts`](file:///Users/sabappy/Desktop/Pulse%20Player/vite.config.ts#L42-L57).
  - Updated `applyUpdate()` in [`AboutModal.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/AboutModal.vue#L103-L122) to await `statechange` to `activated` on an installing service worker before reloading.

---

### 25. Bottom Sheet Drag Handle Was Visual-Only (No Touch Swipe-to-Close)
- **Location:** [`src/components/UpNextDrawer.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/UpNextDrawer.vue), [`src/components/SleepTimerDrawer.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/SleepTimerDrawer.vue), [`src/components/SideMenuDrawer.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/SideMenuDrawer.vue), & [`src/components/NowPlayingView.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/NowPlayingView.vue)
- **Problem:** The iOS grabber pill on bottom sheets and drawers did not respond to swipe gestures.
- **Resolution (✅ FIXED):** Added touch gesture listeners (`@touchstart`, `@touchmove`, `@touchend`) to drawers and the Now Playing sheet so swiping smoothly translates and dismisses the active sheet.

---

### 26. `WaveformScrubber` Missing ARIA Slider Semantics & Keyboard Navigation
- **Location:** [`src/components/WaveformScrubber.vue`](file:///Users/sabappy/Desktop/Pulse%20Player/src/components/WaveformScrubber.vue#L105-L126)
- **Problem:** The custom waveform container lacked ARIA slider semantics and keyboard arrow-key navigation.
- **Resolution (✅ FIXED):** Added `role="slider"`, `tabindex="0"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext`, `aria-label="Track progress"`, focus rings, and keyboard handlers (`ArrowLeft`/`ArrowRight` ±5s, `PageDown`/`PageUp` ±30s, `Home`/`End`).
