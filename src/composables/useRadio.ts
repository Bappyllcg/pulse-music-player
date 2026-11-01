import { computed, ref } from 'vue'
import type { PlayableTrack } from '../types/music'

const RADIO_SERVERS = [
  'https://de1.api.radio-browser.info',
  'https://all.api.radio-browser.info',
]

const CACHE_PREFIX = 'pulse:radio_reg:'
const HEALTH_CACHE_KEY = 'pulse:radio_health_cache_v1'
const LATENCY_CACHE_KEY = 'pulse:radio_latency_cache_v1'

export type RadioRegionId =
  | 'bd'
  | 'in'
  | 'pk'
  | 'us'
  | 'uk'
  | 'sa'
  | 'ae'
  | 'qa'
  | 'ca'
  | 'au'
  | 'tr'
  | 'de'
  | 'fr'
  | 'es'
  | 'it'
  | 'jp'
  | 'kr'
  | 'my'
  | 'id'
  | 'sg'
  | 'br'
  | 'global'

export interface RadioRegion {
  id: RadioRegionId
  label: string
  flag: string
  countryCode: string
}

export const RADIO_REGIONS: RadioRegion[] = [
  // 1st Priority
  { id: 'bd', label: 'Bangladesh', flag: '🇧🇩', countryCode: 'BD' },
  // 2nd Priority
  { id: 'in', label: 'India', flag: '🇮🇳', countryCode: 'IN' },
  // 3rd Priority
  { id: 'pk', label: 'Pakistan', flag: '🇵🇰', countryCode: 'PK' },
  // Top Global Countries
  { id: 'us', label: 'United States', flag: '🇺🇸', countryCode: 'US' },
  { id: 'uk', label: 'United Kingdom', flag: '🇬🇧', countryCode: 'GB' },
  { id: 'sa', label: 'Saudi Arabia', flag: '🇸🇦', countryCode: 'SA' },
  { id: 'ae', label: 'UAE', flag: '🇦🇪', countryCode: 'AE' },
  { id: 'qa', label: 'Qatar', flag: '🇶🇦', countryCode: 'QA' },
  { id: 'ca', label: 'Canada', flag: '🇨🇦', countryCode: 'CA' },
  { id: 'au', label: 'Australia', flag: '🇦🇺', countryCode: 'AU' },
  { id: 'tr', label: 'Turkey', flag: '🇹🇷', countryCode: 'TR' },
  { id: 'de', label: 'Germany', flag: '🇩🇪', countryCode: 'DE' },
  { id: 'fr', label: 'France', flag: '🇫🇷', countryCode: 'FR' },
  { id: 'es', label: 'Spain', flag: '🇪🇸', countryCode: 'ES' },
  { id: 'it', label: 'Italy', flag: '🇮🇹', countryCode: 'IT' },
  { id: 'jp', label: 'Japan', flag: '🇯🇵', countryCode: 'JP' },
  { id: 'kr', label: 'South Korea', flag: '🇰🇷', countryCode: 'KR' },
  { id: 'my', label: 'Malaysia', flag: '🇲🇾', countryCode: 'MY' },
  { id: 'id', label: 'Indonesia', flag: '🇮🇩', countryCode: 'ID' },
  { id: 'sg', label: 'Singapore', flag: '🇸🇬', countryCode: 'SG' },
  { id: 'br', label: 'Brazil', flag: '🇧🇷', countryCode: 'BR' },
  { id: 'global', label: 'Top Global', flag: '🌍', countryCode: '' },
]

export type RadioCategoryId =
  | 'all'
  | 'music'
  | 'news'
  | 'lofi'
  | 'islamic'
  | 'rock'
  | 'classical'
  | 'dance'
  | 'folk'

export interface RadioCategory {
  id: RadioCategoryId
  label: string
}

export const RADIO_CATEGORIES: RadioCategory[] = [
  { id: 'all', label: 'All Stations' },
  { id: 'music', label: 'Hits & Pop' },
  { id: 'news', label: 'News & Talk' },
  { id: 'lofi', label: 'Lofi & Chill' },
  { id: 'islamic', label: 'Quran & Islamic' },
  { id: 'rock', label: 'Rock' },
  { id: 'classical', label: 'Classical & Jazz' },
  { id: 'dance', label: 'Dance & EDM' },
  { id: 'folk', label: 'Folk & Desi' },
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

export interface RadioStation extends PlayableTrack {
  country?: string
  countryCode?: string
  codec?: string
  bitrate?: number
  votes?: number
  tags?: string
}

export type RadioHealthStatus = 'unknown' | 'checking' | 'online' | 'offline'
export type NetworkStrengthLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'offline' | 'unknown'

const DEFAULT_BANGLADESH_STATIONS: RadioStation[] = [
  {
    id: 'radio-bd-quran',
    title: 'Al-Quran Bangla',
    artist: 'Bangladesh • Islamic • 128k',
    duration: 0,
    src: 'https://qurango.net/radio/tarateel',
    coverUrl: 'https://www.liveonlineradio.net/wp-content/uploads/2012/03/Bangla-Al-Quran.jpg',
    kind: 'stream',
    createdAt: 1,
    country: 'Bangladesh',
    countryCode: 'BD',
    codec: 'MP3',
    bitrate: 128,
    tags: 'quran,islamic,religious,bangla',
  },
  {
    id: 'radio-bd-ullash',
    title: 'Radio Ullash',
    artist: 'Bangladesh • Dhaka • 128k',
    duration: 0,
    src: 'https://stream.zeno.fm/gpgkgp9mp18uv.mp3',
    coverUrl: 'https://radioullash.com/wp-content/uploads/2021/04/radio-ullash-logo.png',
    kind: 'stream',
    createdAt: 2,
    country: 'Bangladesh',
    countryCode: 'BD',
    codec: 'MP3',
    bitrate: 128,
    tags: 'music,pop,hits,bangla',
  },
  {
    id: 'radio-bd-dhakafm',
    title: 'Dhaka FM 90.4',
    artist: 'Bangladesh • Dhaka • 64k',
    duration: 0,
    src: 'https://play.dhakafm904.com/;',
    coverUrl: 'https://i.postimg.cc/Z5MBwBZ5/dhaka-fm.png',
    kind: 'stream',
    createdAt: 3,
    country: 'Bangladesh',
    countryCode: 'BD',
    codec: 'MP3',
    bitrate: 64,
    tags: 'dhaka,fm,hits,bangla',
  },
  {
    id: 'radio-bd-today',
    title: 'Radio Today 89.6 FM',
    artist: 'Bangladesh • News & Music',
    duration: 0,
    src: 'https://stream-285.surfernetwork.com/8wv4d8g4344tv',
    coverUrl: 'https://i.postimg.cc/MT7JFPDK/radio-today.png',
    kind: 'stream',
    createdAt: 4,
    country: 'Bangladesh',
    countryCode: 'BD',
    codec: 'MP3',
    bitrate: 128,
    tags: 'news,music,bangla,talk',
  },
  {
    id: 'radio-bd-foorti',
    title: 'Radio Foorti 88.0 FM',
    artist: 'Bangladesh • Pop & Hits',
    duration: 0,
    src: 'https://radiofoorti.fm/api/stream',
    coverUrl: 'https://i.postimg.cc/0NWMBYGh/radio-foorti.png',
    kind: 'stream',
    createdAt: 5,
    country: 'Bangladesh',
    countryCode: 'BD',
    codec: 'MP3',
    bitrate: 128,
    tags: 'pop,hits,bangla',
  },
  {
    id: 'radio-bd-bhumi',
    title: 'Radio Bhumi 92.8 FM',
    artist: 'Bangladesh • Folk & Bangla',
    duration: 0,
    src: 'https://stream.zeno.fm/be5bqmk1k18uv',
    coverUrl: 'https://cdn-radiotime-logos.tunein.com/s151241d.png',
    kind: 'stream',
    createdAt: 6,
    country: 'Bangladesh',
    countryCode: 'BD',
    codec: 'MP3',
    bitrate: 192,
    tags: 'folk,bangla,culture',
  },
  {
    id: 'radio-bd-peoples',
    title: 'Peoples Radio 91.6 FM',
    artist: 'Bangladesh • Pop & Talk',
    duration: 0,
    src: 'https://s3.myradiostream.com:14498/listen.mp3',
    coverUrl: 'https://i.postimg.cc/gc6kkfKK/peoples-radio.png',
    kind: 'stream',
    createdAt: 7,
    country: 'Bangladesh',
    countryCode: 'BD',
    codec: 'MP3',
    bitrate: 96,
    tags: 'talk,pop,bangla',
  },
  {
    id: 'radio-bd-goongoon',
    title: 'Radio GoonGoon',
    artist: 'Bangladesh • 192k MP3',
    duration: 0,
    src: 'https://audio.streamcast.xyz/listen/radiogoongoon/radio.mp3',
    coverUrl: '',
    kind: 'stream',
    createdAt: 8,
    country: 'Bangladesh',
    countryCode: 'BD',
    codec: 'MP3',
    bitrate: 192,
    tags: 'music,desi,bangla',
  },
]

// State variables
const stations = ref<RadioStation[]>([])
const isLoadingRadio = ref(false)
const isCheckingHealth = ref(false)
const radioError = ref<string | null>(null)
const activeRegion = ref<RadioRegionId>('bd')
const activeCategory = ref<RadioCategoryId>('all')
const currentRadioSearch = ref('')

const stationHealth = ref<Record<string, RadioHealthStatus>>({})
const stationLatency = ref<Record<string, number>>({})
const radioCache = new Map<string, RadioStation[]>()

let saveHealthTimer: number | undefined

function loadHealthCache(): void {
  try {
    const storedH = sessionStorage.getItem(HEALTH_CACHE_KEY)
    if (storedH) {
      const parsed = JSON.parse(storedH) as Record<string, RadioHealthStatus>
      if (parsed && typeof parsed === 'object') {
        stationHealth.value = parsed
      }
    }
    const storedL = sessionStorage.getItem(LATENCY_CACHE_KEY)
    if (storedL) {
      const parsedL = JSON.parse(storedL) as Record<string, number>
      if (parsedL && typeof parsedL === 'object') {
        stationLatency.value = parsedL
      }
    }
  } catch {}
}
loadHealthCache()

function persistHealthCache(): void {
  if (typeof window === 'undefined') return
  window.clearTimeout(saveHealthTimer)
  saveHealthTimer = window.setTimeout(() => {
    try {
      sessionStorage.setItem(HEALTH_CACHE_KEY, JSON.stringify(stationHealth.value))
      sessionStorage.setItem(LATENCY_CACHE_KEY, JSON.stringify(stationLatency.value))
    } catch {}
  }, 400)
}

export function getStationStatus(stationId: string): RadioHealthStatus {
  return stationHealth.value[stationId] || 'unknown'
}

export function setStationStatus(stationId: string, status: RadioHealthStatus): void {
  stationHealth.value[stationId] = status
  persistHealthCache()
}

export function getStationLatency(stationId: string): number | undefined {
  return stationLatency.value[stationId]
}

export function setStationLatency(stationId: string, latencyMs: number): void {
  stationLatency.value[stationId] = latencyMs
  persistHealthCache()
}

export function getStationNetworkStrength(stationId: string): NetworkStrengthLevel {
  const status = stationHealth.value[stationId]
  if (status === 'offline') return 'offline'

  const lat = stationLatency.value[stationId]
  if (lat !== undefined) {
    if (lat < 350) return 'excellent'
    if (lat < 700) return 'good'
    if (lat < 1400) return 'fair'
    return 'poor'
  }

  if (status === 'online') return 'good'
  return 'unknown'
}

/** Generates clean SVG artwork for radio stations without favicons */
function getStationCover(station: RadioBrowserStation): string {
  if (station.favicon && station.favicon.startsWith('http')) {
    return station.favicon
  }

  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#e11d48"/>
          <stop offset="100%" stop-color="#09090b"/>
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="48" fill="url(#g)"/>
      <circle cx="128" cy="138" r="38" stroke="#fda4af" stroke-width="8" fill="none" opacity="0.8"/>
      <circle cx="128" cy="138" r="16" fill="#f43f5e"/>
      <path d="M78 88 A76 76 0 0 1 178 88" stroke="#cbd5e1" stroke-width="8" stroke-linecap="round" fill="none"/>
      <path d="M54 64 A110 110 0 0 1 202 64" stroke="#fb7185" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.6"/>
    </svg>
  `)
  )
}

/** Sanitize stream URLs: upgrade HTTP domains on HTTPS origins, drop raw HTTP IPs on HTTPS, and strip expired Zeno.fm tokens */
function sanitizeStreamUrl(url: string): string {
  let cleaned = (url || '').trim()
  if (!cleaned) return ''

  if (cleaned.includes('zeno.fm')) {
    cleaned = cleaned.replace(/^http:\/\/stream\.zeno\.fm/, 'https://stream.zeno.fm')
    cleaned = cleaned.replace(/^http:\/\/stream-(\d+)\.zeno\.fm/, 'https://stream-$1.zeno.fm')
    const qIndex = cleaned.indexOf('?')
    if (qIndex !== -1) {
      cleaned = cleaned.slice(0, qIndex)
    }
  }

  const isHttpsOrigin =
    typeof window !== 'undefined' ? window.location.protocol === 'https:' : true

  if (isHttpsOrigin && cleaned.startsWith('http://')) {
    const isRawIp = /^http:\/\/(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(\/|$)/i.test(cleaned)
    if (isRawIp) {
      return ''
    }
    cleaned = cleaned.replace(/^http:\/\//i, 'https://')
  }

  return cleaned
}

function toRadioStation(station: RadioBrowserStation): RadioStation {
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
    country: station.country,
    countryCode: station.countrycode,
    codec: station.codec,
    bitrate: station.bitrate,
    votes: station.votes,
    tags: station.tags,
  }
}

/** Fetch from Radio Browser with automatic fallback across multi-region mirrors */
async function fetchFromRadioBrowser(path: string): Promise<RadioStation[]> {
  let lastError: unknown = null

  for (const server of RADIO_SERVERS) {
    const url = `${server}${path}`
    try {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 6500)

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

      const seen = new Set<string>()
      const result: RadioStation[] = []

      for (const item of list) {
        const rawUrl = (item.url_resolved || item.url || '').trim()
        const streamUrl = sanitizeStreamUrl(rawUrl)
        if (!streamUrl) continue
        const normName = (item.name || '').trim().toLowerCase()
        if (normName && seen.has(normName)) continue
        if (normName) seen.add(normName)
        result.push(toRadioStation(item))
      }

      return result
    } catch (err) {
      lastError = err
    }
  }

  throw lastError ?? new Error('All radio mirrors failed to respond')
}

/** Check station health and measure latency */
export async function checkStationHealth(
  station: RadioStation,
  timeoutMs = 2500,
): Promise<{ status: RadioHealthStatus; latencyMs?: number; strength: NetworkStrengthLevel }> {
  const sanitized = sanitizeStreamUrl(station.src)
  if (!sanitized) {
    return { status: 'offline', strength: 'offline' }
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
  const startTime = performance.now()

  try {
    const res = await fetch(sanitized, {
      method: 'GET',
      signal: controller.signal,
    })

    window.clearTimeout(timeoutId)
    const latencyMs = Math.max(10, Math.round(performance.now() - startTime))

    try {
      void res.body?.cancel()
    } catch {}

    if (res.ok || res.status === 206 || res.status === 304 || (res.status >= 300 && res.status < 400)) {
      let strength: NetworkStrengthLevel = 'excellent'
      if (latencyMs < 350) strength = 'excellent'
      else if (latencyMs < 700) strength = 'good'
      else strength = 'fair'

      return { status: 'online', latencyMs, strength }
    }

    if (res.status === 404 || res.status === 410 || res.status === 403 || res.status >= 500) {
      return { status: 'offline', strength: 'offline' }
    }

    return { status: 'online', latencyMs, strength: latencyMs < 500 ? 'good' : 'fair' }
  } catch {
    // Icecast/Shoutcast servers frequently omit CORS headers even when the stream is online
    // and playable in <audio>. If the request didn't time out, probe with mode: 'no-cors'.
    if (!controller.signal.aborted) {
      try {
        const resOpaque = await fetch(sanitized, {
          method: 'GET',
          mode: 'no-cors',
          signal: controller.signal,
        })
        window.clearTimeout(timeoutId)
        try {
          void resOpaque.body?.cancel()
        } catch {}
        if (resOpaque.type === 'opaque' || resOpaque.ok) {
          const latencyMs = Math.max(10, Math.round(performance.now() - startTime))
          const strength: NetworkStrengthLevel =
            latencyMs < 350 ? 'excellent' : latencyMs < 700 ? 'good' : 'fair'
          return { status: 'online', latencyMs, strength }
        }
      } catch {
        /* fallback also failed */
      }
    }
    window.clearTimeout(timeoutId)
    return { status: 'offline', strength: 'offline' }
  }
}

const inFlightChecks = new Set<string>()
let latestRadioRequestId = 0

export async function runBackgroundHealthCheck(
  targetStations: RadioStation[],
  concurrency = 8,
): Promise<void> {
  if (!targetStations || targetStations.length === 0) return

  const pending = targetStations.filter((s) => {
    if (inFlightChecks.has(s.id)) return false
    const status = stationHealth.value[s.id]
    const latency = stationLatency.value[s.id]
    return !status || status === 'unknown' || latency === undefined
  })

  if (pending.length === 0) return

  isCheckingHealth.value = true

  const worker = async () => {
    while (pending.length > 0) {
      const station = pending.shift()
      if (!station) break
      inFlightChecks.add(station.id)
      try {
        const result = await checkStationHealth(station)
        setStationStatus(station.id, result.status)
        if (result.latencyMs !== undefined) {
          setStationLatency(station.id, result.latencyMs)
        }
      } catch {
        setStationStatus(station.id, 'offline')
      } finally {
        inFlightChecks.delete(station.id)
      }
    }
  }

  const pool = Array.from({ length: Math.min(concurrency, pending.length) }, () => worker())
  await Promise.all(pool)
  isCheckingHealth.value = false
}

export function useRadio() {
  /** Filtered stations according to category, search query, and excluding offline stations */
  const filteredStations = computed(() => {
    let list = stations.value

    // 1. Category Filter
    if (activeCategory.value !== 'all') {
      const target = activeCategory.value
      const filtered = list.filter((s) => {
        const tags = (s.tags || '').toLowerCase()
        const title = s.title.toLowerCase()
        const artist = s.artist.toLowerCase()
        const combined = `${tags} ${title} ${artist}`

        if (target === 'news') return combined.includes('news') || combined.includes('talk') || combined.includes('khobor') || combined.includes('samachar')
        if (target === 'islamic') return combined.includes('quran') || combined.includes('islam') || combined.includes('koran') || combined.includes('muslim') || combined.includes('allah')
        if (target === 'lofi') return combined.includes('lofi') || combined.includes('chill') || combined.includes('ambient') || combined.includes('relax') || combined.includes('lounge')
        if (target === 'rock') return combined.includes('rock') || combined.includes('metal') || combined.includes('alternative') || combined.includes('punk') || combined.includes('indie')
        if (target === 'classical') return combined.includes('classical') || combined.includes('jazz') || combined.includes('blues') || combined.includes('symphony') || combined.includes('piano')
        if (target === 'dance') return combined.includes('dance') || combined.includes('electronic') || combined.includes('house') || combined.includes('techno') || combined.includes('edm') || combined.includes('club')
        if (target === 'folk') return combined.includes('folk') || combined.includes('traditional') || combined.includes('desi') || combined.includes('bangla') || combined.includes('bengali')
        if (target === 'music') return combined.includes('pop') || combined.includes('music') || combined.includes('hits') || combined.includes('song') || combined.includes('fm')
        return true
      })
      if (filtered.length > 0) {
        list = filtered
      }
    }

    // 2. Search query filter
    if (currentRadioSearch.value.trim()) {
      const q = currentRadioSearch.value.toLowerCase().trim()
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          (s.tags || '').toLowerCase().includes(q),
      )
    }

    // 3. Exclude verified offline stations (unless all matching stations are marked offline)
    const onlineOrUnknown = list.filter((s) => getStationStatus(s.id) !== 'offline')
    if (onlineOrUnknown.length > 0) {
      list = onlineOrUnknown
    }

    return list
  })

  async function selectRegion(regionId: RadioRegionId, force = false): Promise<RadioStation[]> {
    const reqId = ++latestRadioRequestId
    activeRegion.value = regionId
    currentRadioSearch.value = ''

    const reg = RADIO_REGIONS.find((r) => r.id === regionId) ?? RADIO_REGIONS[0]

    // In-memory cache
    if (!force && radioCache.has(regionId)) {
      const cached = radioCache.get(regionId)!
      stations.value = cached
      radioError.value = null
      isLoadingRadio.value = false
      void runBackgroundHealthCheck(cached)
      return cached
    }

    // Check localStorage cache
    if (!force) {
      try {
        const stored = localStorage.getItem(`${CACHE_PREFIX}${regionId}`)
        if (stored) {
          const parsed = JSON.parse(stored) as RadioStation[]
          if (Array.isArray(parsed) && parsed.length > 0) {
            radioCache.set(regionId, parsed)
            stations.value = parsed
            radioError.value = null
            isLoadingRadio.value = false
            void runBackgroundHealthCheck(parsed)
            return parsed
          }
        }
      } catch {}
    }

    // Pre-seed top BD stations for immediate offline-first play
    if (regionId === 'bd' && stations.value.length === 0) {
      stations.value = DEFAULT_BANGLADESH_STATIONS
    }

    isLoadingRadio.value = true
    radioError.value = null

    try {
      let path = ''
      if (reg.countryCode) {
        path = `/json/stations/bycountrycodeexact/${encodeURIComponent(reg.countryCode)}?limit=60&hidebroken=true&order=votes&reverse=true`
      } else {
        path = `/json/stations?limit=60&hidebroken=true&order=votes&reverse=true`
      }

      const fetched = await fetchFromRadioBrowser(path)
      if (reqId !== latestRadioRequestId) return stations.value
      stations.value = fetched.length > 0 ? fetched : (regionId === 'bd' ? DEFAULT_BANGLADESH_STATIONS : [])
      radioCache.set(regionId, stations.value)
      try {
        localStorage.setItem(`${CACHE_PREFIX}${regionId}`, JSON.stringify(stations.value))
      } catch {}
      void runBackgroundHealthCheck(stations.value)
      return stations.value
    } catch (err) {
      if (reqId !== latestRadioRequestId) return stations.value
      console.warn('[Pulse] Failed to load radio region:', regionId, err)
      if (stations.value.length === 0) {
        if (regionId === 'bd') {
          stations.value = DEFAULT_BANGLADESH_STATIONS
        } else {
          radioError.value = navigator.onLine
            ? 'Could not connect to radio directory. Try refreshing.'
            : 'You are offline. Connect to internet to stream live radio.'
        }
      }
      return stations.value
    } finally {
      if (reqId === latestRadioRequestId) {
        isLoadingRadio.value = false
      }
    }
  }

  function selectCategory(categoryId: RadioCategoryId): void {
    activeCategory.value = categoryId
  }

  async function searchRadio(query: string): Promise<RadioStation[]> {
    const clean = query.trim()
    if (!clean) {
      return selectRegion(activeRegion.value)
    }

    const reqId = ++latestRadioRequestId
    currentRadioSearch.value = clean
    isLoadingRadio.value = true
    radioError.value = null

    try {
      let path = `/json/stations/search?name=${encodeURIComponent(clean)}&limit=35&hidebroken=true&order=votes&reverse=true`
      let results = await fetchFromRadioBrowser(path)

      if (results.length === 0) {
        path = `/json/stations/bytag/${encodeURIComponent(clean)}?limit=35&hidebroken=true&order=votes&reverse=true`
        results = await fetchFromRadioBrowser(path)
      }

      if (reqId !== latestRadioRequestId) return stations.value
      stations.value = results
      if (results.length === 0) {
        radioError.value = `No radio stations found for “${clean}”.`
      } else {
        void runBackgroundHealthCheck(results)
      }
      return results
    } catch (err) {
      if (reqId !== latestRadioRequestId) return stations.value
      console.warn('[Pulse] Radio search failed:', err)
      radioError.value = navigator.onLine
        ? 'Radio search request failed. Please try again.'
        : 'You are offline. Connect to internet to search radio stations.'
      return []
    } finally {
      if (reqId === latestRadioRequestId) {
        isLoadingRadio.value = false
      }
    }
  }

  async function fetchRadioStations(force = false): Promise<RadioStation[]> {
    if (currentRadioSearch.value) {
      return searchRadio(currentRadioSearch.value)
    }
    return selectRegion(activeRegion.value, force)
  }

  return {
    stations,
    filteredStations,
    isLoadingRadio,
    isCheckingHealth,
    radioError,
    activeRegion,
    activeCategory,
    currentRadioSearch,
    regions: RADIO_REGIONS,
    categories: RADIO_CATEGORIES,
    selectRegion,
    selectCategory,
    searchRadio,
    fetchRadioStations,
    getStationStatus,
    getStationLatency,
    getStationNetworkStrength,
    runBackgroundHealthCheck,
  }
}
