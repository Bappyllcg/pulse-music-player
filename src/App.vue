<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  AudioLines,
  FolderPlus,
  Menu,
  Moon,
  RefreshCw,
} from 'lucide-vue-next'

import AboutModal from './components/AboutModal.vue'
import BottomNavDock, { type MainNavTab } from './components/BottomNavDock.vue'
import DiscoverSection from './components/DiscoverSection.vue'
import LiveRadioSection from './components/LiveRadioSection.vue'
import LiveTvModal from './components/LiveTvModal.vue'
import LiveTvSection from './components/LiveTvSection.vue'
import MiniPlayerBar from './components/MiniPlayerBar.vue'
import NowPlayingView from './components/NowPlayingView.vue'
import RemoveConfirmModal from './components/RemoveConfirmModal.vue'
import SettingsModal from './components/SettingsModal.vue'
import SideMenuDrawer from './components/SideMenuDrawer.vue'
import SleepTimerDrawer from './components/SleepTimerDrawer.vue'
import TrackList, { type LibraryFilter } from './components/TrackList.vue'
import UpNextDrawer from './components/UpNextDrawer.vue'

import { useAudioStorage } from './composables/useAudioStorage'
import { useLiveTv, type TvCategoryId, type TvRegionId } from './composables/useLiveTv'
import { useOnlineMusic } from './composables/useOnlineMusic'
import { usePlayer } from './composables/usePlayer'
import { useRadio, type RadioCategoryId, type RadioRegionId } from './composables/useRadio'
import { useSleepTimer } from './composables/useSleepTimer'
import { useTheme } from './composables/useTheme'
import type { PlayableTrack } from './types/music'

/* ------------------------------------------------------------------ */
/* Composables & State                                                */
/* ------------------------------------------------------------------ */

const themeManager = useTheme()
themeManager.initTheme()

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
  volume,
  volumeSupported,
  playbackError,
  setVolume,
} = player

/** Active main navigation pillar: 'library' | 'discover' | 'radio' | 'tv' */
const activeMainTab = ref<MainNavTab>('library')

/** Fullscreen overlay or library view: 'library' | 'player' */
const activeTab = ref<'library' | 'player'>('library')

/** Filter sub-tab inside library: 'all' | 'liked' | 'recent' */
const selectedLibraryFilter = ref<LibraryFilter>('all')

/** Search queries per section */
const librarySearch = ref('')
const discoverSearch = ref('')
let discoverDebounceTimer: number | undefined
let radioDebounceTimer: number | undefined

watch(discoverSearch, (newQuery) => {
  window.clearTimeout(discoverDebounceTimer)
  discoverDebounceTimer = window.setTimeout(() => {
    void searchOnline(newQuery)
  }, 350)
})

watch(currentRadioSearch, (newQuery) => {
  window.clearTimeout(radioDebounceTimer)
  radioDebounceTimer = window.setTimeout(() => {
    void searchRadio(newQuery)
  }, 350)
})

/* ------------------------------------------------------------------ */
/* Navigation Handlers                                                */
/* ------------------------------------------------------------------ */

function switchMainTab(tab: MainNavTab): void {
  activeMainTab.value = tab
  if (tab === 'discover' && onlineTracks.value.length === 0) {
    void selectGenre(activeGenreId.value)
  } else if (tab === 'radio') {
    if (radioStations.value.length === 0) {
      void selectRadioRegion('bd')
    } else {
      void runRadioHealthCheck(filteredRadioStations.value)
    }
  } else if (tab === 'tv') {
    if (tvChannels.value.length === 0) {
      void selectTvRegion('bd')
    } else {
      void runBackgroundHealthCheck(filteredTvChannels.value)
    }
  }
}

watch([activeRadioRegion, activeRadioCategory], () => {
  if (activeMainTab.value === 'radio' && filteredRadioStations.value.length > 0) {
    void runRadioHealthCheck(filteredRadioStations.value)
  }
})

watch([activeTvRegion, activeTvCategory], () => {
  if (activeMainTab.value === 'tv' && filteredTvChannels.value.length > 0) {
    void runBackgroundHealthCheck(filteredTvChannels.value)
  }
})

async function onSelectGenre(genreId: string): Promise<void> {
  discoverSearch.value = ''
  await selectGenre(genreId)
}

async function onSelectRadioRegion(regionId: RadioRegionId): Promise<void> {
  await selectRadioRegion(regionId)
}

function onSelectRadioCategory(categoryId: RadioCategoryId): void {
  selectRadioCategory(categoryId)
}

async function onSelectTvRegion(regionId: TvRegionId): Promise<void> {
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

const activeRadioLabel = computed(() => {
  if (currentRadioSearch.value.trim()) {
    return `Radio: “${currentRadioSearch.value.trim()}”`
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
  if (currentTvSearch.value.trim()) {
    return `TV: “${currentTvSearch.value.trim()}”`
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
const settingsOpen = ref(false)
const playlistOpen = ref(false)
const sleepOpen = ref(false)
const notice = ref<string | null>(null)
let noticeTimer: number | undefined

/* ------------------------------------------------------------------ */
/* Library Tracks Filtration & Queue Sync                             */
/* ------------------------------------------------------------------ */

const filteredLibraryTracks = computed(() => {
  let list = tracks.value

  if (selectedLibraryFilter.value === 'liked') {
    const allAvailable = [...tracks.value, ...onlineTracks.value, ...radioStations.value]
    list = allAvailable.filter((t) => likedIds.value.has(t.id))
  } else if (selectedLibraryFilter.value === 'recent') {
    list = [...tracks.value].sort((a, b) => b.createdAt - a.createdAt)
  }

  if (librarySearch.value.trim()) {
    const q = librarySearch.value.toLowerCase().trim()
    list = list.filter(
      (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q),
    )
  }

  return list
})

/** Mini player progress percentage */
const progressPercent = computed(() => {
  if (!duration.value || duration.value <= 0) return 0
  return Math.min(100, Math.max(0, (currentTime.value / duration.value) * 100))
})

const prevTrack = player.prevTrackPreview
const nextTrack = player.nextTrackPreview

/* ------------------------------------------------------------------ */
/* Handlers & Helpers                                                 */
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
    showNotice(`Removed “${title}” from library`)
  } catch (error) {
    console.error('[Pulse] Remove failed:', error)
    showNotice('Could not remove this track.')
  }
}

function cancelRemoveTrack(): void {
  trackToRemove.value = null
}

function playTrackAndShow(track: PlayableTrack): void {
  if (player.currentTrack.value?.id === track.id) {
    if (!player.isPlaying.value) {
      player.play()
    }
  } else {
    if (track.id.startsWith('jamendo')) {
      player.setQueue(onlineTracks.value)
    } else if (track.id.startsWith('radio') || track.duration <= 0) {
      player.setQueue(filteredRadioStations.value)
    } else {
      player.setQueue(filteredLibraryTracks.value)
    }
    player.selectTrack(track)
  }
  activeTab.value = 'player'
}

function toggleTrackPlayback(track: PlayableTrack): void {
  if (player.currentTrack.value?.id !== track.id) {
    if (track.id.startsWith('jamendo')) {
      player.setQueue(onlineTracks.value)
    } else if (track.id.startsWith('radio') || track.duration <= 0) {
      player.setQueue(filteredRadioStations.value)
    } else {
      player.setQueue(filteredLibraryTracks.value)
    }
  }
  player.selectTrack(track)
}

function shuffleAllLibrary(): void {
  if (tracks.value.length === 0) return
  player.setQueue(tracks.value)
  if (!player.isShuffle.value) {
    player.toggleShuffle()
  }
  const randomIndex = Math.floor(Math.random() * tracks.value.length)
  player.selectTrack(tracks.value[randomIndex])
  activeTab.value = 'player'
  showNotice('Shuffling all library tracks')
}

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
/* Sleep Timer Controls                                               */
/* ------------------------------------------------------------------ */

const sleepLabel = computed(() => {
  if (sleep.selection.value === 'track') return 'End of track'
  if (sleep.selection.value !== null) return formatTrackDuration(sleep.remainingSeconds.value)
  return 'Sleep'
})

const sleepRemainingFormatted = computed(() => {
  if (sleep.selection.value === 'track') return 'end of track'
  if (sleep.remainingSeconds.value > 0) return formatTrackDuration(sleep.remainingSeconds.value)
  return undefined
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
  settingsOpen.value = false
  playlistOpen.value = false
  sleepOpen.value = false
}

function onKeydown(event: KeyboardEvent): void {
  // Ignore key shortcuts if focused on text input
  const activeElement = document.activeElement
  const isInput = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')

  if (event.key === 'Escape') {
    if (activeTab.value === 'player') {
      activeTab.value = 'library'
      return
    }
    if (menuOpen.value || aboutOpen.value || settingsOpen.value || playlistOpen.value || sleepOpen.value) {
      closeSheets()
      return
    }
    if (trackToRemove.value) {
      cancelRemoveTrack()
      return
    }
  }

  if (!isInput && event.code === 'Space') {
    event.preventDefault()
    player.togglePlay()
  }
}

onMounted(async () => {
  loadLiked()
  window.addEventListener('keydown', onKeydown)
  await storage.getAllTracks()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.clearTimeout(noticeTimer)
  window.clearTimeout(discoverDebounceTimer)
  window.clearTimeout(radioDebounceTimer)
})
</script>

<template>
  <div class="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-50 dark:bg-[#08080c] text-slate-900 dark:text-zinc-100 app-viewport antialiased select-none font-sans">
    <!-- Hidden native file picker -->
    <input
      ref="fileInput"
      type="file"
      accept="audio/*,.mp3,.m4a,.aac,.wav,.wave,.ogg,.oga,.flac"
      multiple
      class="hidden"
      @change="onFilesSelected"
    />

    <!-- Notice Toast Notification -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="-translate-y-4 opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100 scale-100"
      leave-to-class="-translate-y-4 opacity-0 scale-95"
    >
      <div
        v-if="notice"
        class="fixed top-4 inset-x-4 z-50 mx-auto max-w-sm rounded-2xl border px-4 py-3 text-center text-xs font-semibold shadow-2xl backdrop-blur-xl
               bg-white/95 text-slate-900 border-slate-200/90 shadow-slate-200/50
               dark:bg-zinc-900/95 dark:text-zinc-100 dark:border-white/15"
        role="status"
      >
        {{ notice }}
      </div>
    </transition>

    <!-- Error Banner -->
    <div
      v-if="playbackError"
      class="fixed top-16 inset-x-4 z-40 mx-auto max-w-sm rounded-2xl bg-rose-950/90 text-rose-200 ring-1 ring-rose-500/30 backdrop-blur-xl px-4 py-3 text-center text-xs font-semibold shadow-xl"
    >
      {{ playbackError }}
    </div>

    <!-- ============================================================== -->
    <!-- VIEW 1: MAIN NAVIGATION VIEWS (Library, Discover, Radio, TV)   -->
    <!-- ============================================================== -->
    <div
      v-show="activeTab === 'library'"
      class="flex h-full flex-col overflow-hidden"
    >
      <!-- Top App Bar with Branding and Status -->
      <header class="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 shrink-0">
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 shadow-lg shadow-indigo-600/30 ring-1 ring-white/20">
            <AudioLines :size="22" class="text-white" />
          </div>
          <div>
            <h1 class="text-xl font-black tracking-tight text-slate-900 dark:text-white">Pulse</h1>
            <p class="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              <span v-if="activeMainTab === 'library'">{{ localCount }} {{ localCount === 1 ? 'song' : 'songs' }}</span>
              <span v-else-if="activeMainTab === 'discover'">Jamendo Stream</span>
              <span v-else-if="activeMainTab === 'radio'">Global Radio</span>
              <span v-else-if="activeMainTab === 'tv'">HLS Cinema TV</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Sleep timer quick button if active -->
          <button
            v-if="sleep.isActive.value"
            type="button"
            class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95 cursor-pointer border
                   bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs
                   dark:bg-indigo-600/30 dark:text-indigo-400 dark:border-indigo-500/40"
            title="Sleep timer active"
            @click="sleepOpen = true"
          >
            <Moon :size="13" />
            <span>{{ sleepLabel }}</span>
          </button>

          <!-- Quick Import button in Library -->
          <button
            v-if="activeMainTab === 'library'"
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 !text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/20 transition active:scale-90 hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
            :disabled="isImporting"
            aria-label="Import audio files"
            title="Import audio files"
            @click="openFilePicker"
          >
            <RefreshCw v-if="isImporting" :size="17" class="animate-spin text-white" />
            <FolderPlus v-else :size="18" class="text-white" />
          </button>

          <!-- App Menu button -->
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90 cursor-pointer border
                   bg-white/80 text-slate-700 border-slate-200/90 shadow-sm hover:text-slate-900 hover:bg-slate-50
                   dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-white/10 dark:hover:text-white"
            aria-label="Open menu"
            title="Menu & Hub"
            @click="menuOpen = true"
          >
            <Menu :size="19" />
          </button>
        </div>
      </header>

      <!-- Scrollable content area -->
      <main
        class="flex-1 overflow-y-auto px-5"
        :class="[
          currentTrack && activeMainTab !== 'tv' && !activePlayingChannel
            ? 'pb-36'
            : 'pb-24'
        ]"
      >
        <!-- 1. Library Pillar -->
        <TrackList
          v-if="activeMainTab === 'library'"
          :tracks="filteredLibraryTracks"
          :current-track="currentTrack"
          :is-playing="isPlaying"
          :liked-ids="likedIds"
          :is-importing="isImporting"
          :selected-filter="selectedLibraryFilter"
          :search-query="librarySearch"
          @update:search-query="librarySearch = $event"
          @select-filter="selectedLibraryFilter = $event"
          @play-track="playTrackAndShow"
          @toggle-playback="toggleTrackPlayback"
          @toggle-like="toggleLike"
          @remove-track="promptRemoveTrack"
          @open-file-picker="openFilePicker"
          @shuffle-all="shuffleAllLibrary"
          @switch-to-discover="switchMainTab('discover')"
        />

        <!-- 2. Discover Pillar (Jamendo Online Music) -->
        <DiscoverSection
          v-else-if="activeMainTab === 'discover'"
          :genres="onlineGenres"
          :active-genre-id="activeGenreId"
          :tracks="onlineTracks"
          :current-track="currentTrack"
          :is-playing="isPlaying"
          :is-loading="isLoadingOnline"
          :error="onlineError"
          :search-query="discoverSearch"
          :liked-ids="likedIds"
          @update:search-query="discoverSearch = $event"
          @select-genre="onSelectGenre"
          @play-track="playTrackAndShow"
          @toggle-playback="toggleTrackPlayback"
          @toggle-like="toggleLike"
          @retry="fetchOnlineTracks(true)"
        />

        <!-- 3. Live Radio Pillar -->
        <LiveRadioSection
          v-else-if="activeMainTab === 'radio'"
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

        <!-- 4. Live TV Pillar -->
        <LiveTvSection
          v-else-if="activeMainTab === 'tv'"
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
      </main>

      <!-- Floating Mini Player Bar (Docked smoothly above Bottom Navigation Dock) -->
      <MiniPlayerBar
        v-if="currentTrack && activeMainTab !== 'tv' && !activePlayingChannel"
        :current-track="currentTrack"
        :is-playing="isPlaying"
        :progress-percent="progressPercent"
        :is-liked="likedIds.has(currentTrack.id)"
        @toggle-play="player.togglePlay()"
        @toggle-like="toggleLike"
        @expand="activeTab = 'player'"
      />

      <!-- Floating Glassmorphic Bottom Navigation Dock -->
      <BottomNavDock
        :active-tab="activeMainTab"
        :local-count="localCount"
        @select-tab="switchMainTab"
      />
    </div>

    <!-- ============================================================== -->
    <!-- VIEW 2: FULLSCREEN NOW PLAYING OVERLAY                          -->
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
      :volume="volume"
      :volume-supported="volumeSupported"
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
      @set-volume="setVolume"
    />

    <!-- ============================================================== -->
    <!-- DRAWERS & MODALS                                               -->
    <!-- ============================================================== -->

    <!-- Right Side Hub Menu -->
    <SideMenuDrawer
      v-model:open="menuOpen"
      :active-main-tab="activeMainTab"
      :local-count="localCount"
      @close="menuOpen = false"
      @navigate="switchMainTab"
      @open-about="aboutOpen = true"
      @open-settings="settingsOpen = true"
    />

    <!-- Settings Modal -->
    <SettingsModal
      v-model:open="settingsOpen"
      @close="settingsOpen = false"
    />

    <!-- About Modal -->
    <AboutModal
      v-model:open="aboutOpen"
      :local-count="localCount"
      @close="aboutOpen = false"
    />

    <!-- Up Next Queue Drawer -->
    <UpNextDrawer
      v-model:open="playlistOpen"
      :queue="player.queue.value"
      :current-track="currentTrack"
      @close="playlistOpen = false"
      @select-track="selectQueueTrack"
      @remove-track="promptRemoveTrack"
      @import-audio="openFilePicker"
      @discover-online="() => { playlistOpen = false; switchMainTab('discover') }"
    />

    <!-- Sleep Timer Drawer -->
    <SleepTimerDrawer
      v-model:open="sleepOpen"
      :active-selection="sleep.selection.value"
      :is-active="sleep.isActive.value"
      :remaining-formatted="sleepRemainingFormatted"
      @close="sleepOpen = false"
      @choose-minutes="chooseSleepMinutes"
      @choose-end-of-track="chooseSleepEndOfTrack"
      @turn-off="turnOffSleep"
    />

    <!-- Remove Track Confirmation Modal -->
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
