import { computed, effectScope, ref, watch } from 'vue'
import type { PlayableTrack, RepeatMode } from '../types/music'
import { useAudioStorage } from './useAudioStorage'

const ALBUM_NAME = 'Pulse Offline Library'
const SEEK_STEP_SECONDS = 10
const SETTINGS_KEY = 'pulse-player:settings'

/* ------------------------------------------------------------------ */
/* Persisted settings                                                  */
/* ------------------------------------------------------------------ */

interface StoredSettings {
  isShuffle: boolean
  repeatMode: RepeatMode
  volume: number
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
    /* storage may be unavailable (private mode); settings are best-effort */
  }
}

/* ------------------------------------------------------------------ */
/* Singleton audio element + reactive state                            */
/* ------------------------------------------------------------------ */

// One persistent element for the whole app lifetime. iOS Safari ties background
// playback to this element, so it must never be recreated or torn down.
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

/** Sleep timer hook: when true, playback stops (rewound) when the current track ends. */
const stopAfterCurrent = ref(false)
/** Incremented each time `stopAfterCurrent` actually halts playback. */
const stopAfterCurrentFired = ref(0)

/** iOS keeps the hardware volume authoritative: `audio.volume` is read-only there. */
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

  const currentIndex = computed(() =>
    tracks.value.findIndex((track) => track.id === currentTrack.value?.id),
  )
  const hasTracks = computed(() => tracks.value.length > 0)

  /* ---------------------------- Media Session --------------------------- */

  const mediaSession: MediaSession | null = 'mediaSession' in navigator ? navigator.mediaSession : null

  function updatePositionState(): void {
    if (!mediaSession || typeof mediaSession.setPositionState !== 'function') return
    const total = audio.duration
    if (!Number.isFinite(total) || total <= 0) return
    try {
      mediaSession.setPositionState({
        duration: total,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(Math.max(audio.currentTime, 0), total),
      })
    } catch {
      /* Safari throws if the state is momentarily inconsistent; the next tick corrects it */
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
        ? [{ src: track.coverUrl, sizes: '512x512', type: track.coverUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png' }]
        : [],
    })
  }

  function setPlaybackState(state: MediaSessionPlaybackState): void {
    if (mediaSession) mediaSession.playbackState = state
  }

  /* ------------------------------ Transport ----------------------------- */

  async function startPlayback(): Promise<void> {
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
  function loadTrack(track: PlayableTrack): void {
    currentTrack.value = track
    playbackError.value = null
    currentTime.value = 0
    duration.value = track.duration
    audio.src = track.src
  }

  /**
   * Swaps the source and calls `play()` in the same synchronous tick (the async
   * body only yields after `audio.play()` has been invoked). This keeps iOS from
   * suspending the audio session between tracks while the screen is locked.
   */
  function playTrack(track: PlayableTrack): Promise<void> {
    loadTrack(track)
    return startPlayback()
  }

  function pickNext(auto: boolean): PlayableTrack | null {
    const list = tracks.value
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
      return pool[Math.floor(Math.random() * pool.length)] ?? null
    }

    const nextIndex = currentIndex.value + 1
    if (nextIndex < list.length) return list[nextIndex]
    return auto && repeatMode.value !== 'all' ? null : list[0]
  }

  function next(): void {
    const target = pickNext(false)
    if (!target) return
    if (isShuffle.value && currentTrack.value) shuffleHistory.push(currentTrack.value.id)
    void playTrack(target)
  }

  function previous(): void {
    if (audio.currentTime > 3) {
      seek(0)
      return
    }
    const list = tracks.value
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
      const first = tracks.value[0]
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

  function seek(seconds: number): void {
    const total = Number.isFinite(audio.duration) ? audio.duration : duration.value
    const target = Math.min(Math.max(seconds, 0), total > 0 ? total : seconds)
    audio.currentTime = target
    currentTime.value = target
    updatePositionState()
  }

  function seekBy(delta: number): void {
    seek(audio.currentTime + delta)
  }

  function toggleShuffle(): void {
    isShuffle.value = !isShuffle.value
    shuffleHistory.length = 0
    shufflePlayed.clear()
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
      return
    }
    if (repeatMode.value === 'one') {
      audio.currentTime = 0
      void startPlayback()
      return
    }
    const target = pickNext(true)
    if (target) {
      if (isShuffle.value && currentTrack.value) shuffleHistory.push(currentTrack.value.id)
      void playTrack(target)
      return
    }
    // End of the queue with repeat off: rewind to the first track and stop.
    isPlaying.value = false
    setPlaybackState('paused')
    shufflePlayed.clear()
    const first = tracks.value[0]
    if (first) loadTrack(first)
  }

  function syncDuration(): void {
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
  })
  audio.addEventListener('ended', handleEnded)
  audio.addEventListener('loadedmetadata', syncDuration)
  audio.addEventListener('durationchange', syncDuration)
  audio.addEventListener('timeupdate', () => {
    currentTime.value = audio.currentTime
    updatePositionState()
  })
  audio.addEventListener('error', () => {
    isPlaying.value = false
    setPlaybackState('paused')
    playbackError.value =
      currentTrack.value?.kind === 'stream' && !navigator.onLine
        ? 'Streams are unavailable offline. Import files to play offline.'
        : 'This track could not be loaded.'
  })

  /* --------------------------- Media Session handlers -------------------- */

  function bindAction(action: MediaSessionAction, handler: MediaSessionActionHandler): void {
    try {
      mediaSession?.setActionHandler(action, handler)
    } catch {
      /* action not supported by this browser */
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

  watch(currentTrack, (track) => updateMetadata(track), { immediate: true, flush: 'sync' })

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

  // Keep the player consistent when the library changes (first load, import, delete).
  watch(
    () => tracks.value.map((track) => track.id).join('|'),
    () => {
      const list = tracks.value
      const stillPresent = list.some((track) => track.id === currentTrack.value?.id)
      if (stillPresent) return

      audio.pause()
      isPlaying.value = false
      setPlaybackState('none')
      const ids = new Set(list.map((track) => track.id))
      for (let i = shuffleHistory.length - 1; i >= 0; i--) {
        if (!ids.has(shuffleHistory[i])) shuffleHistory.splice(i, 1)
      }
      const first = list[0]
      if (first) {
        loadTrack(first)
      } else {
        currentTrack.value = null
        audio.removeAttribute('src')
        audio.load()
        currentTime.value = 0
        duration.value = 0
      }
    },
    { immediate: true },
  )

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
    play,
    pause,
    togglePlay,
    next,
    previous,
    selectTrack,
    seek,
    seekBy,
    toggleShuffle,
    cycleRepeat,
    setVolume,
  }
}

type PlayerApi = ReturnType<typeof usePlayerInternals>
let api: PlayerApi | null = null

/** Shared player API. Listeners and watchers are created once, in a detached scope. */
export function usePlayer(): PlayerApi {
  if (!initialized || !api) {
    initialized = true
    api = effectScope(true).run(usePlayerInternals) as PlayerApi
  }
  return api
}

