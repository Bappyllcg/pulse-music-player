<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  AudioLines,
  Globe,
  Heart,
  Import,
  Menu,
  Radio,
  RefreshCw,
  Search,
  Tv,
  X,
} from 'lucide-vue-next'

import AboutModal from './components/AboutModal.vue'
import LiveRadioSection from './components/LiveRadioSection.vue'
import LiveTvModal from './components/LiveTvModal.vue'
import LiveTvSection from './components/LiveTvSection.vue'
import MiniPlayerBar from './components/MiniPlayerBar.vue'
import NowPlayingView from './components/NowPlayingView.vue'
import RemoveConfirmModal from './components/RemoveConfirmModal.vue'
import SideMenuDrawer from './components/SideMenuDrawer.vue'
import SleepTimerDrawer from './components/SleepTimerDrawer.vue'
import TrackList from './components/TrackList.vue'
import UpNextDrawer from './components/UpNextDrawer.vue'

import { useAudioStorage } from './composables/useAudioStorage'
import { useLiveTv, type TvCategoryId, type TvRegionId } from './composables/useLiveTv'
import { useOnlineMusic } from './composables/useOnlineMusic'
import { usePlayer } from './composables/usePlayer'
import { useRadio, type RadioCategoryId, type RadioRegionId } from './composables/useRadio'
import { useSleepTimer } from './composables/useSleepTimer'
import type { PlayableTrack } from './types/music'

/* ------------------------------------------------------------------ */
/* Composables & State                                                */
/* ------------------------------------------------------------------ */

const storage = useAudioStorage()
const player = usePlayer()
const sleep = useSleepTimer()
const onlineMusic = useOnlineMusic()
const radio = useRadio()
const liveTv = useLiveTv()

const { tracks, localCount, isImporting } = storage
const {
  onlineTracks,
  isLoadingOnline,
  onlineError,
  activeGenreId,
  genres: onlineGenres,
  selectGenre,
  searchOnline,
  fetchOnlineTracks,
} = onlineMusic
const {
  stations: radioStations,
  filteredStations: filteredRadioStations,
  isLoadingRadio,
  radioError,
  activeRegion: activeRadioRegion,
  activeCategory: activeRadioCategory,
  currentRadioSearch,
  regions: radioRegions,
  categories: radioCategories,
  selectRegion: selectRadioRegion,
  selectCategory: selectRadioCategory,
  searchRadio,
  fetchRadioStations,
  getStationStatus: getRadioStationStatus,
  getStationLatency: getRadioStationLatency,
  getStationNetworkStrength: getRadioNetworkStrength,
  runBackgroundHealthCheck: runRadioHealthCheck,
} = radio
const {
  channels: tvChannels,
  filteredChannels: filteredTvChannels,
  isLoadingTv,
  tvError,
  activeRegion: activeTvRegion,
  activeCategory: activeTvCategory,
  currentTvSearch,
  activePlayingChannel,
  regions: tvRegions,
  categories: tvCategories,
  selectRegion: selectTvRegion,
  selectCategory: selectTvCategory,
  playChannel: playTvChannel,
  closePlayer: closeTvPlayer,
  playNextChannel: playNextTvChannel,
  playPrevChannel: playPrevTvChannel,
  getChannelStatus: getTvChannelStatus,
  getChannelLatency: getTvChannelLatency,
  getChannelNetworkStrength: getTvNetworkStrength,
  runBackgroundHealthCheck,
} = liveTv
const {
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  isShuffle,
  repeatMode,
  playbackError,
} = player

/** Active main view: 'library' | 'player' */
const activeTab = ref<'library' | 'player'>('library')

/** Filter tabs in library: 'all' | 'liked' | 'recent' | 'online' | 'radio' | 'tv' */
const selectedFilter = ref<'all' | 'liked' | 'recent' | 'online' | 'radio' | 'tv'>('all')

/** Search */
const showSearch = ref(false)
const searchQuery = ref('')
let searchDebounceTimer: number | undefined

watch(searchQuery, (newQuery) => {
  if (selectedFilter.value === 'online') {
    window.clearTimeout(searchDebounceTimer)
    searchDebounceTimer = window.setTimeout(() => {
      void searchOnline(newQuery)
    }, 350)
  } else if (selectedFilter.value === 'radio') {
    currentRadioSearch.value = newQuery
    window.clearTimeout(searchDebounceTimer)
    searchDebounceTimer = window.setTimeout(() => {
      void searchRadio(newQuery)
    }, 350)
  } else if (selectedFilter.value === 'tv') {
    currentTvSearch.value = newQuery
  }
})

async function onSelectGenre(genreId: string): Promise<void> {
  searchQuery.value = ''
  await selectGenre(genreId)
}

async function onSelectRadioRegion(regionId: RadioRegionId): Promise<void> {
  searchQuery.value = ''
  await selectRadioRegion(regionId)
}

function onSelectRadioCategory(categoryId: RadioCategoryId): void {
  selectRadioCategory(categoryId)
}

async function selectOnlineFilter(): Promise<void> {
  selectedFilter.value = 'online'
  if (searchQuery.value.trim()) {
    await searchOnline(searchQuery.value.trim())
  } else if (onlineTracks.value.length === 0) {
    await selectGenre(activeGenreId.value)
  }
}

async function selectRadioFilter(): Promise<void> {
  selectedFilter.value = 'radio'
  if (radioStations.value.length === 0) {
    await selectRadioRegion('bd')
  } else {
    void runRadioHealthCheck(filteredRadioStations.value)
  }
}

watch([activeRadioRegion, activeRadioCategory], () => {
  if (selectedFilter.value === 'radio' && filteredRadioStations.value.length > 0) {
    void runRadioHealthCheck(filteredRadioStations.value)
  }
})

async function selectTvFilter(): Promise<void> {
  selectedFilter.value = 'tv'
  if (tvChannels.value.length === 0) {
    await selectTvRegion('bd')
  } else {
    void runBackgroundHealthCheck(filteredTvChannels.value)
  }
}

watch([activeTvRegion, activeTvCategory], () => {
  if (selectedFilter.value === 'tv' && filteredTvChannels.value.length > 0) {
    void runBackgroundHealthCheck(filteredTvChannels.value)
  }
})

async function onSelectTvRegion(regionId: TvRegionId): Promise<void> {
  searchQuery.value = ''
  await selectTvRegion(regionId)
}

function onSelectTvCategory(categoryId: TvCategoryId): void {
  selectTvCategory(categoryId)
}

function onPlayTvChannel(channel: typeof liveTv.channels.value[0]): void {
  if (player.isPlaying.value) {
    player.pause()
  }
  playTvChannel(channel)
}

const activeGenreLabel = computed(() => {
  if (searchQuery.value.trim()) {
    return `Results for “${searchQuery.value.trim()}”`
  }
  const found = onlineGenres.find((g) => g.id === activeGenreId.value)
  return found ? `Online ${found.label}` : 'Online Music'
})

const activeRadioLabel = computed(() => {
  if (searchQuery.value.trim()) {
    return `Radio: “${searchQuery.value.trim()}”`
  }
  const reg = radioRegions.find((r) => r.id === activeRadioRegion.value)
  const cat = radioCategories.find((c) => c.id === activeRadioCategory.value)
  const prefix = reg ? `${reg.flag} ${reg.label}` : 'Live Radio'
  if (activeRadioCategory.value === 'all') {
    return `${prefix} Radio`
  }
  return `${prefix} • ${cat?.label ?? ''}`
})

const activeTvLabel = computed(() => {
  if (searchQuery.value.trim()) {
    return `TV: “${searchQuery.value.trim()}”`
  }
  const reg = tvRegions.find((r) => r.id === activeTvRegion.value)
  const cat = tvCategories.find((c) => c.id === activeTvCategory.value)
  const prefix = reg ? `${reg.flag} ${reg.label}` : 'Live TV'
  if (activeTvCategory.value === 'all') {
    return `${prefix} TV`
  }
  return `${prefix} • ${cat?.label ?? ''}`
})

/** Liked track IDs stored in localStorage */
const likedIds = ref<Set<string>>(new Set())

function loadLiked(): void {
  try {
    const raw = localStorage.getItem('pulse:liked')
    if (raw) likedIds.value = new Set(JSON.parse(raw))
  } catch {
    /* fallback to empty */
  }
}

function toggleLike(id: string): void {
  if (likedIds.value.has(id)) {
    likedIds.value.delete(id)
  } else {
    likedIds.value.add(id)
  }
  try {
    localStorage.setItem('pulse:liked', JSON.stringify(Array.from(likedIds.value)))
  } catch {
    /* storage quota/disabled */
  }
}

const fileInput = ref<HTMLInputElement | null>(null)
const menuOpen = ref(false)
const aboutOpen = ref(false)
const playlistOpen = ref(false)
const sleepOpen = ref(false)
const notice = ref<string | null>(null)
let noticeTimer: number | undefined

/* ------------------------------------------------------------------ */
/* Filtered Tracks & Active Queue Synchronization                     */
/* ------------------------------------------------------------------ */

const filteredTracks = computed(() => {
  if (selectedFilter.value === 'online') {
    return onlineTracks.value
  }
  if (selectedFilter.value === 'radio') {
    return filteredRadioStations.value
  }

  let list = tracks.value

  if (selectedFilter.value === 'liked') {
    const allAvailable = [...tracks.value, ...onlineTracks.value, ...radioStations.value]
    list = allAvailable.filter((t) => likedIds.value.has(t.id))
  } else if (selectedFilter.value === 'recent') {
    list = [...tracks.value].sort((a, b) => b.createdAt - a.createdAt)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(
      (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q),
    )
  }

  return list
})

/** Progress percentage for the mini player progress bar */
const progressPercent = computed(() => {
  if (!duration.value || duration.value <= 0) return 0
  return Math.min(100, Math.max(0, (currentTime.value / duration.value) * 100))
})

/** Next and previous tracks previewing exact upcoming and historical tracks */
const prevTrack = player.prevTrackPreview
const nextTrack = player.nextTrackPreview

/* ------------------------------------------------------------------ */
/* Helpers & Handlers                                                 */
/* ------------------------------------------------------------------ */

function formatTrackDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--'
  const whole = Math.floor(seconds)
  const mins = Math.floor(whole / 60)
  const secs = whole % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function showNotice(message: string): void {
  notice.value = message
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => (notice.value = null), 4500)
}

function openFilePicker(): void {
  fileInput.value?.click()
}

async function onFilesSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  input.value = ''
  if (files.length === 0) return

  try {
    const result = await storage.addFiles(files)
    const parts: string[] = []
    if (result.added > 0) parts.push(`Imported ${result.added} ${result.added === 1 ? 'track' : 'tracks'}`)
    if (result.duplicates > 0) {
      parts.push(`Skipped ${result.duplicates} duplicate ${result.duplicates === 1 ? 'song' : 'songs'}`)
    }
    if (result.skipped.length > 0) {
      parts.push(`Skipped ${result.skipped.length} unsupported ${result.skipped.length === 1 ? 'file' : 'files'}`)
    }
    showNotice(parts.length > 0 ? parts.join(' · ') : 'No files imported')
    if (result.added > 0 && navigator.storage?.persist) {
      void navigator.storage.persist()
    }
  } catch (error) {
    console.error('[Pulse] Import failed:', error)
    showNotice('Import failed. Check available storage and try again.')
  }
}

const trackToRemove = ref<{ id: string; title: string } | null>(null)

function promptRemoveTrack(id: string, title: string): void {
  trackToRemove.value = { id, title }
}

async function confirmRemoveTrack(): Promise<void> {
  if (!trackToRemove.value) return
  const { id, title } = trackToRemove.value
  trackToRemove.value = null
  try {
    await storage.deleteTrack(id)
    likedIds.value.delete(id)
    showNotice(`Removed “${title}” from playlist`)
  } catch (error) {
    console.error('[Pulse] Remove failed:', error)
    showNotice('Could not remove this track.')
  }
}

function cancelRemoveTrack(): void {
  trackToRemove.value = null
}

/** Tapping a track row in library opens Now Playing without pausing already-playing tracks */
function playTrackAndShow(track: PlayableTrack): void {
  if (player.currentTrack.value?.id === track.id) {
    if (!player.isPlaying.value) {
      player.play()
    }
  } else {
    player.setQueue(filteredTracks.value)
    player.selectTrack(track)
  }
  activeTab.value = 'player'
}

/** Circular play/pause button explicitly toggles play/pause */
function toggleTrackPlayback(track: PlayableTrack): void {
  if (player.currentTrack.value?.id !== track.id) {
    player.setQueue(filteredTracks.value)
  }
  player.selectTrack(track)
}

/** Up Next drawer track row click */
function selectQueueTrack(track: PlayableTrack): void {
  if (player.currentTrack.value?.id === track.id) {
    if (!player.isPlaying.value) player.play()
  } else {
    player.selectTrack(track)
  }
  playlistOpen.value = false
  activeTab.value = 'player'
}

/* ------------------------------------------------------------------ */
/* Sleep Timer & Modal Controls                                       */
/* ------------------------------------------------------------------ */

const sleepLabel = computed(() => {
  if (sleep.selection.value === 'track') return 'End of track'
  if (sleep.selection.value !== null) return formatTrackDuration(sleep.remainingSeconds.value)
  return 'Sleep'
})

function chooseSleepMinutes(minutes: number): void {
  sleep.startMinutes(minutes)
  sleepOpen.value = false
  showNotice(`Sleep timer set for ${minutes} min`)
}

function chooseSleepEndOfTrack(): void {
  sleep.startEndOfTrack()
  sleepOpen.value = false
  showNotice('Playback will stop when this track ends')
}

function turnOffSleep(): void {
  sleep.cancel()
  sleepOpen.value = false
  showNotice('Sleep timer turned off')
}

watch(sleep.firedCount, () => showNotice('Sleep timer ended. Playback paused.'))

function closeSheets(): void {
  menuOpen.value = false
  aboutOpen.value = false
  playlistOpen.value = false
  sleepOpen.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    if (menuOpen.value) {
      menuOpen.value = false
      return
    }
    if (trackToRemove.value) {
      cancelRemoveTrack()
      return
    }
    closeSheets()
  }
}

// When last track is removed, exit back to library empty state
watch(
  () => tracks.value.length,
  (count) => {
    if (count === 0) {
      menuOpen.value = false
      playlistOpen.value = false
      sleepOpen.value = false
      trackToRemove.value = null
      activeTab.value = 'library'
    }
  },
)

onMounted(async () => {
  loadLiked()
  window.addEventListener('keydown', onKeydown)
  await storage.getAllTracks()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.clearTimeout(noticeTimer)
})
</script>

<template>
  <div class="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#09090b] text-zinc-100 antialiased select-none">
    <!-- Hidden native file picker -->
    <input
      ref="fileInput"
      type="file"
      accept="audio/*,.mp3,.m4a,.aac,.wav,.wave,.ogg,.oga,.flac"
      multiple
      class="hidden"
      @change="onFilesSelected"
    />

    <!-- Notice Toast -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="-translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-4 opacity-0"
    >
      <div
        v-if="notice"
        class="fixed top-4 inset-x-4 z-50 mx-auto max-w-sm rounded-2xl bg-zinc-900/95 px-4 py-3 text-center text-xs font-semibold text-zinc-200 shadow-2xl ring-1 ring-white/10 backdrop-blur-md"
        role="status"
      >
        {{ notice }}
      </div>
    </transition>

    <!-- Error Banner -->
    <div
      v-if="playbackError"
      class="fixed top-16 inset-x-4 z-40 mx-auto max-w-sm rounded-2xl bg-red-950/90 px-4 py-3 text-center text-xs font-semibold text-red-200 shadow-xl ring-1 ring-red-500/30 backdrop-blur-md"
    >
      {{ playbackError }}
    </div>

    <!-- ============================================================== -->
    <!-- VIEW 1: LIBRARY / DISCOVERY SCREEN                             -->
    <!-- ============================================================== -->
    <div
      v-show="activeTab === 'library'"
      class="flex h-full flex-col overflow-hidden"
    >
      <!-- Scrollable content area -->
      <div
        class="flex-1 overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]"
        :class="selectedFilter === 'tv' ? 'pb-10' : 'pb-32'"
      >
        <!-- Top App Bar with Branding and Actions -->
        <header class="mb-5 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 shadow-lg shadow-indigo-600/25 ring-1 ring-white/20">
              <AudioLines :size="22" class="text-white" />
            </div>
            <div>
              <h1 class="text-xl font-bold tracking-tight text-white">Pulse</h1>
              <p class="text-xs text-zinc-400">
                {{ localCount }} {{ localCount === 1 ? 'track' : 'tracks' }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Search toggle -->
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 ring-1 ring-white/10 backdrop-blur-md transition active:scale-90 hover:text-white"
              aria-label="Toggle search"
              title="Search"
              @click="showSearch = !showSearch"
            >
              <Search :size="18" />
            </button>

            <!-- Import button (Icon-only with Import icon) -->
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/20 transition active:scale-90 hover:bg-indigo-500 disabled:opacity-50"
              :disabled="isImporting"
              aria-label="Import audio files"
              title="Import audio files"
              @click="openFilePicker"
            >
              <RefreshCw v-if="isImporting" :size="17" class="animate-spin" />
              <Import v-else :size="18" />
            </button>

            <!-- Hamburger menu button -->
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 ring-1 ring-white/10 backdrop-blur-md transition active:scale-90 hover:text-white"
              aria-label="Open menu"
              title="Menu"
              @click="menuOpen = true"
            >
              <Menu :size="19" />
            </button>
          </div>
        </header>

        <!-- Search input (collapsible) -->
        <transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="-translate-y-2 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="-translate-y-2 opacity-0"
        >
          <div v-if="showSearch" class="mb-4">
            <div class="relative flex items-center">
              <Search :size="16" class="pointer-events-none absolute left-3.5 text-zinc-400" />
              <input
                v-model="searchQuery"
                type="search"
                placeholder="Search tracks, radio, TV..."
                class="w-full rounded-2xl bg-zinc-900/90 py-2.5 pr-10 pl-10 text-xs font-medium text-white placeholder-zinc-500 ring-1 ring-white/10 backdrop-blur-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                v-if="searchQuery"
                type="button"
                class="absolute right-3 text-zinc-400 hover:text-white"
                @click="searchQuery = ''"
              >
                <X :size="14" />
              </button>
            </div>
          </div>
        </transition>

        <!-- Filter Pills Bar -->
        <div class="mb-5 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            class="flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95"
            :class="
              selectedFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
                : 'bg-zinc-900/80 text-zinc-400 ring-1 ring-white/10 hover:text-white'
            "
            @click="selectedFilter = 'all'"
          >
            <span>All</span>
          </button>
          <button
            type="button"
            class="flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95"
            :class="
              selectedFilter === 'liked'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
                : 'bg-zinc-900/80 text-zinc-400 ring-1 ring-white/10 hover:text-white'
            "
            @click="selectedFilter = 'liked'"
          >
            <Heart :size="13" :fill="selectedFilter === 'liked' ? 'currentColor' : 'none'" />
            <span>Liked</span>
          </button>
          <button
            type="button"
            class="flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95"
            :class="
              selectedFilter === 'recent'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
                : 'bg-zinc-900/80 text-zinc-400 ring-1 ring-white/10 hover:text-white'
            "
            @click="selectedFilter = 'recent'"
          >
            <span>Recent</span>
          </button>
          <button
            type="button"
            class="flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95"
            :class="
              selectedFilter === 'online'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
                : 'bg-zinc-900/80 text-zinc-400 ring-1 ring-white/10 hover:text-white'
            "
            @click="selectOnlineFilter"
          >
            <Globe :size="13" />
            <span>Online Music</span>
          </button>
          <button
            type="button"
            class="flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95"
            :class="
              selectedFilter === 'radio'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-1 ring-white/20'
                : 'bg-zinc-900/80 text-zinc-400 ring-1 ring-white/10 hover:text-white'
            "
            @click="selectRadioFilter"
          >
            <Radio :size="13" />
            <span>Live Radio</span>
          </button>
          <button
            type="button"
            class="flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95"
            :class="
              selectedFilter === 'tv'
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-md shadow-rose-600/30 ring-1 ring-white/20'
                : 'bg-zinc-900/80 text-zinc-400 ring-1 ring-white/10 hover:text-white'
            "
            @click="selectTvFilter"
          >
            <Tv :size="13" />
            <span>Live TV</span>
          </button>
        </div>

        <!-- Online Music Genre Filtration Sub-Bar -->
        <div
          v-if="selectedFilter === 'online'"
          class="mb-5 -mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1"
        >
          <button
            v-for="genre in onlineGenres"
            :key="genre.id"
            type="button"
            class="flex shrink-0 whitespace-nowrap items-center rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95"
            :class="
              activeGenreId === genre.id && !searchQuery.trim()
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
                : 'bg-zinc-900/80 text-zinc-400 ring-1 ring-white/10 hover:text-white hover:bg-zinc-800'
            "
            @click="onSelectGenre(genre.id)"
          >
            <span>{{ genre.label }}</span>
          </button>
        </div>

        <!-- ============================================================== -->
        <!-- CONTENT VIEWS BY FILTER                                        -->
        <!-- ============================================================== -->

        <!-- 1. Live TV View -->
        <LiveTvSection
          v-if="selectedFilter === 'tv'"
          :regions="tvRegions"
          :categories="tvCategories"
          :active-region="activeTvRegion"
          :active-category="activeTvCategory"
          :channels="filteredTvChannels"
          :active-playing-channel="activePlayingChannel"
          :is-loading="isLoadingTv"
          :error="tvError"
          :active-label="activeTvLabel"
          :get-channel-status="getTvChannelStatus"
          :get-channel-latency="getTvChannelLatency"
          :get-network-strength="getTvNetworkStrength"
          @select-region="onSelectTvRegion"
          @select-category="onSelectTvCategory"
          @refresh="selectTvRegion(activeTvRegion, true)"
          @play-channel="onPlayTvChannel"
        />

        <!-- 2. Live Radio View -->
        <LiveRadioSection
          v-else-if="selectedFilter === 'radio'"
          :regions="radioRegions"
          :categories="radioCategories"
          :active-region="activeRadioRegion"
          :active-category="activeRadioCategory"
          :stations="filteredRadioStations"
          :current-track="currentTrack"
          :is-playing="isPlaying"
          :is-loading="isLoadingRadio"
          :error="radioError"
          :active-label="activeRadioLabel"
          :liked-ids="likedIds"
          :get-station-status="getRadioStationStatus"
          :get-station-latency="getRadioStationLatency"
          :get-network-strength="getRadioNetworkStrength"
          @select-region="onSelectRadioRegion"
          @select-category="onSelectRadioCategory"
          @refresh="fetchRadioStations(true)"
          @play-station="playTrackAndShow"
          @toggle-playback="toggleTrackPlayback"
          @toggle-like="toggleLike"
        />

        <!-- 3. Music Library & Online Tracks View -->
        <div v-else class="space-y-4">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-lg font-bold text-white">
              {{
                selectedFilter === 'online'
                  ? activeGenreLabel
                  : selectedFilter === 'liked'
                    ? 'Liked'
                    : selectedFilter === 'recent'
                      ? 'Recent Tracks'
                      : 'Your library'
              }}
            </h2>
            <span class="text-xs font-medium text-zinc-500">
              {{ filteredTracks.length }} {{ filteredTracks.length === 1 ? (selectedFilter === 'online' ? 'track' : 'song') : (selectedFilter === 'online' ? 'tracks' : 'songs') }}
            </span>
          </div>

          <TrackList
            :tracks="filteredTracks"
            :current-track="currentTrack"
            :is-playing="isPlaying"
            :liked-ids="likedIds"
            :is-importing="isImporting"
            :selected-filter="selectedFilter"
            :search-query="searchQuery"
            :is-loading-online="isLoadingOnline"
            :online-error="onlineError"
            @play-track="playTrackAndShow"
            @toggle-playback="toggleTrackPlayback"
            @toggle-like="toggleLike"
            @remove-track="promptRemoveTrack"
            @open-file-picker="openFilePicker"
            @select-online="selectOnlineFilter"
            @clear-search="searchQuery = ''"
            @retry-online="fetchOnlineTracks(true)"
          />
        </div>
      </div>

      <!-- Bottom Mini-Player Bar -->
      <MiniPlayerBar
        v-if="currentTrack && selectedFilter !== 'tv' && !activePlayingChannel"
        :current-track="currentTrack"
        :is-playing="isPlaying"
        :progress-percent="progressPercent"
        :is-liked="likedIds.has(currentTrack.id)"
        @toggle-play="player.togglePlay()"
        @toggle-like="toggleLike"
        @expand="activeTab = 'player'"
      />
    </div>

    <!-- ============================================================== -->
    <!-- VIEW 2: NOW PLAYING FULLSCREEN                                 -->
    <!-- ============================================================== -->
    <NowPlayingView
      v-show="activeTab === 'player'"
      :current-track="currentTrack"
      :prev-track="prevTrack"
      :next-track="nextTrack"
      :is-playing="isPlaying"
      :current-time="currentTime"
      :duration="duration"
      :is-shuffle="isShuffle"
      :repeat-mode="repeatMode"
      :is-liked="currentTrack ? likedIds.has(currentTrack.id) : false"
      :sleep-label="sleepLabel"
      :is-sleep-active="sleep.isActive.value"
      :active-tab="activeTab"
      @back="activeTab = 'library'"
      @open-queue="playlistOpen = true"
      @open-sleep="sleepOpen = true"
      @toggle-play="player.togglePlay()"
      @toggle-shuffle="player.toggleShuffle()"
      @cycle-repeat="player.cycleRepeat()"
      @previous="player.previous()"
      @next="player.next()"
      @seek="player.seek"
      @seek-by="player.seekBy"
      @toggle-like="toggleLike"
    />

    <!-- ============================================================== -->
    <!-- DRAWERS & MODALS                                               -->
    <!-- ============================================================== -->

    <!-- Right Side Push Menu -->
    <SideMenuDrawer
      v-model:open="menuOpen"
      :active-tab="activeTab"
      :selected-filter="selectedFilter"
      :local-count="localCount"
      @close="menuOpen = false"
      @navigate="(f) => { selectedFilter = f; activeTab = 'library' }"
      @open-about="aboutOpen = true"
    />

    <!-- Dedicated About Pulse Modal -->
    <AboutModal
      v-model:open="aboutOpen"
      :local-count="localCount"
      @close="aboutOpen = false"
    />

    <!-- Up Next Queue Sheet -->
    <UpNextDrawer
      v-model:open="playlistOpen"
      :queue="player.queue.value"
      :current-track="currentTrack"
      @close="playlistOpen = false"
      @select-track="selectQueueTrack"
      @remove-track="promptRemoveTrack"
      @import-audio="openFilePicker"
      @discover-online="() => { playlistOpen = false; selectOnlineFilter(); activeTab = 'library' }"
    />

    <!-- Sleep Timer Sheet -->
    <SleepTimerDrawer
      v-model:open="sleepOpen"
      :active-selection="sleep.selection.value"
      :is-active="sleep.isActive.value"
      @close="sleepOpen = false"
      @choose-minutes="chooseSleepMinutes"
      @choose-end-of-track="chooseSleepEndOfTrack"
      @turn-off="turnOffSleep"
    />

    <!-- Custom Remove Confirmation Modal -->
    <RemoveConfirmModal
      :track="trackToRemove"
      @confirm="confirmRemoveTrack"
      @cancel="cancelRemoveTrack"
    />

    <!-- Live TV Cinema Player Modal -->
    <LiveTvModal
      v-if="activePlayingChannel"
      :channel="activePlayingChannel"
      :channels="filteredTvChannels"
      @close="closeTvPlayer"
      @select-channel="onPlayTvChannel"
      @next="playNextTvChannel"
      @prev="playPrevTvChannel"
    />
  </div>
</template>
