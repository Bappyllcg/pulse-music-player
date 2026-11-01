import { ref } from 'vue'
import type { PlayableTrack } from '../types/music'

const JAMENDO_ENDPOINT =
  'https://api.jamendo.com/v3.0/tracks/?client_id=ffe7663c&format=json&limit=20&search=synthwave'
const CACHE_KEY = 'pulse:online_tracks'

interface JamendoTrackItem {
  id: string
  name: string
  duration: number
  artist_name: string
  album_image?: string
  image?: string
  audio: string
}

interface JamendoResponse {
  headers: {
    status: string
    code: number
    results_count: number
  }
  results: JamendoTrackItem[]
}

const onlineTracks = ref<PlayableTrack[]>([])
const isLoadingOnline = ref(false)
const onlineError = ref<string | null>(null)
let hasAttemptedInitialFetch = false

function loadFromCache(): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PlayableTrack[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        onlineTracks.value = parsed
      }
    }
  } catch {
    /* cache read error */
  }
}

function saveToCache(tracks: PlayableTrack[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(tracks))
  } catch {
    /* storage quota exceeded */
  }
}

export function useOnlineMusic() {
  if (!hasAttemptedInitialFetch) {
    loadFromCache()
  }

  async function fetchOnlineTracks(force = false): Promise<PlayableTrack[]> {
    if (onlineTracks.value.length > 0 && !force) {
      return onlineTracks.value
    }

    isLoadingOnline.value = true
    onlineError.value = null

    try {
      const response = await fetch(JAMENDO_ENDPOINT)
      if (!response.ok) {
        throw new Error(`Jamendo API responded with status ${response.status}`)
      }
      const data = (await response.json()) as JamendoResponse

      if (!data.results || data.results.length === 0) {
        throw new Error('No tracks found in response')
      }

      const mapped: PlayableTrack[] = data.results.map((item) => ({
        id: `jamendo-${item.id}`,
        title: item.name || 'Synthwave Track',
        artist: item.artist_name || 'Jamendo Music',
        duration: item.duration || 0,
        src: item.audio,
        coverUrl: item.album_image || item.image || './icon.svg',
        kind: 'stream',
        createdAt: Date.now(),
      }))

      onlineTracks.value = mapped
      saveToCache(mapped)
      return mapped
    } catch (err) {
      console.warn('[Pulse] Failed to load online tracks:', err)
      onlineError.value = navigator.onLine
        ? 'Could not connect to online music stream.'
        : 'You are offline. Connect to Wi-Fi or cellular to stream online music.'
      return onlineTracks.value
    } finally {
      isLoadingOnline.value = false
      hasAttemptedInitialFetch = true
    }
  }

  return {
    onlineTracks,
    isLoadingOnline,
    onlineError,
    fetchOnlineTracks,
  }
}
