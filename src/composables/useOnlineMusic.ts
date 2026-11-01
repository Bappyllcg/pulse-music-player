import { ref } from 'vue'
import type { PlayableTrack } from '../types/music'

const CLIENT_ID = 'ffe7663c'
const BASE_URL = 'https://api.jamendo.com/v3.0/tracks/'
const CACHE_PREFIX = 'pulse:online_genre:'

export interface OnlineGenre {
  id: string
  label: string
  tag: string
  icon?: string
}

export const ONLINE_GENRES: OnlineGenre[] = [
  { id: 'synthwave', label: 'Synthwave', tag: 'synthwave' },
  { id: 'lofi', label: 'Lofi', tag: 'lofi' },
  { id: 'cyberpunk', label: 'Cyberpunk', tag: 'cyberpunk' },
  { id: 'chillout', label: 'Chillout', tag: 'chillout' },
  { id: 'electronic', label: 'Electronic', tag: 'electronic' },
  { id: 'rock', label: 'Rock', tag: 'rock' },
  { id: 'pop', label: 'Pop', tag: 'pop' },
  { id: 'ambient', label: 'Ambient', tag: 'ambient' },
  { id: 'hiphop', label: 'Hip Hop', tag: 'hiphop' },
  { id: 'jazz', label: 'Jazz', tag: 'jazz' },
  { id: 'classical', label: 'Classical', tag: 'classical' },
]

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
const activeGenreId = ref('synthwave')
const currentOnlineSearch = ref('')

// In-memory cache for genre queries
const genreCache = new Map<string, PlayableTrack[]>()

function toPlayableTrack(item: JamendoTrackItem): PlayableTrack {
  return {
    id: `jamendo-${item.id}`,
    title: item.name || 'Untitled Track',
    artist: item.artist_name || 'Jamendo Artist',
    duration: item.duration || 0,
    src: item.audio,
    coverUrl: item.album_image || item.image || './icon.svg',
    kind: 'stream',
    createdAt: Date.now(),
  }
}

async function queryJamendo(paramString: string): Promise<PlayableTrack[]> {
  const url = `${BASE_URL}?client_id=${CLIENT_ID}&format=json&limit=20&${paramString}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Jamendo API responded with status ${response.status}`)
  }
  const data = (await response.json()) as JamendoResponse
  if (!data.results) return []
  return data.results.map(toPlayableTrack)
}

/**
 * 4-tier cascade search:
 * 1. search=query (full-text: track, tag, artist)
 * 2. namesearch=query (title match)
 * 3. tags=query (exact tag match)
 * 4. fuzzytags=query (fuzzy tag / mood match)
 */
async function searchJamendo(query: string): Promise<PlayableTrack[]> {
  const clean = query.trim()
  if (!clean) return []

  // Tier 1: Free text search
  try {
    const res = await queryJamendo(`search=${encodeURIComponent(clean)}`)
    if (res.length > 0) return res
  } catch {}

  // Tier 2: Name search
  try {
    const res = await queryJamendo(`namesearch=${encodeURIComponent(clean)}`)
    if (res.length > 0) return res
  } catch {}

  // Tier 3: Tags match
  try {
    const res = await queryJamendo(`tags=${encodeURIComponent(clean)}`)
    if (res.length > 0) return res
  } catch {}

  // Tier 4: Fuzzy tags match
  try {
    const res = await queryJamendo(`fuzzytags=${encodeURIComponent(clean)}`)
    if (res.length > 0) return res
  } catch {}

  return []
}

export function useOnlineMusic() {
  async function selectGenre(genreId: string, force = false): Promise<PlayableTrack[]> {
    activeGenreId.value = genreId
    currentOnlineSearch.value = ''

    // Return from in-memory cache if available and not forced
    if (!force && genreCache.has(genreId)) {
      const cached = genreCache.get(genreId)!
      onlineTracks.value = cached
      onlineError.value = null
      return cached
    }

    // Check localStorage cache
    if (!force) {
      try {
        const stored = localStorage.getItem(`${CACHE_PREFIX}${genreId}`)
        if (stored) {
          const parsed = JSON.parse(stored) as PlayableTrack[]
          if (Array.isArray(parsed) && parsed.length > 0) {
            genreCache.set(genreId, parsed)
            onlineTracks.value = parsed
            onlineError.value = null
            return parsed
          }
        }
      } catch {}
    }

    const genre = ONLINE_GENRES.find((g) => g.id === genreId) ?? ONLINE_GENRES[0]
    isLoadingOnline.value = true
    onlineError.value = null

    try {
      const tracks = await searchJamendo(genre.tag)
      onlineTracks.value = tracks
      genreCache.set(genreId, tracks)
      try {
        localStorage.setItem(`${CACHE_PREFIX}${genreId}`, JSON.stringify(tracks))
      } catch {}
      return tracks
    } catch (err) {
      console.warn('[Pulse] Failed to load genre:', genreId, err)
      onlineError.value = navigator.onLine
        ? 'Could not connect to online music stream.'
        : 'You are offline. Connect to internet to stream online music.'
      return onlineTracks.value
    } finally {
      isLoadingOnline.value = false
    }
  }

  async function searchOnline(query: string): Promise<PlayableTrack[]> {
    const clean = query.trim()
    if (!clean) {
      return selectGenre(activeGenreId.value)
    }

    currentOnlineSearch.value = clean
    isLoadingOnline.value = true
    onlineError.value = null

    try {
      const tracks = await searchJamendo(clean)
      onlineTracks.value = tracks
      if (tracks.length === 0) {
        onlineError.value = `No online tracks found for “${clean}”. Try another keyword.`
      }
      return tracks
    } catch (err) {
      console.warn('[Pulse] Online search failed:', err)
      onlineError.value = navigator.onLine
        ? 'Search request failed. Please try again.'
        : 'You are offline. Connect to internet to search online music.'
      return []
    } finally {
      isLoadingOnline.value = false
    }
  }

  async function fetchOnlineTracks(force = false): Promise<PlayableTrack[]> {
    if (currentOnlineSearch.value) {
      return searchOnline(currentOnlineSearch.value)
    }
    return selectGenre(activeGenreId.value, force)
  }

  return {
    onlineTracks,
    isLoadingOnline,
    onlineError,
    activeGenreId,
    currentOnlineSearch,
    genres: ONLINE_GENRES,
    selectGenre,
    searchOnline,
    fetchOnlineTracks,
  }
}
