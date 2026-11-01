<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  AudioLines,
  Check,
  ChevronDown,
  ChevronLeft,
  Heart,
  Home,
  ListMusic,
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

/** Active main view: 'library' (Screens 1 & 2) or 'player' (Screen 3) */
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
/* Filtered Tracks                                                    */
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

/** Previous and next tracks for the artwork carousel peek in Now Playing */
const prevTrack = computed(() => {
  if (!currentTrack.value || tracks.value.length < 2) return null
  const idx = tracks.value.findIndex((t) => t.id === currentTrack.value?.id)
  if (idx <= 0) return tracks.value[tracks.value.length - 1]
  return tracks.value[idx - 1]
})

const nextTrack = computed(() => {
  if (!currentTrack.value || tracks.value.length < 2) return null
  const idx = tracks.value.findIndex((t) => t.id === currentTrack.value?.id)
  if (idx < 0 || idx >= tracks.value.length - 1) return tracks.value[0]
  return tracks.value[idx + 1]
})

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
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
    if (result.skipped.length > 0) {
      parts.push(`Skipped ${result.skipped.length} unsupported ${result.skipped.length === 1 ? 'file' : 'files'}`)
    }
    showNotice(parts.join(' · '))
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

function playTrackAndShow(track: typeof tracks.value[0]): void {
  player.selectTrack(track)
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
  <div
    class="relative isolate flex h-dvh select-none flex-col overflow-hidden overscroll-none bg-[#0d0b1a] text-zinc-100"
  >
    <!-- Background dynamic ambient purple glow -->
    <div
      class="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-b from-purple-700/25 via-fuchsia-900/15 to-transparent blur-3xl"
    ></div>
    <div
      v-if="currentTrack"
      :style="{ backgroundImage: `radial-gradient(circle at center, rgba(168, 85, 247, 0.18), transparent 70%)` }"
      class="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-700"
    ></div>

    <!-- Hidden file input for importing audio -->
    <input
      ref="fileInput"
      type="file"
      accept="audio/*,.mp3,.m4a,.wav,.flac,.ogg"
      multiple
      class="hidden"
      @change="onFilesSelected"
    />

    <!-- Notice banner -->
    <div
      v-if="notice || playbackError"
      class="fixed top-[calc(env(safe-area-inset-top,0px)+1rem)] inset-x-5 z-50 text-center text-xs"
      aria-live="polite"
      role="status"
    >
      <p v-if="notice" class="mx-auto inline-block rounded-full bg-purple-950/90 px-4 py-2 text-purple-200 ring-1 ring-purple-500/40 shadow-xl backdrop-blur-md">
        {{ notice }}
      </p>
      <p v-else-if="playbackError" class="mx-auto inline-block rounded-full bg-red-950/90 px-4 py-2 text-red-200 ring-1 ring-red-500/40 shadow-xl backdrop-blur-md">
        {{ playbackError }}
      </p>
    </div>

    <!-- ============================================================== -->
    <!-- VIEW 1: LIBRARY & DISCOVERY (Screens 1 & 2 in Inspiration)     -->
    <!-- ============================================================== -->
    <div
      v-show="activeTab === 'library'"
      class="flex h-full flex-col overflow-hidden pb-24 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]"
    >
      <!-- Brand Header (replacing profile avatar & "Hello Alex" as requested) -->
      <header class="flex items-center justify-between px-6 pt-2 pb-3">
        <div class="flex items-center gap-3">
          <div
            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-purple-500 to-fuchsia-500 shadow-lg shadow-purple-500/30"
          >
            <AudioLines :size="24" :stroke-width="2.5" class="text-white" aria-hidden="true" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-black tracking-tight text-white">Pulse</h1>
              <span class="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-300 ring-1 ring-purple-500/30">
                PWA
              </span>
            </div>
            <p class="text-xs font-medium text-purple-200/60">
              {{ localCount }} {{ localCount === 1 ? 'track' : 'tracks' }} offline
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <!-- Search toggle -->
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-purple-200 ring-1 ring-white/10 backdrop-blur-md transition active:scale-90 active:bg-white/10"
            :class="{ 'bg-purple-500/30 text-white ring-purple-500/50': showSearch }"
            aria-label="Search library"
            @click="showSearch = !showSearch"
          >
            <Search :size="18" aria-hidden="true" />
          </button>

          <!-- Import button -->
          <button
            type="button"
            class="flex h-10 items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500 px-3.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition active:scale-95 disabled:opacity-50"
            :disabled="isImporting"
            @click="openFilePicker"
          >
            <Plus :size="15" :stroke-width="3" aria-hidden="true" />
            <span>{{ isImporting ? 'Importing…' : 'Import' }}</span>
          </button>
        </div>
      </header>

      <!-- Expandable Search Input -->
      <div v-if="showSearch" class="px-6 py-2">
        <div class="relative flex items-center">
          <Search :size="16" class="pointer-events-none absolute left-3.5 text-purple-300/60" aria-hidden="true" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search songs or artists…"
            class="w-full rounded-2xl bg-white/[0.07] py-2.5 pr-10 pl-10 text-sm text-white placeholder-purple-300/40 ring-1 ring-white/10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-3 text-purple-300/60 hover:text-white"
            aria-label="Clear search"
            @click="searchQuery = ''"
          >
            <X :size="16" aria-hidden="true" />
          </button>
        </div>
      </div>

      <!-- Category Filter Pills (All / Liked Songs / Recent) -->
      <nav class="flex items-center gap-2 overflow-x-auto px-6 py-2.5 no-scrollbar" aria-label="Library filters">
        <button
          type="button"
          class="shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition active:scale-95"
          :class="
            selectedFilter === 'all'
              ? 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white shadow-md shadow-purple-600/30'
              : 'bg-white/[0.05] text-purple-200/70 ring-1 ring-white/10 hover:text-white'
          "
          @click="selectedFilter = 'all'"
        >
          All
        </button>
        <button
          type="button"
          class="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition active:scale-95"
          :class="
            selectedFilter === 'liked'
              ? 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white shadow-md shadow-purple-600/30'
              : 'bg-white/[0.05] text-purple-200/70 ring-1 ring-white/10 hover:text-white'
          "
          @click="selectedFilter = 'liked'"
        >
          <Heart :size="12" :fill="selectedFilter === 'liked' ? 'currentColor' : 'none'" aria-hidden="true" />
          <span>Liked Songs ({{ likedIds.size }})</span>
        </button>
        <button
          type="button"
          class="shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition active:scale-95"
          :class="
            selectedFilter === 'recent'
              ? 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white shadow-md shadow-purple-600/30'
              : 'bg-white/[0.05] text-purple-200/70 ring-1 ring-white/10 hover:text-white'
          "
          @click="selectedFilter = 'recent'"
        >
          Recent
        </button>
      </nav>

      <!-- Scrollable Body Content -->
      <div class="flex-1 overflow-y-auto px-6 pb-6">
        <!-- Hero Feature Card (Screen 1 "For you / Feel the Beat" in Inspiration) -->
        <section class="mt-2 mb-6" aria-label="Featured music banner">
          <div
            v-if="tracks.length === 0"
            class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/60 via-fuchsia-950/40 to-indigo-950/60 p-6 ring-1 ring-white/10 shadow-2xl backdrop-blur-xl"
          >
            <div class="pointer-events-none absolute -right-6 -bottom-6 h-40 w-40 rounded-full bg-purple-500/20 blur-2xl"></div>
            <div class="relative z-10">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-purple-300">
                <Sparkles :size="12" /> Offline & Private
              </span>
              <h2 class="mt-2 text-xl font-bold tracking-tight text-white">Your Personal Vault</h2>
              <p class="mt-1 text-xs text-purple-200/70">
                No algorithms, trackers, or monthly fees. Import your favourite MP3, M4A, or WAV files to listen anytime offline.
              </p>
              <button
                type="button"
                class="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-zinc-950 shadow-lg transition active:scale-95"
                @click="openFilePicker"
              >
                <Plus :size="14" :stroke-width="3" />
                <span>Import Audio Files</span>
              </button>
            </div>
          </div>

          <div
            v-else-if="currentTrack"
            class="relative flex items-center justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/50 via-[#1b1434] to-[#120d24] p-5 ring-1 ring-white/10 shadow-xl backdrop-blur-xl transition active:scale-[0.99] cursor-pointer"
            @click="activeTab = 'player'"
          >
            <div class="min-w-0 flex-1 pr-4">
              <span class="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-300">
                Now Playing
              </span>
              <h3 class="mt-1.5 truncate text-base font-bold text-white">{{ currentTrack.title }}</h3>
              <p class="truncate text-xs text-purple-200/60">{{ currentTrack.artist }}</p>
              <div class="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  class="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-xs font-bold text-zinc-950 shadow transition active:scale-90"
                  @click.stop="player.togglePlay()"
                >
                  <Pause v-if="isPlaying" :size="12" fill="currentColor" />
                  <Play v-else :size="12" fill="currentColor" />
                  <span>{{ isPlaying ? 'Pause' : 'Resume' }}</span>
                </button>
              </div>
            </div>
            <div class="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/10">
              <img :src="currentTrack.coverUrl" alt="" class="h-full w-full object-cover" />
              <div
                v-if="isPlaying"
                class="absolute inset-0 flex items-end justify-center gap-0.5 bg-black/40 pb-2"
                aria-hidden="true"
              >
                <span
                  v-for="n in 3"
                  :key="n"
                  class="animate-eq h-3.5 w-1 origin-bottom rounded-full bg-purple-300"
                  :style="{ animationDelay: `${n * 0.15}s` }"
                ></span>
              </div>
            </div>
          </div>
        </section>

        <!-- Track List ("Your library" Screen 2 in Inspiration) -->
        <section aria-label="Track list">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-lg font-bold text-white">Your library</h2>
            <span class="text-xs font-medium text-purple-200/50">
              {{ filteredTracks.length }} {{ filteredTracks.length === 1 ? 'song' : 'songs' }}
            </span>
          </div>

          <div
            v-if="filteredTracks.length === 0"
            class="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/[0.02] py-12 text-center ring-1 ring-white/5"
          >
            <Music :size="32" class="text-purple-300/40" />
            <p class="text-sm font-medium text-purple-200/70">No tracks found</p>
            <p class="text-xs text-purple-200/40">
              {{ searchQuery ? 'Try adjusting your search query.' : 'Import audio files to build your offline library.' }}
            </p>
          </div>

          <ul v-else class="space-y-2">
            <li
              v-for="track in filteredTracks"
              :key="track.id"
              class="group flex items-center justify-between rounded-2xl bg-white/[0.03] p-2.5 ring-1 ring-white/[0.06] transition active:scale-[0.99] active:bg-white/[0.07]"
              :class="{ 'bg-purple-950/40 ring-purple-500/30': currentTrack?.id === track.id }"
            >
              <!-- Song Info & Thumbnail -->
              <div
                class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 pr-2"
                @click="playTrackAndShow(track)"
              >
                <div class="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-purple-950/60 ring-1 ring-white/10">
                  <img :src="track.coverUrl" alt="" class="h-full w-full object-cover" />
                  <div
                    v-if="currentTrack?.id === track.id"
                    class="absolute inset-0 flex items-center justify-center bg-black/50"
                  >
                    <span
                      v-for="n in 3"
                      :key="n"
                      class="animate-eq mx-[1px] h-3.5 w-1 origin-bottom rounded-full bg-purple-300"
                      :style="{ animationDelay: `${n * 0.15}s`, animationPlayState: isPlaying ? 'running' : 'paused' }"
                    ></span>
                  </div>
                </div>

                <div class="min-w-0 flex-1">
                  <p
                    class="truncate text-sm font-semibold"
                    :class="currentTrack?.id === track.id ? 'text-purple-300' : 'text-white'"
                  >
                    {{ track.title }}
                  </p>
                  <p class="truncate text-xs text-purple-200/60">{{ track.artist }}</p>
                </div>
              </div>

              <!-- Actions: Duration + Circular Play + Favorite + Delete -->
              <div class="flex shrink-0 items-center gap-2">
                <span class="text-xs tabular-nums text-purple-200/50">
                  {{ formatTrackDuration(track.duration) }}
                </span>

                <!-- Favorite Heart Button -->
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-full text-purple-200/40 transition active:scale-90"
                  :class="{ 'text-fuchsia-400': likedIds.has(track.id) }"
                  :aria-label="likedIds.has(track.id) ? 'Unlike' : 'Like'"
                  @click.stop="toggleLike(track.id)"
                >
                  <Heart :size="15" :fill="likedIds.has(track.id) ? 'currentColor' : 'none'" />
                </button>

                <!-- Circular Play Button (mimicking Screen 2) -->
                <button
                  type="button"
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-white ring-1 ring-white/15 transition active:scale-90 active:bg-white/20"
                  :aria-label="currentTrack?.id === track.id && isPlaying ? 'Pause' : 'Play'"
                  @click.stop="player.selectTrack(track)"
                >
                  <Pause v-if="currentTrack?.id === track.id && isPlaying" :size="14" fill="currentColor" />
                  <Play v-else :size="14" fill="currentColor" class="translate-x-0.5" />
                </button>

                <!-- Delete Trash Button -->
                <button
                  v-if="track.kind === 'local'"
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-full text-purple-200/30 transition active:scale-90 active:text-red-400"
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

      <!-- Floating Mini Player (appears when music is playing and browsing library) -->
      <div
        v-if="currentTrack"
        class="fixed bottom-20 inset-x-5 z-20 flex cursor-pointer items-center justify-between rounded-2xl bg-[#1c1436]/90 p-2.5 shadow-2xl ring-1 ring-white/10 backdrop-blur-2xl transition active:scale-[0.99]"
        @click="activeTab = 'player'"
      >
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <div class="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-purple-900 ring-1 ring-white/10">
            <img :src="currentTrack.coverUrl" alt="" class="h-full w-full object-cover" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-bold text-white">{{ currentTrack.title }}</p>
            <p class="truncate text-[11px] text-purple-200/60">{{ currentTrack.artist }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2 pl-2">
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-950 shadow transition active:scale-90"
            :aria-label="isPlaying ? 'Pause' : 'Play'"
            @click.stop="player.togglePlay()"
          >
            <Pause v-if="isPlaying" :size="15" fill="currentColor" />
            <Play v-else :size="15" fill="currentColor" class="translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- VIEW 2: NOW PLAYING SCREEN (Screen 3 in Inspiration)           -->
    <!-- ============================================================== -->
    <div
      v-show="activeTab === 'player'"
      class="flex h-full flex-col justify-between px-6 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]"
    >
      <!-- Top Navigation Bar -->
      <header class="flex items-center justify-between py-2">
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-white ring-1 ring-white/15 backdrop-blur-md transition active:scale-90"
          aria-label="Back to library"
          @click="activeTab = 'library'"
        >
          <ChevronLeft :size="20" aria-hidden="true" />
        </button>

        <h2 class="text-sm font-semibold tracking-wide text-purple-200/80 uppercase">
          Now Playing
        </h2>

        <!-- Top Right Actions: Up Next Queue & Sleep Timer -->
        <div class="flex items-center gap-2">
          <!-- Up Next Queue button -->
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-purple-200/80 ring-1 ring-white/15 backdrop-blur-md transition active:scale-90 hover:text-white"
            aria-label="Up next queue"
            aria-haspopup="dialog"
            :aria-expanded="playlistOpen"
            @click="playlistOpen = true"
          >
            <ListMusic :size="18" aria-hidden="true" />
          </button>

          <!-- Sleep timer modal button -->
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full ring-1 transition active:scale-90"
            :class="
              sleep.isActive.value
                ? 'bg-purple-500/30 text-white ring-purple-500/60 shadow-lg shadow-purple-500/30'
                : 'bg-white/[0.08] text-purple-200/80 ring-white/15 backdrop-blur-md'
            "
            :aria-label="sleep.isActive.value ? `Sleep timer: ${sleepLabel}` : 'Sleep timer'"
            :title="sleep.isActive.value ? `Sleep: ${sleepLabel}` : 'Sleep timer'"
            aria-haspopup="dialog"
            :aria-expanded="sleepOpen"
            @click="sleepOpen = true"
          >
            <Moon :size="17" :fill="sleep.isActive.value ? 'currentColor' : 'none'" aria-hidden="true" />
          </button>
        </div>
      </header>

      <!-- Center Stage: Artwork Carousel Peek (Screen 3 in Inspiration) -->
      <section class="relative my-auto flex items-center justify-center py-2" aria-label="Album artwork carousel">
        <!-- Ambient glow centered strictly behind the artwork -->
        <div
          v-if="currentTrack"
          class="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
        >
          <div
            class="h-64 w-64 rounded-full bg-purple-600/30 blur-3xl transition-all duration-700"
            :class="isPlaying ? 'scale-110 opacity-70' : 'scale-90 opacity-40'"
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
            class="relative z-10 aspect-square w-[min(74vw,18rem)] overflow-hidden rounded-3xl bg-purple-950/80 shadow-2xl ring-1 ring-white/15 transition-all duration-500 ease-out"
            :class="isPlaying ? 'scale-100 shadow-purple-900/50' : 'scale-[0.88] opacity-80 shadow-black/60'"
          >
            <img
              v-if="currentTrack"
              :src="currentTrack.coverUrl"
              :alt="`Artwork for ${currentTrack.title}`"
              class="h-full w-full object-cover"
              draggable="false"
            />
            <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-purple-300/40">
              <AudioLines :size="64" />
              <span class="text-xs">No song loaded</span>
            </div>
          </div>

          <!-- Right Peek Artwork (Next Track) -->
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
        <!-- Title, Artist & Like Button (Screen 3 in Inspiration) -->
        <div class="flex items-center justify-between">
          <div class="min-w-0 flex-1 pr-3">
            <p class="truncate text-xs font-semibold text-purple-300/70">
              {{ currentTrack?.artist ?? 'Pulse Music' }}
            </p>
            <MarqueeText
              :text="currentTrack?.title ?? 'Ready to Play'"
              class="text-2xl font-bold tracking-tight text-white"
            />
          </div>

          <!-- Like button -->
          <button
            v-if="currentTrack"
            type="button"
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.08] ring-1 ring-white/15 backdrop-blur-md transition active:scale-90"
            :class="likedIds.has(currentTrack.id) ? 'text-fuchsia-400 ring-fuchsia-500/40' : 'text-white/60'"
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

        <!-- Primary Transport Controls (Screen 3 in Inspiration) -->
        <div class="flex items-center justify-between pt-1">
          <!-- Shuffle -->
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90"
            :class="isShuffle ? 'text-purple-400' : 'text-white/40'"
            aria-label="Shuffle"
            @click="player.toggleShuffle()"
          >
            <Shuffle :size="20" aria-hidden="true" />
          </button>

          <!-- 10s Rewind -->
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-purple-200/80 ring-1 ring-white/10 transition active:scale-90 disabled:opacity-40"
            :disabled="!currentTrack"
            aria-label="Rewind 10 seconds"
            @click="player.seekBy(-10)"
          >
            <RotateCcw :size="18" aria-hidden="true" />
          </button>

          <!-- Skip Previous -->
          <button
            type="button"
            class="flex h-12 w-12 items-center justify-center rounded-full text-white transition active:scale-90 disabled:opacity-40"
            :disabled="!currentTrack"
            aria-label="Previous track"
            @click="player.previous()"
          >
            <SkipBack :size="26" fill="currentColor" aria-hidden="true" />
          </button>

          <!-- Main Center Circular Play/Pause (Screen 3 in Inspiration) -->
          <button
            type="button"
            class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-purple-500 via-fuchsia-400 to-white text-zinc-950 shadow-xl shadow-purple-600/40 ring-4 ring-purple-500/20 transition active:scale-90 disabled:opacity-50"
            :disabled="!currentTrack"
            :aria-label="isPlaying ? 'Pause' : 'Play'"
            @click="player.togglePlay()"
          >
            <Pause v-if="isPlaying" :size="28" fill="currentColor" />
            <Play v-else :size="28" fill="currentColor" class="translate-x-0.5" />
          </button>

          <!-- Skip Next -->
          <button
            type="button"
            class="flex h-12 w-12 items-center justify-center rounded-full text-white transition active:scale-90 disabled:opacity-40"
            :disabled="!currentTrack"
            aria-label="Next track"
            @click="player.next()"
          >
            <SkipForward :size="26" fill="currentColor" aria-hidden="true" />
          </button>

          <!-- 10s Forward -->
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-purple-200/80 ring-1 ring-white/10 transition active:scale-90 disabled:opacity-40"
            :disabled="!currentTrack"
            aria-label="Forward 10 seconds"
            @click="player.seekBy(10)"
          >
            <RotateCw :size="18" aria-hidden="true" />
          </button>

          <!-- Repeat Mode -->
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90"
            :class="repeatMode === 'off' ? 'text-white/40' : 'text-purple-400'"
            :aria-label="`Repeat: ${repeatMode}`"
            @click="player.cycleRepeat()"
          >
            <Repeat1 v-if="repeatMode === 'one'" :size="20" aria-hidden="true" />
            <Repeat v-else :size="20" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>

    <!-- ============================================================== -->
    <!-- FLOATING ISLAND BOTTOM NAVIGATION DOCK (Screens 1 & 2)         -->
    <!-- ============================================================== -->
    <nav
      v-show="activeTab === 'library'"
      class="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#18122e]/85 px-4 py-2 ring-1 ring-white/15 shadow-2xl shadow-purple-950/70 backdrop-blur-2xl"
      aria-label="Main Navigation Dock"
    >
      <!-- Library Tab Button -->
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-full transition active:scale-90"
        :class="activeTab === 'library' ? 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white shadow-lg shadow-purple-600/40' : 'text-purple-300/60 hover:text-white'"
        aria-label="Library Home"
        @click="activeTab = 'library'"
      >
        <Home :size="20" aria-hidden="true" />
      </button>

      <!-- Now Playing Center Tab Button -->
      <button
        type="button"
        class="relative flex h-12 w-12 items-center justify-center rounded-full transition active:scale-90"
        :class="
          currentTrack
            ? 'bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-400 text-white shadow-xl shadow-purple-500/50'
            : 'bg-white/[0.08] text-purple-300/50 ring-1 ring-white/10'
        "
        aria-label="Now Playing View"
        @click="activeTab = 'player'"
      >
        <Music :size="21" class="transition-transform duration-300" :class="{ 'scale-110': isPlaying }" aria-hidden="true" />
        <span
          v-if="isPlaying"
          class="absolute -top-0.5 -right-0.5 h-3 w-3 animate-ping rounded-full bg-fuchsia-400 opacity-75"
        ></span>
      </button>

      <!-- Sleep Timer Tab Button -->
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-full transition active:scale-90"
        :class="sleep.isActive.value ? 'bg-purple-500/30 text-purple-200 ring-1 ring-purple-500/50' : 'text-purple-300/60 hover:text-white'"
        aria-label="Sleep timer"
        @click="sleepOpen = true"
      >
        <Moon :size="20" :fill="sleep.isActive.value ? 'currentColor' : 'none'" aria-hidden="true" />
      </button>
    </nav>

    <!-- ============================================================== -->
    <!-- PLAYLIST "UP NEXT" DRAWER BOTTOM SHEET                         -->
    <!-- ============================================================== -->
    <div
      class="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
      :class="playlistOpen ? 'opacity-100' : 'pointer-events-none opacity-0'"
      aria-hidden="true"
      @click="playlistOpen = false"
    ></div>

    <aside
      class="fixed inset-x-0 bottom-0 z-50 flex h-[78dvh] flex-col rounded-t-[2.5rem] bg-[#16102b] pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] shadow-2xl ring-1 ring-white/15 transition-transform duration-300 ease-out"
      :class="playlistOpen ? 'translate-y-0' : 'translate-y-full'"
      :inert="playlistOpen ? undefined : true"
      role="dialog"
      aria-label="Playlist queue"
    >
      <div class="flex items-center justify-between px-6 pt-4 pb-2">
        <div>
          <div class="mx-auto mb-2 h-1 w-10 rounded-full bg-purple-400/30"></div>
          <h2 class="text-xl font-bold text-white">Up Next</h2>
        </div>
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-purple-200 ring-1 ring-white/10 transition active:scale-90"
          aria-label="Close playlist"
          @click="playlistOpen = false"
        >
          <ChevronDown :size="20" aria-hidden="true" />
        </button>
      </div>

      <div
        v-if="tracks.length === 0"
        class="flex flex-1 flex-col items-center justify-center gap-3 px-8 pb-10 text-center"
      >
        <ListMusic :size="40" class="text-purple-400/40" aria-hidden="true" />
        <p class="text-sm text-purple-200/70">Your library is empty. Import audio files to get started.</p>
        <button
          type="button"
          class="mt-2 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500 px-4 py-2 text-xs font-bold text-white shadow-lg"
          @click="openFilePicker"
        >
          Import Audio Files
        </button>
      </div>

      <ul v-else class="min-h-0 flex-1 overflow-y-auto px-4 pb-4 space-y-1.5" aria-label="Queued tracks">
        <li
          v-for="track in tracks"
          :key="track.id"
          class="flex items-center justify-between rounded-2xl p-2.5 transition active:bg-white/[0.06]"
          :class="currentTrack?.id === track.id ? 'bg-purple-950/50 ring-1 ring-purple-500/30' : 'bg-white/[0.02]'"
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-3 text-left"
            @click="player.selectTrack(track); playlistOpen = false"
          >
            <div class="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-purple-950">
              <img :src="track.coverUrl" alt="" class="h-full w-full object-cover" />
              <div
                v-if="currentTrack?.id === track.id"
                class="absolute inset-0 flex items-center justify-center bg-black/40"
              >
                <span
                  v-for="n in 3"
                  :key="n"
                  class="animate-eq mx-[1px] h-3 w-0.5 rounded-full bg-purple-300"
                  :style="{ animationDelay: `${n * 0.15}s` }"
                ></span>
              </div>
            </div>

            <div class="min-w-0 flex-1">
              <p
                class="truncate text-sm font-semibold"
                :class="currentTrack?.id === track.id ? 'text-purple-300' : 'text-white'"
              >
                {{ track.title }}
              </p>
              <p class="truncate text-xs text-purple-200/60">{{ track.artist }}</p>
            </div>
          </button>

          <div class="flex items-center gap-2 pl-2">
            <span class="text-xs tabular-nums text-purple-200/50">{{ formatTrackDuration(track.duration) }}</span>
            <button
              v-if="track.kind === 'local'"
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full text-purple-200/40 transition active:scale-90 active:text-red-400"
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
      class="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[2.5rem] bg-[#16102b] pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] shadow-2xl ring-1 ring-white/15 transition-transform duration-300 ease-out"
      :class="sleepOpen ? 'translate-y-0' : 'translate-y-full'"
      :inert="sleepOpen ? undefined : true"
      role="dialog"
      aria-label="Sleep timer"
    >
      <div class="flex items-center justify-between px-6 pt-4 pb-2">
        <div>
          <div class="mb-2 h-1 w-10 rounded-full bg-purple-400/30"></div>
          <h2 class="text-xl font-bold text-white">Sleep Timer</h2>
        </div>
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-purple-200 ring-1 ring-white/10 transition active:scale-90"
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
            class="flex min-h-12 w-full items-center justify-between rounded-2xl px-4 text-left text-sm font-semibold transition active:bg-white/[0.08]"
            :class="sleep.selection.value === minutes ? 'bg-purple-900/40 text-purple-300 ring-1 ring-purple-500/40' : 'text-zinc-200'"
            @click="chooseSleepMinutes(minutes)"
          >
            <span>{{ minutes }} minutes</span>
            <Check v-if="sleep.selection.value === minutes" :size="18" class="text-purple-300" aria-hidden="true" />
          </button>
        </li>
        <li>
          <button
            type="button"
            class="flex min-h-12 w-full items-center justify-between rounded-2xl px-4 text-left text-sm font-semibold transition active:bg-white/[0.08]"
            :class="sleep.selection.value === 'track' ? 'bg-purple-900/40 text-purple-300 ring-1 ring-purple-500/40' : 'text-zinc-200'"
            @click="chooseSleepEndOfTrack"
          >
            <span>End of current track</span>
            <Check v-if="sleep.selection.value === 'track'" :size="18" class="text-purple-300" aria-hidden="true" />
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
