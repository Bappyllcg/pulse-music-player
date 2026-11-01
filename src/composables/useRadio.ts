import { ref } from 'vue'
import type { PlayableTrack } from '../types/music'

const RADIO_SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://all.api.radio-browser.info',
]

const CACHE_PREFIX = 'pulse:radio_cat:'

export interface RadioCategory {
  id: string
  label: string
  kind: 'country' | 'tag'
  query: string
}

export const RADIO_CATEGORIES: RadioCategory[] = [
  { id: 'bangladesh', label: '🇧🇩 Bangladesh', kind: 'country', query: 'Bangladesh' },
  { id: 'lofi', label: 'Lofi', kind: 'tag', query: 'lofi' },
  { id: 'chillout', label: 'Chillout', kind: 'tag', query: 'chillout' },
  { id: 'synthwave', label: 'Synthwave', kind: 'tag', query: 'synthwave' },
  { id: 'jazz', label: 'Jazz', kind: 'tag', query: 'jazz' },
  { id: 'classical', label: 'Classical', kind: 'tag', query: 'classical' },
  { id: 'rock', label: 'Rock', kind: 'tag', query: 'rock' },
  { id: 'pop', label: 'Pop', kind: 'tag', query: 'pop' },
  { id: 'ambient', label: 'Ambient', kind: 'tag', query: 'ambient' },
  { id: 'news', label: 'News / Talk', kind: 'tag', query: 'news' },
  { id: 'islamic', label: 'Quran / Islamic', kind: 'tag', query: 'quran' },
]

export interface RadioBrowserStation {
  changeuuid: string
  stationuuid: string
  name: string
  url: string
  url_resolved?: string
  homepage?: string
  favicon?: string
  tags?: string
  country?: string
  countrycode?: string
  codec?: string
  bitrate?: number
  votes?: number
}

const DEFAULT_BANGLADESH_STATIONS: PlayableTrack[] = [
  {
    id: 'radio-bd-dhakafm',
    title: 'Dhaka FM 90.4',
    artist: 'Bangladesh • Dhaka • 128k',
    duration: 0,
    src: 'https://play.dhakafm904.com/;',
    coverUrl: 'https://i.postimg.cc/Z5MBwBZ5/dhaka-fm.png',
    kind: 'stream',
    createdAt: 1,
  },
  {
    id: 'radio-bd-today',
    title: 'Radio Today 89.6 FM',
    artist: 'Bangladesh • News & Music',
    duration: 0,
    src: 'https://stream-285.surfernetwork.com/8wv4d8g4344tv',
    coverUrl: 'https://i.postimg.cc/MT7JFPDK/radio-today.png',
    kind: 'stream',
    createdAt: 2,
  },
  {
    id: 'radio-bd-foorti',
    title: 'Radio Foorti 88.0 FM',
    artist: 'Bangladesh • Pop & Hits',
    duration: 0,
    src: 'https://radiofoorti.fm/api/stream',
    coverUrl: 'https://i.postimg.cc/0NWMBYGh/radio-foorti.png',
    kind: 'stream',
    createdAt: 3,
  },
  {
    id: 'radio-bd-bhumi',
    title: 'Radio Bhumi 92.8 FM',
    artist: 'Bangladesh • Folk & Bangla',
    duration: 0,
    src: 'https://stream.zeno.fm/be5bqmk1k18uv',
    coverUrl: 'https://cdn-radiotime-logos.tunein.com/s151241d.png',
    kind: 'stream',
    createdAt: 4,
  },
  {
    id: 'radio-bd-shadhin',
    title: 'Radio Shadhin 92.4 FM',
    artist: 'Bangladesh • Dhaka',
    duration: 0,
    src: 'https://stream.zeno.fm/eabgu655puquv',
    coverUrl: '',
    kind: 'stream',
    createdAt: 5,
  },
  {
    id: 'radio-bd-ullash',
    title: 'Radio Ullash',
    artist: 'Bangladesh • 128k MP3',
    duration: 0,
    src: 'https://stream.zeno.fm/gpgkgp9mp18uv.mp3',
    coverUrl: 'https://radioullash.com/wp-content/uploads/2021/04/radio-ullash-logo.png',
    kind: 'stream',
    createdAt: 6,
  },
  {
    id: 'radio-bd-quran',
    title: 'Al-Quran Bangla',
    artist: 'Bangladesh • Islamic • 128k',
    duration: 0,
    src: 'http://66.45.232.131:9994/;stream/1/;',
    coverUrl: 'https://www.liveonlineradio.net/wp-content/uploads/2012/03/Bangla-Al-Quran.jpg',
    kind: 'stream',
    createdAt: 7,
  },
  {
    id: 'radio-bd-peoples',
    title: 'Peoples Radio 91.6 FM',
    artist: 'Bangladesh • Pop & Talk',
    duration: 0,
    src: 'https://s3.myradiostream.com:14498/listen.mp3',
    coverUrl: 'https://i.postimg.cc/gc6kkfKK/peoples-radio.png',
    kind: 'stream',
    createdAt: 8,
  },
]

const radioStations = ref<PlayableTrack[]>([])
const isLoadingRadio = ref(false)
const radioError = ref<string | null>(null)
const activeRadioCategoryId = ref('bangladesh')
const currentRadioSearch = ref('')

const radioCache = new Map<string, PlayableTrack[]>()

/** Generates clean SVG artwork for radio stations without favicons */
function getStationCover(station: RadioBrowserStation): string {
  if (station.favicon && station.favicon.startsWith('http')) {
    return station.favicon
  }

  // Pre-rendered clean SVG radio emblem
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4f46e5"/>
          <stop offset="100%" stop-color="#09090b"/>
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="48" fill="url(#g)"/>
      <circle cx="128" cy="138" r="38" stroke="#a5b4fc" stroke-width="8" fill="none" opacity="0.8"/>
      <circle cx="128" cy="138" r="16" fill="#f43f5e"/>
      <path d="M78 88 A76 76 0 0 1 178 88" stroke="#cbd5e1" stroke-width="8" stroke-linecap="round" fill="none"/>
      <path d="M54 64 A110 110 0 0 1 202 64" stroke="#818cf8" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.6"/>
    </svg>
  `)
  )
}

/** Sanitize stream URLs: upgrade Zeno.fm to HTTPS and strip expired token parameters */
function sanitizeStreamUrl(url: string): string {
  let cleaned = (url || '').trim()
  if (cleaned.includes('zeno.fm')) {
    cleaned = cleaned.replace(/^http:\/\/stream\.zeno\.fm/, 'https://stream.zeno.fm')
    cleaned = cleaned.replace(/^http:\/\/stream-(\d+)\.zeno\.fm/, 'https://stream-$1.zeno.fm')
    // Remove expired ?zt= tokens so Zeno generates a fresh token on connect
    const qIndex = cleaned.indexOf('?')
    if (qIndex !== -1) {
      cleaned = cleaned.slice(0, qIndex)
    }
  }
  return cleaned
}

function toPlayableTrack(station: RadioBrowserStation): PlayableTrack {
  const streamSrc = sanitizeStreamUrl(station.url_resolved || station.url)
  const metaParts: string[] = []
  if (station.country) metaParts.push(station.country)
  if (station.codec) metaParts.push(station.codec.toUpperCase())
  if (station.bitrate && station.bitrate > 0) metaParts.push(`${station.bitrate}k`)

  return {
    id: `radio-${station.stationuuid}`,
    title: (station.name || 'Live Radio').trim(),
    artist: metaParts.length > 0 ? metaParts.join(' • ') : 'Online Radio',
    duration: 0,
    src: streamSrc,
    coverUrl: getStationCover(station),
    kind: 'stream',
    createdAt: Date.now(),
  }
}

/** Fetch from Radio Browser with automatic fallback across multi-region mirrors */
async function fetchFromRadioBrowser(path: string): Promise<PlayableTrack[]> {
  let lastError: unknown = null

  for (const server of RADIO_SERVERS) {
    const url = `${server}${path}`
    try {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 6000)

      const response = await fetch(url, {
        headers: { 'User-Agent': 'PulsePlayer/1.0' },
        signal: controller.signal,
      })
      window.clearTimeout(timeoutId)

      if (!response.ok) {
        continue
      }

      const list = (await response.json()) as RadioBrowserStation[]
      if (!Array.isArray(list)) return []

      // Deduplicate by normalized station name and filter out invalid streams
      const seen = new Set<string>()
      const result: PlayableTrack[] = []

      for (const item of list) {
        const streamUrl = (item.url_resolved || item.url || '').trim()
        if (!streamUrl) continue
        const normName = (item.name || '').trim().toLowerCase()
        if (normName && seen.has(normName)) continue
        if (normName) seen.add(normName)
        result.push(toPlayableTrack(item))
      }

      return result
    } catch (err) {
      lastError = err
    }
  }

  throw lastError ?? new Error('All radio mirrors failed to respond')
}

export function useRadio() {
  async function selectRadioCategory(categoryId: string, force = false): Promise<PlayableTrack[]> {
    activeRadioCategoryId.value = categoryId
    currentRadioSearch.value = ''

    // Return from in-memory cache
    if (!force && radioCache.has(categoryId)) {
      const cached = radioCache.get(categoryId)!
      radioStations.value = cached
      radioError.value = null
      return cached
    }

    // Check localStorage cache
    if (!force) {
      try {
        const stored = localStorage.getItem(`${CACHE_PREFIX}${categoryId}`)
        if (stored) {
          const parsed = JSON.parse(stored) as PlayableTrack[]
          if (Array.isArray(parsed) && parsed.length > 0) {
            radioCache.set(categoryId, parsed)
            radioStations.value = parsed
            radioError.value = null
            return parsed
          }
        }
      } catch {}
    }

    const cat = RADIO_CATEGORIES.find((c) => c.id === categoryId) ?? RADIO_CATEGORIES[0]

    // Pre-seed with top Bangladeshi stations for instant offline-first playback
    if (categoryId === 'bangladesh' && radioStations.value.length === 0) {
      radioStations.value = DEFAULT_BANGLADESH_STATIONS
    }

    isLoadingRadio.value = true
    radioError.value = null

    try {
      let path = ''
      if (cat.kind === 'country') {
        path = `/json/stations/bycountry/${encodeURIComponent(cat.query)}?limit=35&hidebroken=true&order=votes&reverse=true`
      } else {
        path = `/json/stations/bytag/${encodeURIComponent(cat.query)}?limit=25&hidebroken=true&order=votes&reverse=true`
      }

      const stations = await fetchFromRadioBrowser(path)
      radioStations.value = stations
      radioCache.set(categoryId, stations)
      try {
        localStorage.setItem(`${CACHE_PREFIX}${categoryId}`, JSON.stringify(stations))
      } catch {}
      return stations
    } catch (err) {
      console.warn('[Pulse] Failed to load radio category:', categoryId, err)
      if (radioStations.value.length === 0) {
        radioError.value = navigator.onLine
          ? 'Could not connect to radio directory. Try refreshing.'
          : 'You are offline. Connect to internet to stream live radio.'
      }
      return radioStations.value
    } finally {
      isLoadingRadio.value = false
    }
  }

  async function searchRadio(query: string): Promise<PlayableTrack[]> {
    const clean = query.trim()
    if (!clean) {
      return selectRadioCategory(activeRadioCategoryId.value)
    }

    currentRadioSearch.value = clean
    isLoadingRadio.value = true
    radioError.value = null

    try {
      // Tier 1: Search by name / tag / country
      let path = `/json/stations/search?name=${encodeURIComponent(clean)}&limit=30&hidebroken=true&order=votes&reverse=true`
      let stations = await fetchFromRadioBrowser(path)

      // Tier 2: Search by tag if name yielded no results
      if (stations.length === 0) {
        path = `/json/stations/bytag/${encodeURIComponent(clean)}?limit=30&hidebroken=true&order=votes&reverse=true`
        stations = await fetchFromRadioBrowser(path)
      }

      radioStations.value = stations
      if (stations.length === 0) {
        radioError.value = `No radio stations found for “${clean}”.`
      }
      return stations
    } catch (err) {
      console.warn('[Pulse] Radio search failed:', err)
      radioError.value = navigator.onLine
        ? 'Radio search request failed. Please try again.'
        : 'You are offline. Connect to internet to search radio stations.'
      return []
    } finally {
      isLoadingRadio.value = false
    }
  }

  async function fetchRadioStations(force = false): Promise<PlayableTrack[]> {
    if (currentRadioSearch.value) {
      return searchRadio(currentRadioSearch.value)
    }
    return selectRadioCategory(activeRadioCategoryId.value, force)
  }

  return {
    radioStations,
    isLoadingRadio,
    radioError,
    activeRadioCategoryId,
    currentRadioSearch,
    categories: RADIO_CATEGORIES,
    selectRadioCategory,
    searchRadio,
    fetchRadioStations,
  }
}
