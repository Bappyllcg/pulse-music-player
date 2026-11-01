<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  AudioLines,
  Check,
  ChevronDown,
  ChevronLeft,
  Heart,
  ListMusic,
  Maximize2,
  Moon,
  Music,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  RotateCcw,
  RotateCw,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Trash2,
  X,
} from 'lucide-vue-next'
import MarqueeText from './components/MarqueeText.vue'
import WaveformScrubber from './components/WaveformScrubber.vue'
import { useAudioStorage } from './composables/useAudioStorage'
import { usePlayer } from './composables/usePlayer'
import { SLEEP_MINUTE_OPTIONS, useSleepTimer } from './composables/useSleepTimer'

/* ------------------------------------------------------------------ */
/* Composables & State                                                */
/* ------------------------------------------------------------------ */

const storage = useAudioStorage()
const player = usePlayer()
const sleep = useSleepTimer()

const { tracks, localCount, isImporting } = storage
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

/** Filter tabs in library: 'all' | 'liked' | 'recent' */
const selectedFilter = ref<'all' | 'liked' | 'recent'>('all')

/** Search */
const showSearch = ref(false)
const searchQuery = ref('')

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
const playlistOpen = ref(false)
const sleepOpen = ref(false)
const notice = ref<string | null>(null)
let noticeTimer: number | undefined

/* ------------------------------------------------------------------ */
/* Filtered Tracks & Active Queue Synchronization                     */
/* ------------------------------------------------------------------ */

const filteredTracks = computed(() => {
  let list = tracks.value

  if (selectedFilter.value === 'liked') {
    list = list.filter((t) => likedIds.value.has(t.id))
  } else if (selectedFilter.value === 'recent') {
    list = [...list].sort((a, b) => b.createdAt - a.createdAt)
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

async function removeTrack(id: string, title: string): Promise<void> {
  if (!window.confirm(`Delete “${title}” from your library?`)) return
  try {
    await storage.deleteTrack(id)
    likedIds.value.delete(id)
  } catch (error) {
    console.error('[Pulse] Delete failed:', error)
    showNotice('Could not delete this track.')
  }
}

/** Tapping a track row in library opens Now Playing without pausing already-playing tracks */
function playTrackAndShow(track: typeof tracks.value[0]): void {
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
function toggleTrackPlayback(track: typeof tracks.value[0]): void {
  if (player.currentTrack.value?.id !== track.id) {
    player.setQueue(filteredTracks.value)
  }
  player.selectTrack(track)
}

/** Up Next drawer track row click */
function selectQueueTrack(track: typeof tracks.value[0]): void {
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
  playlistOpen.value = false
  sleepOpen.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeSheets()
}

// When last track is removed, exit back to library empty state
watch(
  () => tracks.value.length,
  (count) => {
    if (count === 0) {
      playlistOpen.value = false
      sleepOpen.value = false
      activeTab.value = 'library'
    }
  },
)

/* ------------------------------------------------------------------ */
/* Swipe-to-Dismiss Gestures for Bottom Sheets                        */
/* ------------------------------------------------------------------ */

const playlistDragOffset = ref(0)
const isDraggingPlaylist = ref(false)
let touchStartYPlaylist = 0

function onPlaylistTouchStart(e: TouchEvent): void {
  touchStartYPlaylist = e.touches[0].clientY
  isDraggingPlaylist.value = true
}
function onPlaylistTouchMove(e: TouchEvent): void {
  if (!isDraggingPlaylist.value) return
  const deltaY = e.touches[0].clientY - touchStartYPlaylist
  playlistDragOffset.value = deltaY > 0 ? deltaY : 0
}
function onPlaylistTouchEnd(): void {
  if (!isDraggingPlaylist.value) return
  isDraggingPlaylist.value = false
  if (playlistDragOffset.value > 80) {
    playlistOpen.value = false
  }
  playlistDragOffset.value = 0
}

const sleepDragOffset = ref(0)
const isDraggingSleep = ref(false)
let touchStartYSleep = 0

function onSleepTouchStart(e: TouchEvent): void {
  touchStartYSleep = e.touches[0].clientY
  isDraggingSleep.value = true
}
function onSleepTouchMove(e: TouchEvent): void {
  if (!isDraggingSleep.value) return
  const deltaY = e.touches[0].clientY - touchStartYSleep
  sleepDragOffset.value = deltaY > 0 ? deltaY : 0
}
function onSleepTouchEnd(): void {
  if (!isDraggingSleep.value) return
  isDraggingSleep.value = false
  if (sleepDragOffset.value > 80) {
    sleepOpen.value = false
  }
  sleepDragOffset.value = 0
}

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
      <!-- Scrollable content area (padded at bottom to clear mini player) -->
      <div class="flex-1 overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-32">
        <!-- Top App Bar with Branding and Actions -->
        <header class="mb-5 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 shadow-lg shadow-indigo-600/25 ring-1 ring-white/20">
              <AudioLines :size="22" class="text-white" />
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <h1 class="text-xl font-bold tracking-tight text-white">Pulse</h1>
                <span class="rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400 ring-1 ring-indigo-500/30">
                  OFFLINE
                </span>
              </div>
              <p class="text-xs text-zinc-400">
                {{ localCount }} {{ localCount === 1 ? 'track' : 'tracks' }} offline
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <!-- Search toggle -->
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 ring-1 ring-white/10 backdrop-blur-md transition active:scale-90 hover:text-white"
              aria-label="Toggle search"
              @click="showSearch = !showSearch"
            >
              <Search :size="18" />
            </button>

            <!-- Import button -->
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/20 transition active:scale-95 hover:bg-indigo-500 disabled:opacity-50"
              :disabled="isImporting"
              @click="openFilePicker"
            >
              <Plus :size="15" />
              <span>{{ isImporting ? 'Adding...' : 'Import' }}</span>
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
                placeholder="Search tracks or artists..."
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
            class="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95"
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
            class="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95"
            :class="
              selectedFilter === 'liked'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
                : 'bg-zinc-900/80 text-zinc-400 ring-1 ring-white/10 hover:text-white'
            "
            @click="selectedFilter = 'liked'"
          >
            <Heart :size="13" :fill="selectedFilter === 'liked' ? 'currentColor' : 'none'" />
            <span>Liked Songs ({{ likedIds.size }})</span>
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition active:scale-95"
            :class="
              selectedFilter === 'recent'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
                : 'bg-zinc-900/80 text-zinc-400 ring-1 ring-white/10 hover:text-white'
            "
            @click="selectedFilter = 'recent'"
          >
            <span>Recent</span>
          </button>
        </div>

        <!-- Featured / Active Hero Banner -->
        <div
          v-if="currentTrack"
          class="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/70 via-zinc-900/80 to-zinc-900/90 p-5 ring-1 ring-indigo-500/20 shadow-xl"
        >
          <div class="relative z-10 flex items-center justify-between gap-4">
            <div class="min-w-0 flex-1">
              <span class="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider text-indigo-400 uppercase">
                <Sparkles :size="12" />
                Now Playing
              </span>
              <h2 class="mt-1 truncate text-base font-bold text-white">
                {{ currentTrack.title }}
              </h2>
              <p class="truncate text-xs text-zinc-400">{{ currentTrack.artist }}</p>

              <button
                type="button"
                class="mt-3.5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-zinc-950 shadow-md transition active:scale-95 hover:bg-zinc-200"
                @click="activeTab = 'player'"
              >
                <Maximize2 :size="13" />
                <span>Open Player</span>
              </button>
            </div>

            <!-- Artwork Thumbnail -->
            <div
              class="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-zinc-800 ring-1 ring-white/10 shadow-lg"
              @click="activeTab = 'player'"
            >
              <img :src="currentTrack.coverUrl" alt="" class="h-full w-full object-cover" />
              <div
                v-if="isPlaying"
                class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]"
              >
                <span
                  v-for="n in 3"
                  :key="n"
                  class="animate-eq mx-[1px] h-4 w-1 rounded-full bg-indigo-400"
                  :style="{ animationDelay: `${n * 0.15}s` }"
                ></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Track List -->
        <section aria-label="Track list">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-lg font-bold text-white">Your library</h2>
            <span class="text-xs font-medium text-zinc-500">
              {{ filteredTracks.length }} {{ filteredTracks.length === 1 ? 'song' : 'songs' }}
            </span>
          </div>

          <div
            v-if="filteredTracks.length === 0"
            class="flex flex-col items-center justify-center gap-2 rounded-2xl bg-zinc-900/40 py-12 text-center ring-1 ring-zinc-800"
          >
            <Music :size="32" class="text-zinc-600" />
            <p class="text-sm font-medium text-zinc-300">No tracks found</p>
            <p class="text-xs text-zinc-500">
              {{ searchQuery ? 'Try adjusting your search query.' : 'Import audio files to build your offline library.' }}
            </p>
          </div>

          <ul v-else class="space-y-2">
            <li
              v-for="track in filteredTracks"
              :key="track.id"
              class="group flex items-center justify-between rounded-2xl bg-zinc-900/50 p-2.5 ring-1 ring-white/[0.06] transition active:scale-[0.99] active:bg-zinc-800/80"
              :class="{ 'bg-indigo-950/30 ring-indigo-500/30': currentTrack?.id === track.id }"
            >
              <!-- Song Info & Thumbnail (Tap navigates to player without pausing) -->
              <div
                class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 pr-2"
                @click="playTrackAndShow(track)"
              >
                <div class="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-800 ring-1 ring-white/10">
                  <img :src="track.coverUrl" alt="" class="h-full w-full object-cover" />
                  <div
                    v-if="currentTrack?.id === track.id"
                    class="absolute inset-0 flex items-center justify-center bg-black/50"
                  >
                    <span
                      v-for="n in 3"
                      :key="n"
                      class="animate-eq mx-[1px] h-3.5 w-1 origin-bottom rounded-full bg-indigo-400"
                      :style="{ animationDelay: `${n * 0.15}s`, animationPlayState: isPlaying ? 'running' : 'paused' }"
                    ></span>
                  </div>
                </div>

                <div class="min-w-0 flex-1">
                  <p
                    class="truncate text-sm font-semibold"
                    :class="currentTrack?.id === track.id ? 'text-indigo-300' : 'text-zinc-100'"
                  >
                    {{ track.title }}
                  </p>
                  <p class="truncate text-xs text-zinc-400">{{ track.artist }}</p>
                </div>
              </div>

              <!-- Actions: Duration + Favorite + Circular Play + Delete -->
              <div class="flex shrink-0 items-center gap-2">
                <span class="text-xs tabular-nums text-zinc-500">
                  {{ formatTrackDuration(track.duration) }}
                </span>

                <!-- Favorite Heart Button -->
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition active:scale-90"
                  :class="{ 'text-rose-500': likedIds.has(track.id) }"
                  :aria-label="likedIds.has(track.id) ? 'Unlike' : 'Like'"
                  @click.stop="toggleLike(track.id)"
                >
                  <Heart :size="15" :fill="likedIds.has(track.id) ? 'currentColor' : 'none'" />
                </button>

                <!-- Circular Play Button (Explicitly toggles playback) -->
                <button
                  type="button"
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-white ring-1 ring-white/15 transition active:scale-90 active:bg-white/20"
                  :aria-label="currentTrack?.id === track.id && isPlaying ? 'Pause' : 'Play'"
                  @click.stop="toggleTrackPlayback(track)"
                >
                  <Pause v-if="currentTrack?.id === track.id && isPlaying" :size="15" fill="currentColor" />
                  <Play v-else :size="15" fill="currentColor" class="translate-x-0.5" />
                </button>

                <!-- Delete button for local files -->
                <button
                  v-if="track.kind === 'local'"
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 opacity-60 transition active:scale-90 active:text-red-400 hover:opacity-100"
                  :aria-label="`Delete ${track.title}`"
                  @click.stop="removeTrack(track.id, track.title)"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <!-- ============================================================== -->
      <!-- UNIFIED BOTTOM MINI-PLAYER BAR                                 -->
      <!-- ============================================================== -->
      <div
        v-if="currentTrack"
        class="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] z-30"
      >
        <div
          class="relative flex flex-col overflow-hidden rounded-2xl bg-zinc-900/95 p-2 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl transition active:scale-[0.99]"
        >
          <!-- Top subtle progress stripe -->
          <div class="absolute inset-x-0 top-0 h-[2px] bg-zinc-800">
            <div
              class="h-full bg-indigo-500 transition-all duration-150"
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>

          <div class="flex items-center justify-between pt-1">
            <!-- Left Info (Tap opens Now Playing) -->
            <div
              class="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
              @click="activeTab = 'player'"
            >
              <div class="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-zinc-800 ring-1 ring-white/10">
                <img :src="currentTrack.coverUrl" alt="" class="h-full w-full object-cover" />
                <div
                  v-if="isPlaying"
                  class="absolute inset-0 flex items-center justify-center bg-black/40"
                >
                  <span
                    v-for="n in 3"
                    :key="n"
                    class="animate-eq mx-[1px] h-3 w-0.5 rounded-full bg-indigo-400"
                    :style="{ animationDelay: `${n * 0.15}s` }"
                  ></span>
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-xs font-bold text-zinc-100">{{ currentTrack.title }}</p>
                <p class="truncate text-[11px] text-zinc-400">{{ currentTrack.artist }}</p>
              </div>
            </div>

            <div class="flex items-center gap-2 pl-2">
              <!-- Favorite button in mini player -->
              <button
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition active:scale-90"
                :class="{ 'text-rose-500': likedIds.has(currentTrack.id) }"
                :aria-label="likedIds.has(currentTrack.id) ? 'Unlike' : 'Like'"
                @click.stop="toggleLike(currentTrack.id)"
              >
                <Heart :size="16" :fill="likedIds.has(currentTrack.id) ? 'currentColor' : 'none'" />
              </button>

              <!-- Play / Pause in mini player -->
              <button
                type="button"
                class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-950 shadow-md transition active:scale-90 hover:bg-zinc-100"
                :aria-label="isPlaying ? 'Pause' : 'Play'"
                @click.stop="player.togglePlay()"
              >
                <div v-if="isPlaying" class="flex items-center justify-center gap-1">
                  <span class="h-3.5 w-1 rounded-full bg-zinc-950"></span>
                  <span class="h-3.5 w-1 rounded-full bg-zinc-950"></span>
                </div>
                <Play v-else :size="16" fill="currentColor" class="translate-x-0.5" />
              </button>

              <!-- Expand indicator -->
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center text-zinc-400 transition hover:text-white"
                aria-label="Expand player"
                @click="activeTab = 'player'"
              >
                <Maximize2 :size="14" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- VIEW 2: NOW PLAYING SCREEN                                     -->
    <!-- ============================================================== -->
    <div
      v-show="activeTab === 'player'"
      class="flex h-full flex-col justify-between px-6 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]"
    >
      <!-- Top Navigation Bar -->
      <header class="flex items-center justify-between py-2">
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 ring-1 ring-white/10 backdrop-blur-md transition active:scale-90 hover:text-white"
          aria-label="Back to library"
          @click="activeTab = 'library'"
        >
          <ChevronLeft :size="20" aria-hidden="true" />
        </button>

        <h2 class="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          Now Playing
        </h2>

        <!-- Top Right Actions: Up Next Queue & Sleep Timer -->
        <div class="flex items-center gap-2">
          <!-- Up Next Queue button -->
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold text-zinc-300 ring-1 ring-white/10 backdrop-blur-md transition active:scale-95 hover:text-white"
            aria-label="Open queue"
            @click="playlistOpen = true"
          >
            <ListMusic :size="15" />
            <span>Up Next</span>
          </button>

          <!-- Sleep Timer button -->
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 backdrop-blur-md"
            :class="
              sleep.isActive.value
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
                : 'bg-zinc-900/80 text-zinc-300 ring-1 ring-white/10 hover:text-white'
            "
            aria-label="Open sleep timer"
            @click="sleepOpen = true"
          >
            <Moon :size="14" />
            <span>{{ sleepLabel }}</span>
          </button>
        </div>
      </header>

      <!-- Center Stage: Artwork Carousel Peek -->
      <section class="relative my-auto flex items-center justify-center py-2" aria-label="Album artwork carousel">
        <!-- Ambient glow centered strictly behind the artwork -->
        <div
          v-if="currentTrack"
          class="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
        >
          <div
            class="h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl transition-all duration-700"
            :class="isPlaying ? 'scale-110 opacity-70' : 'scale-90 opacity-30'"
          ></div>
        </div>

        <div class="relative flex w-full items-center justify-center">
          <!-- Left Peek Artwork (Previous Track) -->
          <div
            v-if="prevTrack"
            class="absolute -left-3 z-0 h-44 w-12 cursor-pointer overflow-hidden rounded-2xl opacity-30 blur-[1px] transition-all duration-300 active:scale-95"
            aria-label="Previous track artwork"
            @click="player.previous()"
          >
            <img :src="prevTrack.coverUrl" alt="" class="h-full w-full object-cover" />
          </div>

          <!-- Center Active Artwork -->
          <div
            class="relative z-10 aspect-square w-[min(74vw,18rem)] overflow-hidden rounded-3xl bg-zinc-900 shadow-2xl ring-1 ring-white/15 transition-all duration-500 ease-out"
            :class="isPlaying ? 'scale-100 shadow-black/80' : 'scale-[0.88] opacity-80 shadow-black/60'"
          >
            <img
              v-if="currentTrack"
              :src="currentTrack.coverUrl"
              :alt="`Artwork for ${currentTrack.title}`"
              class="h-full w-full object-cover"
              draggable="false"
            />
            <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-600">
              <AudioLines :size="64" />
              <span class="text-xs">No song loaded</span>
            </div>
          </div>

          <!-- Right Peek Artwork (Next Track - exact match to upcoming queue/shuffle) -->
          <div
            v-if="nextTrack"
            class="absolute -right-3 z-0 h-44 w-12 cursor-pointer overflow-hidden rounded-2xl opacity-30 blur-[1px] transition-all duration-300 active:scale-95"
            aria-label="Next track artwork"
            @click="player.next()"
          >
            <img :src="nextTrack.coverUrl" alt="" class="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      <!-- Bottom Audio Controls Card -->
      <section class="shrink-0 space-y-4 pt-2">
        <!-- Title, Artist & Like Button -->
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1 pr-3">
            <p class="truncate text-xs font-semibold text-zinc-400">
              {{ currentTrack?.artist ?? 'Pulse Music' }}
            </p>
            <MarqueeText
              :text="currentTrack?.title ?? 'Ready to Play'"
              :active="activeTab === 'player'"
              class="text-2xl font-bold tracking-tight text-white"
            />
          </div>

          <!-- Like button -->
          <button
            v-if="currentTrack"
            type="button"
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-900/80 ring-1 ring-white/10 backdrop-blur-md transition active:scale-90"
            :class="likedIds.has(currentTrack.id) ? 'text-rose-500 ring-rose-500/30' : 'text-zinc-400'"
            :aria-label="likedIds.has(currentTrack.id) ? 'Unlike song' : 'Like song'"
            @click="toggleLike(currentTrack.id)"
          >
            <Heart :size="20" :fill="likedIds.has(currentTrack.id) ? 'currentColor' : 'none'" />
          </button>
        </div>

        <!-- Interactive Audio Waveform Scrubber -->
        <WaveformScrubber
          :track-id="currentTrack?.id ?? 'none'"
          :current-time="currentTime"
          :duration="duration"
          :disabled="!currentTrack || duration <= 0"
          @seek="player.seek"
        />

        <!-- Primary Transport Controls -->
        <div class="flex items-center justify-between px-1 py-3">
          <!-- Shuffle Button -->
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 active:scale-90"
            :class="
              isShuffle
                ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/40 shadow-[0_0_14px_rgba(99,102,241,0.3)]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'
            "
            :aria-label="isShuffle ? 'Disable shuffle' : 'Enable shuffle'"
            @click="player.toggleShuffle()"
          >
            <Shuffle :size="19" stroke-width="2" />
          </button>

          <!-- 10s Backward Skip with "10" inside -->
          <button
            type="button"
            class="relative flex h-11 w-11 items-center justify-center rounded-full text-zinc-400 transition-all duration-200 hover:text-zinc-200 hover:bg-white/[0.05] active:scale-90"
            aria-label="Rewind 10 seconds"
            @click="player.seekBy(-10)"
          >
            <RotateCcw :size="23" stroke-width="1.75" />
            <span class="absolute text-[9px] font-black tracking-tighter">10</span>
          </button>

          <!-- Previous Track -->
          <button
            type="button"
            class="flex h-12 w-12 items-center justify-center rounded-full text-zinc-300 transition-all duration-200 hover:text-white hover:bg-white/[0.06] active:scale-90"
            aria-label="Previous track"
            @click="player.previous()"
          >
            <SkipBack :size="24" class="fill-current" />
          </button>

          <!-- Main Hero Play / Pause Button with Glowing Aura -->
          <div class="relative flex items-center justify-center">
            <!-- Pulsing ambient glow aura -->
            <div
              class="pointer-events-none absolute -inset-2.5 rounded-full bg-gradient-to-r from-indigo-500/35 via-indigo-400/25 to-violet-500/35 blur-xl transition-all duration-500"
              :class="isPlaying ? 'opacity-100 scale-110' : 'opacity-0 scale-90'"
            ></div>

            <button
              type="button"
              class="relative flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white text-zinc-950 shadow-[0_12px_36px_rgba(255,255,255,0.25)] ring-4 ring-white/15 transition-all duration-200 active:scale-95 hover:scale-105 hover:bg-zinc-100 focus:outline-none"
              :aria-label="isPlaying ? 'Pause' : 'Play'"
              @click="player.togglePlay()"
            >
              <!-- Dual-pill sleek pause bars with breathing room -->
              <div v-if="isPlaying" class="flex items-center justify-center gap-2">
                <span class="h-6 w-2 rounded-full bg-zinc-950 shadow-sm"></span>
                <span class="h-6 w-2 rounded-full bg-zinc-950 shadow-sm"></span>
              </div>
              <!-- Play triangle centered with optical offset -->
              <Play
                v-else
                :size="30"
                class="fill-zinc-950 text-zinc-950 translate-x-0.5"
              />
            </button>
          </div>

          <!-- Next Track -->
          <button
            type="button"
            class="flex h-12 w-12 items-center justify-center rounded-full text-zinc-300 transition-all duration-200 hover:text-white hover:bg-white/[0.06] active:scale-90"
            aria-label="Next track"
            @click="player.next()"
          >
            <SkipForward :size="24" class="fill-current" />
          </button>

          <!-- 10s Forward Skip with "10" inside -->
          <button
            type="button"
            class="relative flex h-11 w-11 items-center justify-center rounded-full text-zinc-400 transition-all duration-200 hover:text-zinc-200 hover:bg-white/[0.05] active:scale-90"
            aria-label="Forward 10 seconds"
            @click="player.seekBy(10)"
          >
            <RotateCw :size="23" stroke-width="1.75" />
            <span class="absolute text-[9px] font-black tracking-tighter">10</span>
          </button>

          <!-- Repeat Mode Button -->
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 active:scale-90"
            :class="
              repeatMode !== 'off'
                ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/40 shadow-[0_0_14px_rgba(99,102,241,0.3)]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'
            "
            :aria-label="`Repeat mode: ${repeatMode}`"
            @click="player.cycleRepeat()"
          >
            <Repeat1 v-if="repeatMode === 'one'" :size="18" stroke-width="2.2" />
            <Repeat v-else :size="18" stroke-width="2" />
          </button>
        </div>
      </section>
    </div>

    <!-- ============================================================== -->
    <!-- UP NEXT QUEUE BOTTOM SHEET                                     -->
    <!-- ============================================================== -->
    <div
      class="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
      :class="playlistOpen ? 'opacity-100' : 'pointer-events-none opacity-0'"
      aria-hidden="true"
      @click="playlistOpen = false"
    ></div>

    <aside
      class="fixed inset-x-0 bottom-0 z-50 flex h-[78dvh] flex-col rounded-t-[2.5rem] bg-zinc-900 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] shadow-2xl ring-1 ring-white/15 transition-transform duration-300 ease-out"
      :class="playlistOpen ? 'translate-y-0' : 'translate-y-full'"
      :style="playlistDragOffset > 0 ? { transform: `translateY(${playlistDragOffset}px)`, transition: 'none' } : {}"
      :inert="playlistOpen ? undefined : true"
      role="dialog"
      aria-label="Playlist queue"
    >
      <div
        class="flex items-center justify-between px-6 pt-4 pb-2 cursor-grab active:cursor-grabbing"
        @touchstart="onPlaylistTouchStart"
        @touchmove="onPlaylistTouchMove"
        @touchend="onPlaylistTouchEnd"
        @touchcancel="onPlaylistTouchEnd"
      >
        <div>
          <div class="mx-auto mb-2 h-1 w-10 rounded-full bg-zinc-700"></div>
          <h2 class="text-xl font-bold text-white">Up Next</h2>
        </div>
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 ring-1 ring-white/10 transition active:scale-90 hover:text-white"
          aria-label="Close playlist"
          @click="playlistOpen = false"
        >
          <ChevronDown :size="20" aria-hidden="true" />
        </button>
      </div>

      <div
        v-if="player.queue.value.length === 0"
        class="flex flex-1 flex-col items-center justify-center gap-3 px-8 pb-10 text-center"
      >
        <ListMusic :size="40" class="text-zinc-600" aria-hidden="true" />
        <p class="text-sm text-zinc-400">Your library is empty. Import audio files to get started.</p>
        <button
          type="button"
          class="mt-2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg"
          @click="openFilePicker"
        >
          Import Audio Files
        </button>
      </div>

      <ul v-else class="min-h-0 flex-1 overflow-y-auto px-4 pb-4 space-y-1.5" aria-label="Queued tracks">
        <li
          v-for="track in player.queue.value"
          :key="track.id"
          class="flex items-center justify-between rounded-2xl p-2.5 transition active:bg-zinc-800/80"
          :class="currentTrack?.id === track.id ? 'bg-indigo-950/40 ring-1 ring-indigo-500/30' : 'bg-zinc-800/40'"
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-3 text-left"
            @click="selectQueueTrack(track)"
          >
            <div class="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
              <img :src="track.coverUrl" alt="" class="h-full w-full object-cover" />
              <div
                v-if="currentTrack?.id === track.id"
                class="absolute inset-0 flex items-center justify-center bg-black/40"
              >
                <span
                  v-for="n in 3"
                  :key="n"
                  class="animate-eq mx-[1px] h-3 w-0.5 rounded-full bg-indigo-400"
                  :style="{ animationDelay: `${n * 0.15}s` }"
                ></span>
              </div>
            </div>

            <div class="min-w-0 flex-1">
              <p
                class="truncate text-sm font-semibold"
                :class="currentTrack?.id === track.id ? 'text-indigo-300' : 'text-zinc-100'"
              >
                {{ track.title }}
              </p>
              <p class="truncate text-xs text-zinc-400">{{ track.artist }}</p>
            </div>
          </button>

          <div class="flex items-center gap-2 pl-2">
            <span class="text-xs tabular-nums text-zinc-500">{{ formatTrackDuration(track.duration) }}</span>
            <button
              v-if="track.kind === 'local'"
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition active:scale-90 active:text-red-400"
              :aria-label="`Delete ${track.title}`"
              @click="removeTrack(track.id, track.title)"
            >
              <Trash2 :size="15" />
            </button>
          </div>
        </li>
      </ul>
    </aside>

    <!-- ============================================================== -->
    <!-- SLEEP TIMER BOTTOM SHEET                                       -->
    <!-- ============================================================== -->
    <div
      class="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
      :class="sleepOpen ? 'opacity-100' : 'pointer-events-none opacity-0'"
      aria-hidden="true"
      @click="sleepOpen = false"
    ></div>

    <aside
      class="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[2.5rem] bg-zinc-900 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] shadow-2xl ring-1 ring-white/15 transition-transform duration-300 ease-out"
      :class="sleepOpen ? 'translate-y-0' : 'translate-y-full'"
      :style="sleepDragOffset > 0 ? { transform: `translateY(${sleepDragOffset}px)`, transition: 'none' } : {}"
      :inert="sleepOpen ? undefined : true"
      role="dialog"
      aria-label="Sleep timer"
    >
      <div
        class="flex items-center justify-between px-6 pt-4 pb-2 cursor-grab active:cursor-grabbing"
        @touchstart="onSleepTouchStart"
        @touchmove="onSleepTouchMove"
        @touchend="onSleepTouchEnd"
        @touchcancel="onSleepTouchEnd"
      >
        <div>
          <div class="mx-auto mb-2 h-1 w-10 rounded-full bg-zinc-700"></div>
          <h2 class="text-xl font-bold text-white">Sleep Timer</h2>
        </div>
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 ring-1 ring-white/10 transition active:scale-90 hover:text-white"
          aria-label="Close sleep timer"
          @click="sleepOpen = false"
        >
          <ChevronDown :size="20" aria-hidden="true" />
        </button>
      </div>

      <ul class="px-4 pt-2 space-y-1" aria-label="Sleep timer options">
        <li v-for="minutes in SLEEP_MINUTE_OPTIONS" :key="minutes">
          <button
            type="button"
            class="flex min-h-12 w-full items-center justify-between rounded-2xl px-4 text-left text-sm font-semibold transition active:bg-zinc-800"
            :class="sleep.selection.value === minutes ? 'bg-indigo-950/60 text-indigo-300 ring-1 ring-indigo-500/40' : 'text-zinc-200'"
            @click="chooseSleepMinutes(minutes)"
          >
            <span>{{ minutes }} minutes</span>
            <Check v-if="sleep.selection.value === minutes" :size="18" class="text-indigo-400" aria-hidden="true" />
          </button>
        </li>
        <li>
          <button
            type="button"
            class="flex min-h-12 w-full items-center justify-between rounded-2xl px-4 text-left text-sm font-semibold transition active:bg-zinc-800"
            :class="sleep.selection.value === 'track' ? 'bg-indigo-950/60 text-indigo-300 ring-1 ring-indigo-500/40' : 'text-zinc-200'"
            @click="chooseSleepEndOfTrack"
          >
            <span>End of current track</span>
            <Check v-if="sleep.selection.value === 'track'" :size="18" class="text-indigo-400" aria-hidden="true" />
          </button>
        </li>
        <li v-if="sleep.isActive.value">
          <button
            type="button"
            class="mt-2 flex min-h-12 w-full items-center justify-center rounded-2xl bg-red-950/40 px-4 text-sm font-semibold text-red-400 ring-1 ring-red-500/30 transition active:bg-red-900/50"
            @click="turnOffSleep"
          >
            Turn off timer
          </button>
        </li>
      </ul>
    </aside>
  </div>
</template>
