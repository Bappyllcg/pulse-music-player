import { computed, effectScope, ref, watch } from 'vue'
import type { PlayableTrack, RepeatMode } from '../types/music'
import { useAudioStorage } from './useAudioStorage'

const ALBUM_NAME = 'Pulse Offline Library'
const SEEK_STEP_SECONDS = 10
const SETTINGS_KEY = 'pulse-player:settings'
const STATE_KEY = 'pulse-player:state'

/* ------------------------------------------------------------------ */
/* Persisted settings & playback state                                 */
/* ------------------------------------------------------------------ */

interface StoredSettings {
  isShuffle: boolean
  repeatMode: RepeatMode
  volume: number
}

interface StoredPlaybackState {
  lastTrackId: string | null
  lastPosition: number
  lastStreamTrack?: PlayableTrack | null
}

function loadSettings(): StoredSettings {
  const fallback: StoredSettings = { isShuffle: false, repeatMode: 'off', volume: 1 }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<StoredSettings>
    return {
      isShuffle: parsed.isShuffle === true,
      repeatMode:
        parsed.repeatMode === 'all' || parsed.repeatMode === 'one' ? parsed.repeatMode : 'off',
      volume:
        typeof parsed.volume === 'number' && parsed.volume >= 0 && parsed.volume <= 1
          ? parsed.volume
          : 1,
    }
  } catch {
    return fallback
  }
}

function saveSettings(settings: StoredSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* storage may be unavailable (private mode) */
  }
}

function loadStoredState(): StoredPlaybackState {
  const fallback: StoredPlaybackState = { lastTrackId: null, lastPosition: 0, lastStreamTrack: null }
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<StoredPlaybackState>
    const validStream =
      parsed.lastStreamTrack &&
      typeof parsed.lastStreamTrack === 'object' &&
      typeof parsed.lastStreamTrack.id === 'string' &&
      typeof parsed.lastStreamTrack.src === 'string' &&
      parsed.lastStreamTrack.kind === 'stream'
        ? parsed.lastStreamTrack
        : null
    return {
      lastTrackId: typeof parsed.lastTrackId === 'string' ? parsed.lastTrackId : null,
      lastPosition:
        typeof parsed.lastPosition === 'number' && Number.isFinite(parsed.lastPosition) && parsed.lastPosition > 0
          ? parsed.lastPosition
          : 0,
      lastStreamTrack: validStream,
    }
  } catch {
    return fallback
  }
}

function saveStoredState(state: StoredPlaybackState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {
    /* storage may be unavailable */
  }
}

/* ------------------------------------------------------------------ */
/* Audio TimeUpdate listeners (Lock screen sleep timer hook)          */
/* ------------------------------------------------------------------ */

const timeUpdateListeners = new Set<() => void>()

export function onPlayerTimeUpdate(cb: () => void): () => void {
  timeUpdateListeners.add(cb)
  return () => {
    timeUpdateListeners.delete(cb)
  }
}

/* ------------------------------------------------------------------ */
/* Singleton audio element + reactive state                            */
/* ------------------------------------------------------------------ */

const audio = new Audio()
audio.preload = 'metadata'
audio.setAttribute('playsinline', '')
audio.setAttribute('webkit-playsinline', '')
;(audio as HTMLAudioElement & { playsInline: boolean }).playsInline = true

const settings = loadSettings()

const currentTrack = ref<PlayableTrack | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const isShuffle = ref(settings.isShuffle)
const repeatMode = ref<RepeatMode>(settings.repeatMode)
const volume = ref(settings.volume)
const playbackError = ref<string | null>(null)
const pendingSeek = ref<number | null>(null)

/** Sleep timer hook: when true, playback stops when the current track ends. */
const stopAfterCurrent = ref(false)
const stopAfterCurrentFired = ref(0)

const volumeSupported = (() => {
  const probe = new Audio()
  probe.volume = 0.5
  return probe.volume === 0.5
})()

const shuffleHistory: string[] = []
const shufflePlayed = new Set<string>()

let initialized = false

function usePlayerInternals() {
  const storage = useAudioStorage()
  const tracks = storage.tracks

  /** Custom active queue (e.g. from active search/liked filter), or null for all tracks */
  const customQueue = ref<PlayableTrack[] | null>(null)

  const currentQueue = computed<PlayableTrack[]>(() => {
    if (customQueue.value && customQueue.value.length > 0) {
      return customQueue.value
    }
    return tracks.value
  })

  const currentIndex = computed(() =>
    currentQueue.value.findIndex((track) => track.id === currentTrack.value?.id),
  )
  const hasTracks = computed(() => tracks.value.length > 0)

  let lastPersistAt = 0
  function persistCurrentState(force = false): void {
    if (!currentTrack.value) return
    const now = Date.now()
    // Non-forced periodic persistence runs at most every 15s deferred to idle time
    if (!force && now - lastPersistAt < 15000) return
    lastPersistAt = now
    const isLiveRadio = currentTrack.value.id.startsWith('radio') || (currentTrack.value.kind === 'stream' && currentTrack.value.duration <= 0)

    const doPersist = () => {
      saveStoredState({
        lastTrackId: currentTrack.value?.id ?? null,
        lastPosition: isLiveRadio ? 0 : currentTime.value,
        lastStreamTrack: currentTrack.value?.kind === 'stream' ? currentTrack.value : null,
      })
    }

    if (force) {
      doPersist()
    } else if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(doPersist, { timeout: 2000 })
    } else {
      setTimeout(doPersist, 0)
    }
  }

  function setQueue(newList: PlayableTrack[] | null): void {
    customQueue.value = newList && newList.length > 0 ? [...newList] : null
    computeStagedNext()
  }

  /* ---------------------------- Media Session --------------------------- */

  const mediaSession: MediaSession | null = 'mediaSession' in navigator ? navigator.mediaSession : null
  let lastPositionUpdateSec = -1

  function updatePositionState(): void {
    if (!mediaSession || typeof mediaSession.setPositionState !== 'function') return
    const total = audio.duration
    if (!Number.isFinite(total) || total <= 0) return
    const currentSec = Math.floor(audio.currentTime)
    if (currentSec === lastPositionUpdateSec) return
    lastPositionUpdateSec = currentSec
    try {
      mediaSession.setPositionState({
        duration: total,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(Math.max(audio.currentTime, 0), total),
      })
    } catch {
      /* Safari throws if momentarily inconsistent */
    }
  }

  function updateMetadata(track: PlayableTrack | null): void {
    if (!mediaSession) return
    if (!track) {
      mediaSession.metadata = null
      return
    }
    mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: ALBUM_NAME,
      artwork: track.coverUrl
        ? [{ src: track.coverUrl, sizes: '512x512', type: track.coverUrl.endsWith('.svg') || track.coverUrl.startsWith('data:image/svg') ? 'image/svg+xml' : 'image/png' }]
        : [],
    })
  }

  function setPlaybackState(state: MediaSessionPlaybackState): void {
    if (mediaSession) mediaSession.playbackState = state
  }

  /* ------------------------------ Seeking ------------------------------- */

  function applyPendingSeek(): void {
    if (pendingSeek.value !== null && Number.isFinite(pendingSeek.value)) {
      const target = pendingSeek.value
      pendingSeek.value = null
      try {
        audio.currentTime = target
        currentTime.value = target
      } catch {
        /* audio not ready yet */
      }
    }
  }

  function seek(seconds: number): void {
    if (!currentTrack.value || currentTrack.value.id.startsWith('radio') || duration.value <= 0) {
      return
    }
    const total = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : duration.value
    const target = Math.min(Math.max(seconds, 0), total > 0 ? total : seconds)
    currentTime.value = target
    if (audio.readyState >= 1) {
      audio.currentTime = target
      pendingSeek.value = null
    } else {
      pendingSeek.value = target
    }
    updatePositionState()
    persistCurrentState(true)
  }

  function seekBy(delta: number): void {
    seek(currentTime.value + delta)
  }

  /* ------------------------------ Transport ----------------------------- */

  async function startPlayback(): Promise<void> {
    applyPendingSeek()
    try {
      await audio.play()
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      isPlaying.value = false
      setPlaybackState('paused')
      playbackError.value =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Tap play to start playback.'
          : 'This track could not be played.'
    }
  }

  /** Points the shared audio element at a track without starting playback. */
  function loadTrack(track: PlayableTrack, initialSeek = 0): void {
    currentTrack.value = track
    playbackError.value = null
    currentTime.value = initialSeek
    duration.value = track.duration
    pendingSeek.value = initialSeek > 0 ? initialSeek : null
    audio.src = track.src
    computeStagedNext()
  }

  function playTrack(track: PlayableTrack): Promise<void> {
    loadTrack(track)
    return startPlayback()
  }

  /* -------------------------- Queue & Shuffle --------------------------- */

  const stagedNextTrack = ref<PlayableTrack | null>(null)

  function pickNextCandidate(auto: boolean): PlayableTrack | null {
    const list = currentQueue.value
    if (list.length === 0) return null
    const current = currentTrack.value

    if (isShuffle.value && list.length > 1) {
      if (current) shufflePlayed.add(current.id)
      let pool = list.filter((track) => !shufflePlayed.has(track.id))
      if (pool.length === 0) {
        if (auto && repeatMode.value !== 'all') return null
        shufflePlayed.clear()
        if (current) shufflePlayed.add(current.id)
        pool = list.filter((track) => track.id !== current?.id)
      }
      if (pool.length === 0) return list[0] ?? null
      return pool[Math.floor(Math.random() * pool.length)] ?? null
    }

    const nextIndex = currentIndex.value + 1
    if (nextIndex < list.length) return list[nextIndex]
    return auto && repeatMode.value !== 'all' ? null : list[0]
  }

  function computeStagedNext(): void {
    stagedNextTrack.value = pickNextCandidate(false)
  }

  const nextTrackPreview = computed<PlayableTrack | null>(() => {
    const list = currentQueue.value
    if (list.length < 2 || !currentTrack.value) return null
    if (isShuffle.value) {
      return stagedNextTrack.value ?? pickNextCandidate(false)
    }
    const idx = currentIndex.value
    if (idx < 0 || idx >= list.length - 1) return list[0]
    return list[idx + 1]
  })

  const prevTrackPreview = computed<PlayableTrack | null>(() => {
    const list = currentQueue.value
    if (list.length < 2 || !currentTrack.value) return null
    if (isShuffle.value) {
      if (shuffleHistory.length > 0) {
        const prevId = shuffleHistory[shuffleHistory.length - 1]
        const found = list.find((t) => t.id === prevId)
        if (found) return found
      }
    }
    const idx = currentIndex.value
    if (idx <= 0) return list[list.length - 1]
    return list[idx - 1]
  })

  function next(): void {
    let target: PlayableTrack | null = null
    if (isShuffle.value && stagedNextTrack.value && stagedNextTrack.value.id !== currentTrack.value?.id) {
      target = stagedNextTrack.value
    } else {
      target = pickNextCandidate(false)
    }
    if (!target) return
    if (isShuffle.value && currentTrack.value) shuffleHistory.push(currentTrack.value.id)
    void playTrack(target)
  }

  function previous(): void {
    if (audio.currentTime > 3) {
      seek(0)
      return
    }
    const list = currentQueue.value
    if (list.length === 0) return

    if (isShuffle.value) {
      while (shuffleHistory.length > 0) {
        const id = shuffleHistory.pop()
        const target = list.find((track) => track.id === id)
        if (target) {
          void playTrack(target)
          return
        }
      }
    }
    const index = currentIndex.value
    const target = list[index <= 0 ? list.length - 1 : index - 1]
    if (target) void playTrack(target)
  }

  function togglePlay(): void {
    if (!currentTrack.value) {
      const first = currentQueue.value[0] || tracks.value[0]
      if (first) void playTrack(first)
      return
    }
    if (audio.paused) {
      void startPlayback()
    } else {
      audio.pause()
    }
  }

  function play(): void {
    if (!currentTrack.value) {
      togglePlay()
    } else if (audio.paused) {
      void startPlayback()
    }
  }

  function pause(): void {
    audio.pause()
  }

  function selectTrack(track: PlayableTrack): void {
    if (currentTrack.value?.id === track.id) {
      togglePlay()
      return
    }
    if (isShuffle.value && currentTrack.value) shuffleHistory.push(currentTrack.value.id)
    void playTrack(track)
  }

  function toggleShuffle(): void {
    isShuffle.value = !isShuffle.value
    shuffleHistory.length = 0
    shufflePlayed.clear()
    computeStagedNext()
  }

  function cycleRepeat(): void {
    repeatMode.value = repeatMode.value === 'off' ? 'all' : repeatMode.value === 'all' ? 'one' : 'off'
  }

  function setVolume(value: number): void {
    volume.value = Math.min(Math.max(value, 0), 1)
  }

  /* ------------------------------ Audio events -------------------------- */

  function handleEnded(): void {
    if (stopAfterCurrent.value) {
      stopAfterCurrent.value = false
      stopAfterCurrentFired.value += 1
      audio.pause()
      audio.currentTime = 0
      currentTime.value = 0
      isPlaying.value = false
      setPlaybackState('paused')
      persistCurrentState(true)
      return
    }
    if (repeatMode.value === 'one') {
      audio.currentTime = 0
      void startPlayback()
      return
    }
    let target: PlayableTrack | null = null
    if (isShuffle.value && stagedNextTrack.value && stagedNextTrack.value.id !== currentTrack.value?.id) {
      target = stagedNextTrack.value
    } else {
      target = pickNextCandidate(true)
    }
    if (target) {
      if (isShuffle.value && currentTrack.value) shuffleHistory.push(currentTrack.value.id)
      void playTrack(target)
      return
    }
    // End of the queue with repeat off: rewind and stop.
    isPlaying.value = false
    setPlaybackState('paused')
    shufflePlayed.clear()
    const first = currentQueue.value[0] || tracks.value[0]
    if (first) loadTrack(first)
    persistCurrentState(true)
  }

  function syncDuration(): void {
    if (currentTrack.value?.id.startsWith('radio')) {
      duration.value = 0
      return
    }
    const total = Number.isFinite(audio.duration) ? audio.duration : 0
    if (total > 0) {
      duration.value = total
      if (currentTrack.value) storage.setTrackDuration(currentTrack.value.id, total)
    }
    updatePositionState()
  }

  audio.addEventListener('play', () => {
    isPlaying.value = true
    playbackError.value = null
    setPlaybackState('playing')
  })
  audio.addEventListener('pause', () => {
    if (audio.ended) return
    isPlaying.value = false
    setPlaybackState('paused')
    persistCurrentState(true)
  })
  audio.addEventListener('ended', handleEnded)
  audio.addEventListener('loadedmetadata', () => {
    syncDuration()
    applyPendingSeek()
  })
  audio.addEventListener('canplay', applyPendingSeek)
  audio.addEventListener('durationchange', syncDuration)
  audio.addEventListener('timeupdate', () => {
    currentTime.value = audio.currentTime
    updatePositionState()
    persistCurrentState()
    for (const listener of timeUpdateListeners) {
      try {
        listener()
      } catch {
        /* listener error */
      }
    }
  })
  audio.addEventListener('error', () => {
    isPlaying.value = false
    setPlaybackState('paused')
    playbackError.value =
      currentTrack.value?.kind === 'stream' && !navigator.onLine
        ? 'Streams are unavailable offline. Import files to play offline.'
        : 'This track could not be loaded.'
  })

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', () => persistCurrentState(true))
    window.addEventListener('beforeunload', () => persistCurrentState(true))
  }

  /* --------------------------- Media Session handlers -------------------- */

  function bindAction(action: MediaSessionAction, handler: MediaSessionActionHandler): void {
    try {
      mediaSession?.setActionHandler(action, handler)
    } catch {
      /* action not supported */
    }
  }

  bindAction('play', () => play())
  bindAction('pause', () => pause())
  bindAction('previoustrack', () => previous())
  bindAction('nexttrack', () => next())
  bindAction('seekbackward', () => seekBy(-SEEK_STEP_SECONDS))
  bindAction('seekforward', () => seekBy(SEEK_STEP_SECONDS))
  bindAction('seekto', (details) => {
    if (typeof details.seekTime === 'number') seek(details.seekTime)
  })

  /* --------------------------------- Watchers ---------------------------- */

  watch(currentTrack, (track) => {
    updateMetadata(track)
    computeStagedNext()
  }, { immediate: true, flush: 'sync' })

  watch(
    volume,
    (value) => {
      if (volumeSupported) audio.volume = value
    },
    { immediate: true },
  )

  watch([isShuffle, repeatMode, volume], () => {
    saveSettings({ isShuffle: isShuffle.value, repeatMode: repeatMode.value, volume: volume.value })
  })

  let hasRestoredInitialTrack = false
  let lastKnownIndex = 0

  watch(currentTrack, (track) => {
    if (track) {
      const idx = currentQueue.value.findIndex((t) => t.id === track.id)
      if (idx !== -1) lastKnownIndex = idx
    }
  })

  // Keep player consistent when library changes (cold load, import, delete).
  watch(
    () => [storage.isReady.value, tracks.value.map((track) => track.id).join('|')] as const,
    ([ready]) => {
      if (!ready) return
      const list = tracks.value

      // Update custom queue if active
      if (customQueue.value) {
        const idSet = new Set(list.map((t) => t.id))
        customQueue.value = customQueue.value.filter((t) => t.kind === 'stream' || idSet.has(t.id))
        if (customQueue.value.length === 0) customQueue.value = null
      }

      // Initial cold-start restoration (only runs once after IndexedDB is ready)
      if (!hasRestoredInitialTrack) {
        hasRestoredInitialTrack = true
        const saved = loadStoredState()
        const localCandidate = saved.lastTrackId ? list.find((t) => t.id === saved.lastTrackId) : null
        if (localCandidate) {
          loadTrack(localCandidate, saved.lastPosition)
          return
        }
        if (saved.lastStreamTrack && saved.lastStreamTrack.id === saved.lastTrackId) {
          const isRadio = saved.lastStreamTrack.id.startsWith('radio') || saved.lastStreamTrack.duration <= 0
          loadTrack(saved.lastStreamTrack, isRadio ? 0 : saved.lastPosition)
          return
        }
        if (list.length > 0) {
          loadTrack(list[0], 0)
        }
        return
      }

      // If user is currently playing an online stream track, do not disrupt it
      if (currentTrack.value?.kind === 'stream') {
        return
      }

      if (list.length === 0) {
        currentTrack.value = null
        audio.removeAttribute('src')
        audio.load()
        currentTime.value = 0
        duration.value = 0
        activeQueueCleanup()
        saveStoredState({ lastTrackId: null, lastPosition: 0, lastStreamTrack: null })
        return
      }

      const stillPresent = list.some((track) => track.id === currentTrack.value?.id)
      if (stillPresent) return

      // Active track was deleted
      audio.pause()
      isPlaying.value = false
      setPlaybackState('none')
      const ids = new Set(list.map((track) => track.id))
      for (let i = shuffleHistory.length - 1; i >= 0; i--) {
        if (!ids.has(shuffleHistory[i])) shuffleHistory.splice(i, 1)
      }

      // Advance to adjacent track in the active queue instead of resetting to #0
      const activeList = currentQueue.value.length > 0 ? currentQueue.value : list
      const nextIdx = Math.min(Math.max(0, lastKnownIndex), activeList.length - 1)
      const target = activeList[nextIdx]
      if (target) {
        loadTrack(target, 0)
      }
    },
    { immediate: true },
  )

  function activeQueueCleanup(): void {
    customQueue.value = null
    stagedNextTrack.value = null
    shuffleHistory.length = 0
    shufflePlayed.clear()
  }

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isShuffle,
    repeatMode,
    volume,
    volumeSupported,
    playbackError,
    stopAfterCurrent,
    stopAfterCurrentFired,
    hasTracks,
    queue: currentQueue,
    setQueue,
    nextTrackPreview,
    prevTrackPreview,
    play,
    pause,
    togglePlay,
    next,
    previous,
    selectTrack,
    playTrack,
    seek,
    seekBy,
    toggleShuffle,
    cycleRepeat,
    setVolume,
  }
}

type PlayerApi = ReturnType<typeof usePlayerInternals>
let api: PlayerApi | null = null

export function usePlayer(): PlayerApi {
  if (!initialized || !api) {
    initialized = true
    api = effectScope(true).run(usePlayerInternals) as PlayerApi
  }
  return api
}
