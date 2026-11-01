import { computed, ref } from 'vue'

export type TvRegionId = 'bd' | 'in' | 'pk' | 'global'

export interface TvRegion {
  id: TvRegionId
  label: string
  flag: string
  url: string
}

export const TV_REGIONS: TvRegion[] = [
  { id: 'bd', label: 'Bangladesh', flag: '🇧🇩', url: 'https://iptv-org.github.io/iptv/countries/bd.m3u' },
  { id: 'in', label: 'India', flag: '🇮🇳', url: 'https://iptv-org.github.io/iptv/countries/in.m3u' },
  { id: 'pk', label: 'Pakistan', flag: '🇵🇰', url: 'https://iptv-org.github.io/iptv/countries/pk.m3u' },
  { id: 'global', label: 'Global News', flag: '🌍', url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
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

const CACHE_PREFIX = 'pulse:tv_'

// Pre-seeded top Bangladeshi channels for instant offline-first playback
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
    url: 'http://tvsen5.aynascope.net/atnbangla/index.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-dbcnews',
    rawName: 'DBC News (480p)',
    cleanName: 'DBC News',
    resolution: '480P',
    logo: 'https://i.imgur.com/Qbt6q4z.png',
    group: 'News',
    categoryId: 'news',
    url: 'http://tvn3.chowdhury-shaheb.com/dbc/index.m3u8',
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
    id: 'tv-bd-atnmusic',
    rawName: 'ATN Music (360p)',
    cleanName: 'ATN Music',
    resolution: '360P',
    logo: 'https://www.jagobd.com/wp-content/uploads/2015/12/atnmusic.jpg',
    group: 'Music',
    categoryId: 'music',
    url: 'https://app.ncare.live/c3VydmVyX8RpbEU9Mi8xNy8yMDE0GIDU6RgzQ6NTAgdEoaeFzbF92YWxIZTO0U0ezN1IzMyfvcGVMZEJCTEFWeVN3PTOmdFsaWRtaW51aiPhnPTI/atnmusic.stream/playlist.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-maasranga',
    rawName: 'Maasranga TV (720p)',
    cleanName: 'Maasranga TV',
    resolution: '720P',
    logo: 'https://i.imgur.com/b2t7Rj2.png',
    group: 'Entertainment',
    categoryId: 'entertainment',
    url: 'http://tvsen5.aynascope.net/maasrangatv/index.m3u8',
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
    id: 'tv-bd-ekhon',
    rawName: 'Ekhon TV (1080p)',
    cleanName: 'Ekhon TV',
    resolution: '1080P',
    logo: 'https://i.imgur.com/tRrDh6z.png',
    group: 'Business',
    categoryId: 'news',
    url: 'https://tplay.live/out/bangladesh/ekhontv.index.m3u8',
    country: 'bd',
  },
  {
    id: 'tv-bd-madani',
    rawName: 'Madani Channel Bangla (1080p)',
    cleanName: 'Madani Channel Bangla',
    resolution: '1080P',
    logo: 'https://i.imgur.com/V2zBv5R.png',
    group: 'Religious',
    categoryId: 'religious',
    url: 'https://streaming.madanichannel.tv/static/stream/madanibangla/playlist.m3u8',
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
      const url = line
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
        url,
        country: region,
      })

      currentExtInf = null
    }
  }

  return channels
}

// Reactive state
const channels = ref<TvChannel[]>([])
const isLoadingTv = ref(false)
const tvError = ref<string | null>(null)
const activeRegion = ref<TvRegionId>('bd')
const activeCategory = ref<TvCategoryId>('all')
const currentTvSearch = ref('')
const activePlayingChannel = ref<TvChannel | null>(null)

const channelCache = new Map<TvRegionId, TvChannel[]>()

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

    return list
  })

  async function selectRegion(regionId: TvRegionId, force = false): Promise<TvChannel[]> {
    activeRegion.value = regionId
    activeCategory.value = 'all'
    currentTvSearch.value = ''

    // Return from in-memory cache
    if (!force && channelCache.has(regionId)) {
      const cached = channelCache.get(regionId)!
      channels.value = cached
      tvError.value = null
      return cached
    }

    // Check localStorage cache
    if (!force) {
      try {
        const stored = localStorage.getItem(`${CACHE_PREFIX}${regionId}`)
        if (stored) {
          const parsed = JSON.parse(stored) as TvChannel[]
          if (Array.isArray(parsed) && parsed.length > 0) {
            channelCache.set(regionId, parsed)
            channels.value = parsed
            tvError.value = null
            return parsed
          }
        }
      } catch {}
    }

    // Pre-seed with default Bangladeshi channels for instant offline display
    if (regionId === 'bd' && channels.value.length === 0) {
      channels.value = SEED_BD_CHANNELS
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
      const parsed = parseM3u(text, regionId)

      if (parsed.length > 0) {
        channels.value = parsed
        channelCache.set(regionId, parsed)
        try {
          localStorage.setItem(`${CACHE_PREFIX}${regionId}`, JSON.stringify(parsed))
        } catch {}
      }

      return channels.value
    } catch (err) {
      console.warn('[Pulse] Failed to fetch IPTV playlist:', regionId, err)
      if (channels.value.length === 0) {
        tvError.value = navigator.onLine
          ? 'Could not connect to live TV stream catalog. Please try again.'
          : 'You are offline. Connect to internet to stream Live TV.'
      }
      return channels.value
    } finally {
      isLoadingTv.value = false
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
    const nextIdx = (curIdx + 1) % list.length
    activePlayingChannel.value = list[nextIdx]
  }

  function playPrevChannel(): void {
    const list = filteredChannels.value
    if (list.length === 0) return
    const curIdx = list.findIndex((c) => c.id === activePlayingChannel.value?.id)
    const prevIdx = (curIdx - 1 + list.length) % list.length
    activePlayingChannel.value = list[prevIdx]
  }

  return {
    channels,
    filteredChannels,
    isLoadingTv,
    tvError,
    activeRegion,
    activeCategory,
    currentTvSearch,
    activePlayingChannel,
    regions: TV_REGIONS,
    categories: TV_CATEGORIES,
    selectRegion,
    selectCategory,
    playChannel,
    closePlayer,
    playNextChannel,
    playPrevChannel,
  }
}
