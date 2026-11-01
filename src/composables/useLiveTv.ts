import { computed, ref } from 'vue'

export type TvRegionId =
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

export interface TvRegion {
  id: TvRegionId
  label: string
  flag: string
  url: string
}

export const TV_REGIONS: TvRegion[] = [
  // 1st Priority
  { id: 'bd', label: 'Bangladesh', flag: '🇧🇩', url: 'https://iptv-org.github.io/iptv/countries/bd.m3u' },
  // 2nd Priority
  { id: 'in', label: 'India', flag: '🇮🇳', url: 'https://iptv-org.github.io/iptv/countries/in.m3u' },
  // 3rd Priority
  { id: 'pk', label: 'Pakistan', flag: '🇵🇰', url: 'https://iptv-org.github.io/iptv/countries/pk.m3u' },
  // Top Global Countries
  { id: 'us', label: 'United States', flag: '🇺🇸', url: 'https://iptv-org.github.io/iptv/countries/us.m3u' },
  { id: 'uk', label: 'United Kingdom', flag: '🇬🇧', url: 'https://iptv-org.github.io/iptv/countries/uk.m3u' },
  { id: 'sa', label: 'Saudi Arabia', flag: '🇸🇦', url: 'https://iptv-org.github.io/iptv/countries/sa.m3u' },
  { id: 'ae', label: 'UAE', flag: '🇦🇪', url: 'https://iptv-org.github.io/iptv/countries/ae.m3u' },
  { id: 'qa', label: 'Qatar', flag: '🇶🇦', url: 'https://iptv-org.github.io/iptv/countries/qa.m3u' },
  { id: 'ca', label: 'Canada', flag: '🇨🇦', url: 'https://iptv-org.github.io/iptv/countries/ca.m3u' },
  { id: 'au', label: 'Australia', flag: '🇦🇺', url: 'https://iptv-org.github.io/iptv/countries/au.m3u' },
  { id: 'tr', label: 'Turkey', flag: '🇹🇷', url: 'https://iptv-org.github.io/iptv/countries/tr.m3u' },
  { id: 'de', label: 'Germany', flag: '🇩🇪', url: 'https://iptv-org.github.io/iptv/countries/de.m3u' },
  { id: 'fr', label: 'France', flag: '🇫🇷', url: 'https://iptv-org.github.io/iptv/countries/fr.m3u' },
  { id: 'es', label: 'Spain', flag: '🇪🇸', url: 'https://iptv-org.github.io/iptv/countries/es.m3u' },
  { id: 'it', label: 'Italy', flag: '🇮🇹', url: 'https://iptv-org.github.io/iptv/countries/it.m3u' },
  { id: 'jp', label: 'Japan', flag: '🇯🇵', url: 'https://iptv-org.github.io/iptv/countries/jp.m3u' },
  { id: 'kr', label: 'South Korea', flag: '🇰🇷', url: 'https://iptv-org.github.io/iptv/countries/kr.m3u' },
  { id: 'my', label: 'Malaysia', flag: '🇲🇾', url: 'https://iptv-org.github.io/iptv/countries/my.m3u' },
  { id: 'id', label: 'Indonesia', flag: '🇮🇩', url: 'https://iptv-org.github.io/iptv/countries/id.m3u' },
  { id: 'sg', label: 'Singapore', flag: '🇸🇬', url: 'https://iptv-org.github.io/iptv/countries/sg.m3u' },
  { id: 'br', label: 'Brazil', flag: '🇧🇷', url: 'https://iptv-org.github.io/iptv/countries/br.m3u' },
  { id: 'global', label: 'World News', flag: '🌍', url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
]

export type TvCategoryId =
  | 'all'
  | 'news'
  | 'entertainment'
  | 'sports'
  | 'music'
  | 'movies'
  | 'kids'
  | 'religious'
  | 'documentary'

export interface TvCategory {
  id: TvCategoryId
  label: string
}

export const TV_CATEGORIES: TvCategory[] = [
  { id: 'all', label: 'All Channels' },
  { id: 'news', label: 'News' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'sports', label: 'Sports' },
  { id: 'music', label: 'Music' },
  { id: 'movies', label: 'Movies' },
  { id: 'kids', label: 'Kids & Animation' },
  { id: 'religious', label: 'Religious' },
  { id: 'documentary', label: 'Documentary' },
]

export interface TvChannel {
  id: string
  rawName: string
  cleanName: string
  resolution: string
  logo: string
  group: string
  categoryId: TvCategoryId
  url: string
  country: TvRegionId
}

const CACHE_PREFIX = 'pulse:tv_v3_'

/**
 * Sanitizes stream URLs for HTTPS environments (e.g. GitHub Pages).
 * - Preserves already encrypted https:// streams.
 * - Upgrades unencrypted http:// streams on domain names to https://.
 * - Drops unencrypted raw IP http:// streams on HTTPS origins because browsers
 *   block them as Mixed Active Content and raw IPs do not have valid TLS certificates.
 */
export function sanitizeStreamUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('https://')) {
    return trimmed
  }

  // Detect raw IP addresses like http://103.99.249.139/anandatv/index.m3u8
  const isRawIp = /^http:\/\/(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(\/|$)/i.test(trimmed)

  const isHttpsOrigin =
    typeof window !== 'undefined'
      ? window.location.protocol === 'https:'
      : true // Default to HTTPS-safe mode

  if (isHttpsOrigin) {
    if (isRawIp) {
      // Insecure raw IP streams cannot load over HTTPS (Mixed Content violation)
      return null
    }
    // Auto-upgrade domain HTTP to HTTPS
    if (trimmed.startsWith('http://')) {
      return trimmed.replace(/^http:\/\//i, 'https://')
    }
  }

  return trimmed
}

// Pre-seeded top Bangladeshi channels for instant offline-first playback (100% HTTPS verified)
const SEED_BD_CHANNELS: TvChannel[] = [
  {
    id: 'tv-bd-banglavision',
    rawName: 'Bangla Vision (720p)',
    cleanName: 'Bangla Vision',
    resolution: '720P',
    logo: 'https://i.imgur.com/nCWgp38.png',
    group: 'General',
    categoryId: 'entertainment',
    url: 'https://tvsen5.aynaott.com/banglavision/index.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-atnbangla',
    rawName: 'ATN Bangla (720p)',
    cleanName: 'ATN Bangla',
    resolution: '720P',
    logo: 'https://i.imgur.com/K1HmMRz.png',
    group: 'General',
    categoryId: 'entertainment',
    url: 'https://tvsen5.aynascope.net/atnbangla/index.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-duronto',
    rawName: 'Duronto TV (720p)',
    cleanName: 'Duronto TV',
    resolution: '720P',
    logo: 'https://i.imgur.com/gXsddRK.png',
    group: 'Kids',
    categoryId: 'kids',
    url: 'https://tvsen6.aynaott.com/6xyZ3N4oHv2KBJdB6W4p/index.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-maasranga',
    rawName: 'Maasranga TV (720p)',
    cleanName: 'Maasranga TV',
    resolution: '720P',
    logo: 'https://i.imgur.com/uVZJMed.png',
    group: 'Entertainment',
    categoryId: 'entertainment',
    url: 'https://tvsen5.aynascope.net/maasrangatv/index.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-rtv',
    rawName: 'RTV (Bangladesh) (720p)',
    cleanName: 'RTV',
    resolution: '720P',
    logo: 'https://i.imgur.com/yu8ugqt.png',
    group: 'General',
    categoryId: 'entertainment',
    url: 'https://tvsen5.aynascope.net/RtvHD/index.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-ntv',
    rawName: 'NTV (Bangladesh) (720p)',
    cleanName: 'NTV',
    resolution: '720P',
    logo: 'https://i.imgur.com/l75bDTx.png',
    group: 'General',
    categoryId: 'entertainment',
    url: 'https://tvsen5.aynaott.com/xV4jEKf3D9zc/index.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-ekushey',
    rawName: 'Ekushey TV (480p)',
    cleanName: 'Ekushey TV',
    resolution: '480P',
    logo: 'https://i.imgur.com/lRpkGHj.png',
    group: 'News',
    categoryId: 'news',
    url: 'https://ekusheyserver.com/etvlivesn.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-nexus',
    rawName: 'Nexus TV (576p)',
    cleanName: 'Nexus TV',
    resolution: '576P',
    logo: 'https://i.imgur.com/XcJZKg4.png',
    group: 'General',
    categoryId: 'entertainment',
    url: 'https://tvsen6.aynaott.com/Epm7WrFa/index.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-boishakhi',
    rawName: 'Boishakhi TV',
    cleanName: 'Boishakhi TV',
    resolution: '720P',
    logo: 'https://i.imgur.com/gxL05Y4.png',
    group: 'General',
    categoryId: 'entertainment',
    url: 'https://boishakhi.sonarbanglatv.com/boishakhi/boishakhitv/index.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-starjalsha',
    rawName: 'Star Jalsha HD (720p)',
    cleanName: 'Star Jalsha HD',
    resolution: '720P',
    logo: 'https://i.imgur.com/IlufzR5.png',
    group: 'Entertainment',
    categoryId: 'entertainment',
    url: 'https://da86m1sqpm3o0.cloudfront.net/28072023/smil:starjalsha.smil/chunklist_b1928000.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-zeebangla',
    rawName: 'Zee Bangla HD (720p)',
    cleanName: 'Zee Bangla HD',
    resolution: '720P',
    logo: 'https://xstreamcp-assets-msp.streamready.in/assets/LIVETV/LIVECHANNEL/LIVETV_LIVETVCHANNEL_ZEE_BANGLA/images/LOGO_HD/LOGO_HD_image.png',
    group: 'Entertainment',
    categoryId: 'entertainment',
    url: 'https://raw.githubusercontent.com/amazeyourself/adaptive-streams/refs/heads/main/streams/in/YuppTV/ZeeBanglaHD.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-peacetv',
    rawName: 'Peace TV Bangla (1080p)',
    cleanName: 'Peace TV Bangla',
    resolution: '1080P',
    logo: 'https://i.imgur.com/1ztVXUi.png',
    group: 'Religious',
    categoryId: 'religious',
    url: 'https://dzkyvlfyge.erbvr.com/PeaceTvBangla/index.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-channels',
    rawName: 'Channel S (Bangladesh)',
    cleanName: 'Channel S',
    resolution: '720P',
    logo: 'https://www.channels.com.bd/storage/project_files/logo/2024-05-14a_n17156821814310.png',
    group: 'Culture',
    categoryId: 'entertainment',
    url: 'https://app.ncare.live/c3VydmVyX8RpbEU9Mi8xNy8yMDE0GIDU6RgzQ6NTAgdEoaeFzbF92YWxIZTO0U0ezN1IzMyfvcGVMZEJCTEFWeVN3PTOmdFsaWRtaW51aiPhnPTI2/channels.stream/live-orgin/channels.stream/playlist.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-mytv',
    rawName: 'My TV (Bangladesh)',
    cleanName: 'My TV',
    resolution: '720P',
    logo: 'https://i.imgur.com/475qK5T.png',
    group: 'General',
    categoryId: 'entertainment',
    url: 'https://app.ncare.live/c3VydmVyX8RpbEU9Mi8xNy8yMDE0GIDU6RgzQ6NTAgdEoaeFzbF92YWxIZTO0U0ezN1IzMyfvcGVMZEJCTEFWeVN3PTOmdFsaWRtaW51aiPhnPTI2/mytv-up-off.stream/live-orgin/mytv-up-off.stream/playlist.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-deshitv',
    rawName: 'Deshi TV (720p)',
    cleanName: 'Deshi TV',
    resolution: '720P',
    logo: 'https://i.imgur.com/PzqzgMm.png',
    group: 'General',
    categoryId: 'entertainment',
    url: 'https://deshitv.deshitv24.net/live/myStream/playlist.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-azantv',
    rawName: 'Azan TV',
    cleanName: 'Azan TV',
    resolution: '720P',
    logo: 'https://i.imgur.com/JlqS6I4.jpeg',
    group: 'Religious',
    categoryId: 'religious',
    url: 'https://dbcanada.sonarbanglatv.com/azantv/atv/index.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-rajdhanitv',
    rawName: 'Rajdhani TV SD (1080p)',
    cleanName: 'Rajdhani TV',
    resolution: '1080P',
    logo: 'https://i.imgur.com/MBm2gPz.jpeg',
    group: 'General',
    categoryId: 'entertainment',
    url: 'https://stream.shariarsuvo.com/hls5/rajdhanicable.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-rupashibangla',
    rawName: 'Rupashi Bangla TV (720p)',
    cleanName: 'Rupashi Bangla TV',
    resolution: '720P',
    logo: 'https://jiotvimages.cdn.jio.com/dare_images/images/Rupashi_Bangla.png',
    group: 'Entertainment',
    categoryId: 'entertainment',
    url: 'https://app24.jagobd.com.bd/c3VydmVyX8RpbEU9Mi8xNy8yMFDEEHGcfRgzQ6NTAgdEoaeFzbF92YWxIZTO0U0ezN1IzMyfvcEdsEfeDeKiNkVN3PTOmdFseWRtaW51aiPhnPTI2/ruposhibangla.stream/playlist.m3u8',
    country: 'bd',
  },
]

function mapGroupToCategory(groupTitle: string): TvCategoryId {
  const g = groupTitle.toLowerCase()
  if (g.includes('news') || g.includes('business') || g.includes('legislative') || g.includes('weather')) {
    return 'news'
  }
  if (g.includes('sport') || g.includes('auto') || g.includes('outdoor')) {
    return 'sports'
  }
  if (g.includes('music')) {
    return 'music'
  }
  if (g.includes('movie') || g.includes('classic')) {
    return 'movies'
  }
  if (g.includes('kid') || g.includes('animation') || g.includes('education')) {
    return 'kids'
  }
  if (g.includes('relig') || g.includes('islam') || g.includes('quran')) {
    return 'religious'
  }
  if (g.includes('documentary') || g.includes('science') || g.includes('travel')) {
    return 'documentary'
  }
  return 'entertainment'
}

function parseChannelName(rawName: string): { cleanName: string; resolution: string } {
  let name = rawName.trim()
  let resolution = ''

  const resMatch = name.match(/\((\d{3,4}p|HD|SD|4K|FHD)\)/i)
  if (resMatch) {
    resolution = resMatch[1].toUpperCase()
    name = name.replace(resMatch[0], '').trim()
  } else {
    const wordMatch = name.match(/\b(1080p|720p|480p|HD|SD|4K)\b/i)
    if (wordMatch) {
      resolution = wordMatch[1].toUpperCase()
    }
  }

  name = name.replace(/\[[^\]]*\]/g, '').trim()
  return { cleanName: name || rawName, resolution }
}

function parseM3u(content: string, region: TvRegionId): TvChannel[] {
  const lines = content.split('\n')
  const channels: TvChannel[] = []
  let currentExtInf: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    if (line.startsWith('#EXTINF:')) {
      currentExtInf = line
    } else if (!line.startsWith('#') && currentExtInf) {
      // Filter out raw IP unencrypted streams on HTTPS and auto-upgrade domains to https://
      const sanitizedUrl = sanitizeStreamUrl(line)
      if (sanitizedUrl) {
        const logoMatch = currentExtInf.match(/tvg-logo="([^"]*)"/)
        const logo = logoMatch ? logoMatch[1] : ''

        const groupMatch = currentExtInf.match(/group-title="([^"]*)"/)
        const group = groupMatch ? groupMatch[1] : 'General'

        const commaIdx = currentExtInf.lastIndexOf(',')
        const rawName = commaIdx !== -1 ? currentExtInf.slice(commaIdx + 1).trim() : 'Live TV'

        const { cleanName, resolution } = parseChannelName(rawName)
        const categoryId = mapGroupToCategory(group)

        channels.push({
          id: `tv-${region}-${channels.length}-${cleanName.replace(/\W+/g, '-').toLowerCase()}`,
          rawName,
          cleanName,
          resolution,
          logo,
          group,
          categoryId,
          url: sanitizedUrl,
          country: region,
        })
      }

      currentExtInf = null
    }
  }

  return channels
}

export type ChannelHealthStatus = 'online' | 'offline' | 'checking' | 'unknown'
export type NetworkStrengthLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'offline' | 'unknown'

const HEALTH_CACHE_KEY = 'pulse:tv_health_cache_v1'
const LATENCY_CACHE_KEY = 'pulse:tv_latency_cache_v1'

// Reactive state
const channels = ref<TvChannel[]>([])
const isLoadingTv = ref(false)
const isCheckingHealth = ref(false)
const tvError = ref<string | null>(null)
const activeRegion = ref<TvRegionId>('bd')
const activeCategory = ref<TvCategoryId>('all')
const currentTvSearch = ref('')
const activePlayingChannel = ref<TvChannel | null>(null)

const channelHealth = ref<Record<string, ChannelHealthStatus>>({})
const channelLatency = ref<Record<string, number>>({})
const channelCache = new Map<TvRegionId, TvChannel[]>()

let saveHealthCacheTimer: number | undefined

function loadHealthCache(): void {
  try {
    const stored = sessionStorage.getItem(HEALTH_CACHE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, ChannelHealthStatus>
      if (parsed && typeof parsed === 'object') {
        channelHealth.value = parsed
      }
    }
  } catch {}

  try {
    const storedLat = sessionStorage.getItem(LATENCY_CACHE_KEY)
    if (storedLat) {
      const parsedLat = JSON.parse(storedLat) as Record<string, number>
      if (parsedLat && typeof parsedLat === 'object') {
        channelLatency.value = parsedLat
      }
    }
  } catch {}
}
loadHealthCache()

function persistHealthCache(): void {
  if (typeof window === 'undefined') return
  window.clearTimeout(saveHealthCacheTimer)
  saveHealthCacheTimer = window.setTimeout(() => {
    try {
      sessionStorage.setItem(HEALTH_CACHE_KEY, JSON.stringify(channelHealth.value))
      sessionStorage.setItem(LATENCY_CACHE_KEY, JSON.stringify(channelLatency.value))
    } catch {}
  }, 400)
}

export function getChannelStatus(channelId: string): ChannelHealthStatus {
  return channelHealth.value[channelId] || 'unknown'
}

export function setChannelStatus(channelId: string, status: ChannelHealthStatus): void {
  channelHealth.value[channelId] = status
  persistHealthCache()
}

export function getChannelLatency(channelId: string): number | undefined {
  return channelLatency.value[channelId]
}

export function setChannelLatency(channelId: string, latencyMs: number): void {
  channelLatency.value[channelId] = latencyMs
  persistHealthCache()
}

export function getChannelNetworkStrength(channelId: string): NetworkStrengthLevel {
  const status = channelHealth.value[channelId]
  if (status === 'offline') return 'offline'

  const lat = channelLatency.value[channelId]
  if (lat !== undefined) {
    if (lat < 350) return 'excellent'
    if (lat < 700) return 'good'
    if (lat < 1200) return 'fair'
    return 'poor'
  }

  // If online/seeded without direct ping measured yet, indicate strong default
  if (status === 'online') return 'good'
  return 'unknown'
}

export interface HealthCheckResult {
  status: 'online' | 'offline'
  latencyMs?: number
  strength: NetworkStrengthLevel
}

/**
 * Checks whether an HLS stream is active and responding, measuring network latency.
 * Simple GET avoids CORS preflight OPTIONS rejection on IPTV servers.
 * Body download is cancelled immediately after receiving headers to save bandwidth.
 */
export async function checkChannelHealth(
  channel: TvChannel,
  timeoutMs = 1500,
): Promise<HealthCheckResult> {
  const sanitized = sanitizeStreamUrl(channel.url)
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

    // Immediately cancel the response stream to avoid downloading full video/audio data
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
    window.clearTimeout(timeoutId)
    return { status: 'offline', strength: 'offline' }
  }
}

const inFlightChecks = new Set<string>()
let latestTvRequestId = 0

/**
 * Runs a thorough, high-performance background health check across all channels in the list.
 * Deduplicates in-flight requests and processes all channels concurrently without truncation.
 */
export async function runBackgroundHealthCheck(
  targetChannels: TvChannel[],
  concurrency = 12,
): Promise<void> {
  if (!targetChannels || targetChannels.length === 0) return

  // Filter channels that still need verification or latency resolution
  const pending = targetChannels.filter((ch) => {
    if (inFlightChecks.has(ch.id)) return false
    const status = channelHealth.value[ch.id]
    const hasLatency = channelLatency.value[ch.id] !== undefined
    // Needs check if status is not determined, or if online but has no latency
    return !status || status === 'unknown' || (status === 'online' && !hasLatency)
  })

  if (pending.length === 0) return

  isCheckingHealth.value = true

  // Mark all pending channels as in-flight so concurrent calls don't duplicate work
  for (const ch of pending) {
    inFlightChecks.add(ch.id)
  }

  let index = 0

  async function worker(): Promise<void> {
    while (index < pending.length) {
      const ch = pending[index++]
      if (!ch) break

      try {
        const result = await checkChannelHealth(ch, 1400)
        channelHealth.value[ch.id] = result.status
        if (result.latencyMs !== undefined) {
          channelLatency.value[ch.id] = result.latencyMs
        } else if (result.status === 'online') {
          channelLatency.value[ch.id] = 180
        }
        persistHealthCache()
      } catch {
        channelHealth.value[ch.id] = 'offline'
        persistHealthCache()
      } finally {
        inFlightChecks.delete(ch.id)
      }
    }
  }

  const workerCount = Math.min(concurrency, pending.length)
  const workers = Array.from({ length: workerCount }, () => worker())

  await Promise.allSettled(workers)

  if (inFlightChecks.size === 0) {
    isCheckingHealth.value = false
  }
}

export function useLiveTv() {
  const filteredChannels = computed(() => {
    let list = channels.value

    // 1. Category Filter
    if (activeCategory.value !== 'all') {
      list = list.filter((ch) => ch.categoryId === activeCategory.value)
    }

    // 2. Search Query Filter
    if (currentTvSearch.value.trim()) {
      const q = currentTvSearch.value.trim().toLowerCase()
      list = list.filter(
        (ch) =>
          ch.cleanName.toLowerCase().includes(q) ||
          ch.group.toLowerCase().includes(q) ||
          ch.resolution.toLowerCase().includes(q),
      )
    }

    // 3. Hide Offline Channels (unless all matching channels are marked offline)
    const onlineOrUnknown = list.filter((ch) => getChannelStatus(ch.id) !== 'offline')
    if (onlineOrUnknown.length > 0) {
      list = onlineOrUnknown
    }

    return list
  })

  const tvStats = computed(() => {
    const list = filteredChannels.value
    let onlineCount = 0
    let offlineCount = 0
    let checkingCount = 0

    for (const ch of list) {
      const s = channelHealth.value[ch.id]
      if (s === 'online') onlineCount++
      else if (s === 'offline') offlineCount++
      else if (s === 'checking') checkingCount++
    }

    return {
      total: list.length,
      onlineCount,
      offlineCount,
      checkingCount,
      totalChecked: onlineCount + offlineCount,
    }
  })

  async function selectRegion(regionId: TvRegionId, force = false): Promise<TvChannel[]> {
    const reqId = ++latestTvRequestId
    activeRegion.value = regionId
    activeCategory.value = 'all'
    currentTvSearch.value = ''

    if (force) {
      for (const key of Object.keys(channelHealth.value)) {
        if (key.startsWith(`tv-${regionId}-`)) {
          delete channelHealth.value[key]
        }
      }
      persistHealthCache()
    }

    // Return from in-memory cache
    if (!force && channelCache.has(regionId)) {
      const cached = channelCache.get(regionId)!
      channels.value = cached
      tvError.value = null
      isLoadingTv.value = false
      void runBackgroundHealthCheck(cached)
      return cached
    }

    // Check localStorage cache
    if (!force) {
      try {
        const stored = localStorage.getItem(`${CACHE_PREFIX}${regionId}`)
        if (stored) {
          const parsed = JSON.parse(stored) as TvChannel[]
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Sanitize any previously cached channels
            const sanitizedCached = parsed
              .map((ch) => {
                const cleanUrl = sanitizeStreamUrl(ch.url)
                return cleanUrl ? { ...ch, url: cleanUrl } : null
              })
              .filter((ch): ch is TvChannel => ch !== null)

            if (sanitizedCached.length > 0) {
              channelCache.set(regionId, sanitizedCached)
              channels.value = sanitizedCached
              tvError.value = null
              isLoadingTv.value = false
              void runBackgroundHealthCheck(sanitizedCached)
              return sanitizedCached
            }
          }
        }
      } catch {}
    }

    // Pre-seed with default Bangladeshi channels for instant offline display
    if (regionId === 'bd' && channels.value.length === 0) {
      channels.value = SEED_BD_CHANNELS
      void runBackgroundHealthCheck(SEED_BD_CHANNELS)
    }

    const region = TV_REGIONS.find((r) => r.id === regionId) ?? TV_REGIONS[0]
    isLoadingTv.value = true
    tvError.value = null

    try {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 9000)

      const response = await fetch(region.url, { signal: controller.signal })
      window.clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Failed to load channels: HTTP ${response.status}`)
      }

      const text = await response.text()
      if (reqId !== latestTvRequestId) return channels.value
      const parsed = parseM3u(text, regionId)

      if (parsed.length > 0) {
        channels.value = parsed
        channelCache.set(regionId, parsed)
        void runBackgroundHealthCheck(parsed)
        try {
          localStorage.setItem(`${CACHE_PREFIX}${regionId}`, JSON.stringify(parsed))
        } catch {}
      }

      return channels.value
    } catch (err) {
      if (reqId !== latestTvRequestId) return channels.value
      console.warn('[Pulse] Failed to fetch IPTV playlist:', regionId, err)
      if (channels.value.length === 0) {
        tvError.value = navigator.onLine
          ? 'Could not connect to live TV stream catalog. Please try again.'
          : 'You are offline. Connect to internet to stream Live TV.'
      }
      return channels.value
    } finally {
      if (reqId === latestTvRequestId) {
        isLoadingTv.value = false
      }
    }
  }

  function selectCategory(categoryId: TvCategoryId): void {
    activeCategory.value = categoryId
  }

  function playChannel(channel: TvChannel): void {
    activePlayingChannel.value = channel
  }

  function closePlayer(): void {
    activePlayingChannel.value = null
  }

  function playNextChannel(): void {
    const list = filteredChannels.value
    if (list.length === 0) return
    const curIdx = list.findIndex((c) => c.id === activePlayingChannel.value?.id)

    // Skip offline channels and find next live channel
    for (let step = 1; step <= list.length; step++) {
      const nextIdx = (curIdx + step) % list.length
      const candidate = list[nextIdx]
      if (getChannelStatus(candidate.id) !== 'offline' || step === list.length) {
        activePlayingChannel.value = candidate
        return
      }
    }
  }

  function playPrevChannel(): void {
    const list = filteredChannels.value
    if (list.length === 0) return
    const curIdx = list.findIndex((c) => c.id === activePlayingChannel.value?.id)

    // Skip offline channels and find prev live channel
    for (let step = 1; step <= list.length; step++) {
      const prevIdx = (curIdx - step + list.length) % list.length
      const candidate = list[prevIdx]
      if (getChannelStatus(candidate.id) !== 'offline' || step === list.length) {
        activePlayingChannel.value = candidate
        return
      }
    }
  }

  return {
    channels,
    filteredChannels,
    isLoadingTv,
    isCheckingHealth,
    tvError,
    activeRegion,
    activeCategory,
    currentTvSearch,
    activePlayingChannel,
    channelHealth,
    channelLatency,
    tvStats,
    regions: TV_REGIONS,
    categories: TV_CATEGORIES,
    selectRegion,
    selectCategory,
    playChannel,
    closePlayer,
    playNextChannel,
    playPrevChannel,
    getChannelStatus,
    setChannelStatus,
    getChannelLatency,
    setChannelLatency,
    getChannelNetworkStrength,
    checkChannelHealth,
    runBackgroundHealthCheck,
  }
}

