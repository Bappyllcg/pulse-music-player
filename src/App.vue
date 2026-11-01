<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  AudioLines,
  Check,
  ChevronDown,
  Cloud,
  HardDrive,
  ListMusic,
  Moon,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  RotateCcw,
  RotateCw,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
} from 'lucide-vue-next'
import MarqueeText from './components/MarqueeText.vue'
import { useAudioStorage } from './composables/useAudioStorage'
import { usePlayer } from './composables/usePlayer'
import { SLEEP_MINUTE_OPTIONS, useSleepTimer } from './composables/useSleepTimer'

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

const fileInput = ref<HTMLInputElement | null>(null)
const playlistOpen = ref(false)
const notice = ref<string | null>(null)
let noticeTimer: number | undefined

/* ------------------------------ Helpers ------------------------------- */

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const whole = Math.floor(seconds)
  const minutes = Math.floor(whole / 60)
  const secs = whole % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function formatTrackDuration(seconds: number): string {
  return seconds > 0 ? formatTime(seconds) : '--:--'
}

function showNotice(message: string): void {
  notice.value = message
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => (notice.value = null), 4500)
}

/* ------------------------------ Import -------------------------------- */

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
      // Ask iOS/Safari not to evict the library under storage pressure.
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
  } catch (error) {
    console.error('[Pulse] Delete failed:', error)
    showNotice('Could not delete this track.')
  }
}

/* ------------------------------ Scrubber ------------------------------ */

const scrubbing = ref(false)
const scrubValue = ref(0)

const displayTime = computed(() => (scrubbing.value ? scrubValue.value : currentTime.value))
const progressPercent = computed(() =>
  duration.value > 0 ? Math.min(100, (displayTime.value / duration.value) * 100) : 0,
)

function onScrubInput(event: Event): void {
  scrubbing.value = true
  scrubValue.value = (event.target as HTMLInputElement).valueAsNumber
}

function onScrubCommit(event: Event): void {
  player.seek((event.target as HTMLInputElement).valueAsNumber)
  scrubbing.value = false
}

/* ------------------------------ Bottom sheet -------------------------- */

const sleepOpen = ref(false)
const sheetOpen = computed(() => playlistOpen.value || sleepOpen.value)

function openPlaylist(): void {
  sleepOpen.value = false
  playlistOpen.value = true
}

function openSleep(): void {
  playlistOpen.value = false
  sleepOpen.value = true
}

function closeSheets(): void {
  playlistOpen.value = false
  sleepOpen.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeSheets()
}

watch(sheetOpen, (open) => {
  document.documentElement.style.overflow = open ? 'hidden' : ''
})

/* ------------------------------ Sleep timer --------------------------- */

const sleepLabel = computed(() => {
  if (sleep.selection.value === 'track') return 'End of track'
  if (sleep.selection.value !== null) return formatTime(sleep.remainingSeconds.value)
  return 'Sleep'
})

function chooseSleepMinutes(minutes: number): void {
  sleep.startMinutes(minutes)
  closeSheets()
  showNotice(`Sleep timer set for ${minutes} min`)
}

function chooseSleepEndOfTrack(): void {
  sleep.startEndOfTrack()
  closeSheets()
  showNotice('Playback will stop when this track ends')
}

function turnOffSleep(): void {
  sleep.cancel()
  closeSheets()
  showNotice('Sleep timer turned off')
}

watch(sleep.firedCount, () => showNotice('Sleep timer ended. Playback paused.'))

/* ------------------------------ Lifecycle ----------------------------- */

onMounted(async () => {
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
    class="relative isolate flex h-dvh select-none flex-col overflow-hidden overscroll-none bg-zinc-950 pb-[max(env(safe-area-inset-bottom),0.75rem)] text-zinc-100"
  >
    <!-- Ambient artwork glow (centered behind the album card so the top status bar / notch remains crisp & dark) -->
    <img
      v-if="currentTrack"
      :src="currentTrack.coverUrl"
      alt=""
      aria-hidden="true"
      class="pointer-events-none absolute top-[36%] left-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
    />

    <!-- Header: comfortable top spacing for iPhone Dynamic Island / notch -->
    <header class="flex items-center justify-between gap-3 px-5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-2.5">
      <div class="flex items-center gap-2.5">
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/30">
          <AudioLines :size="20" :stroke-width="2.5" aria-hidden="true" />
        </div>
        <h1 class="text-xl font-bold tracking-tight">Pulse</h1>
      </div>

      <div class="flex items-center gap-2">
        <span
          class="flex items-center gap-1.5 rounded-full bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 ring-1 ring-zinc-800"
          :aria-label="`${localCount} local ${localCount === 1 ? 'track' : 'tracks'} stored offline`"
        >
          <HardDrive :size="13" aria-hidden="true" />
          {{ localCount }} local
        </span>
        <button
          type="button"
          class="flex min-h-9 items-center gap-1 rounded-full bg-indigo-500 px-3.5 py-1.5 text-sm font-semibold text-white transition active:scale-95 active:bg-indigo-600 disabled:opacity-60"
          :disabled="isImporting"
          @click="openFilePicker"
        >
          <Plus :size="16" :stroke-width="3" aria-hidden="true" />
          {{ isImporting ? 'Importing…' : 'Import MP3s' }}
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="audio/*,.mp3,.m4a,.wav"
          multiple
          class="hidden"
          @change="onFilesSelected"
        />
      </div>
    </header>

    <!-- Notices -->
    <div class="min-h-6 px-5 text-center text-xs" aria-live="polite" role="status">
      <p v-if="notice" class="rounded-lg bg-zinc-900 px-3 py-1.5 text-zinc-200 ring-1 ring-zinc-800">{{ notice }}</p>
      <p v-else-if="playbackError" class="rounded-lg bg-red-950/60 px-3 py-1.5 text-red-300 ring-1 ring-red-900">
        {{ playbackError }}
      </p>
    </div>

    <!-- Now Playing -->
    <main class="flex min-h-0 flex-1 flex-col justify-between px-7 pb-3">
      <section class="flex min-h-0 flex-1 items-center justify-center py-2" aria-label="Album artwork">
        <div
          class="aspect-square w-[min(76vw,21rem)] overflow-hidden rounded-3xl bg-zinc-900 ring-1 ring-white/10 transition-all duration-500 ease-out motion-reduce:transition-none"
          :class="isPlaying ? 'scale-100 shadow-2xl shadow-indigo-500/25' : 'scale-[0.84] shadow-lg shadow-black/50'"
        >
          <img
            v-if="currentTrack"
            :src="currentTrack.coverUrl"
            :alt="`Artwork for ${currentTrack.title}`"
            class="h-full w-full object-cover"
            draggable="false"
          />
          <button
            v-else
            type="button"
            class="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-zinc-500 transition active:bg-zinc-800"
            :disabled="isImporting"
            @click="openFilePicker"
          >
            <AudioLines :size="72" aria-hidden="true" />
            <span class="text-sm font-semibold text-zinc-300">Your library is empty</span>
            <span class="text-xs">Tap to import MP3, M4A or WAV files</span>
          </button>
        </div>
      </section>

      <section class="shrink-0">
        <div class="min-w-0">
          <MarqueeText :text="currentTrack?.title ?? 'Nothing playing'" class="text-xl font-bold" />
          <MarqueeText
            :text="currentTrack?.artist ?? 'Import music to get started'"
            class="mt-0.5 text-base text-zinc-400"
          />
        </div>

        <!-- Scrubber -->
        <div class="mt-3">
          <label for="scrubber" class="sr-only">Seek</label>
          <input
            id="scrubber"
            type="range"
            class="pulse-range"
            min="0"
            :max="duration > 0 ? duration : 0"
            step="0.1"
            :value="displayTime"
            :disabled="!currentTrack || duration <= 0"
            :style="{ '--slider-progress': `${progressPercent}%` }"
            :aria-valuetext="`${formatTime(displayTime)} of ${formatTime(duration)}`"
            @input="onScrubInput"
            @change="onScrubCommit"
          />
          <div class="-mt-1 flex justify-between text-xs tabular-nums text-zinc-400">
            <span>{{ formatTime(displayTime) }}</span>
            <span>{{ formatTime(duration) }}</span>
          </div>
        </div>

        <!-- Transport -->
        <div class="mt-3 flex items-center justify-between">
          <button
            type="button"
            class="relative flex h-12 w-12 items-center justify-center rounded-full transition active:scale-90"
            :class="isShuffle ? 'text-indigo-400' : 'text-zinc-500'"
            :aria-pressed="isShuffle"
            aria-label="Shuffle"
            @click="player.toggleShuffle()"
          >
            <Shuffle :size="22" aria-hidden="true" />
            <span v-if="isShuffle" class="absolute bottom-1.5 h-1 w-1 rounded-full bg-indigo-400"></span>
          </button>

          <button
            type="button"
            class="flex h-14 w-14 items-center justify-center rounded-full transition active:scale-90 active:text-zinc-400"
            aria-label="Previous track"
            :disabled="!currentTrack"
            @click="player.previous()"
          >
            <SkipBack :size="30" fill="currentColor" aria-hidden="true" />
          </button>

          <button
            type="button"
            class="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-zinc-100 text-zinc-950 shadow-lg shadow-black/40 transition active:scale-90"
            :aria-label="isPlaying ? 'Pause' : 'Play'"
            :disabled="!currentTrack"
            @click="player.togglePlay()"
          >
            <Pause v-if="isPlaying" :size="34" fill="currentColor" aria-hidden="true" />
            <Play v-else :size="34" fill="currentColor" class="translate-x-0.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            class="flex h-14 w-14 items-center justify-center rounded-full transition active:scale-90 active:text-zinc-400"
            aria-label="Next track"
            :disabled="!currentTrack"
            @click="player.next()"
          >
            <SkipForward :size="30" fill="currentColor" aria-hidden="true" />
          </button>

          <button
            type="button"
            class="relative flex h-12 w-12 items-center justify-center rounded-full transition active:scale-90"
            :class="repeatMode === 'off' ? 'text-zinc-500' : 'text-indigo-400'"
            :aria-label="`Repeat: ${repeatMode}`"
            @click="player.cycleRepeat()"
          >
            <Repeat1 v-if="repeatMode === 'one'" :size="22" aria-hidden="true" />
            <Repeat v-else :size="22" aria-hidden="true" />
            <span v-if="repeatMode !== 'off'" class="absolute bottom-1.5 h-1 w-1 rounded-full bg-indigo-400"></span>
          </button>
        </div>

        <!-- Quick 10-Second Jump Controls -->
        <div class="mt-2.5 mb-1 flex items-center justify-center gap-6">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full bg-zinc-900/70 px-4 py-1.5 text-xs font-semibold text-zinc-300 ring-1 ring-zinc-800 transition active:scale-90 active:bg-zinc-800 active:text-white disabled:opacity-40"
            :disabled="!currentTrack"
            aria-label="Rewind 10 seconds"
            @click="player.seekBy(-10)"
          >
            <RotateCcw :size="15" aria-hidden="true" />
            <span>-10s</span>
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full bg-zinc-900/70 px-4 py-1.5 text-xs font-semibold text-zinc-300 ring-1 ring-zinc-800 transition active:scale-90 active:bg-zinc-800 active:text-white disabled:opacity-40"
            :disabled="!currentTrack"
            aria-label="Forward 10 seconds"
            @click="player.seekBy(10)"
          >
            <span>+10s</span>
            <RotateCw :size="15" aria-hidden="true" />
          </button>
        </div>

        <!-- Tiny Clean Queue & Sleep Handles -->
        <div class="mt-2 flex items-center justify-center gap-2.5 pb-1">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-zinc-400 ring-1 ring-zinc-800/80 transition active:scale-95 active:bg-zinc-800 active:text-zinc-200"
            aria-haspopup="dialog"
            :aria-expanded="playlistOpen"
            @click="openPlaylist"
          >
            <ListMusic :size="13" aria-hidden="true" />
            <span>Up Next · {{ tracks.length }}</span>
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium tabular-nums ring-1 transition active:scale-95 active:bg-zinc-800"
            :class="
              sleep.isActive.value
                ? 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/40'
                : 'bg-zinc-900/60 text-zinc-400 ring-zinc-800/80'
            "
            aria-haspopup="dialog"
            :aria-expanded="sleepOpen"
            :aria-label="sleep.isActive.value ? `Sleep timer: ${sleepLabel}` : 'Sleep timer'"
            @click="openSleep"
          >
            <Moon :size="13" :fill="sleep.isActive.value ? 'currentColor' : 'none'" aria-hidden="true" />
            <span>{{ sleepLabel }}</span>
          </button>
        </div>
      </section>
    </main>

    <!-- Playlist backdrop -->
    <div
      class="fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 motion-reduce:transition-none"
      :class="sheetOpen ? 'opacity-100' : 'pointer-events-none opacity-0'"
      aria-hidden="true"
      @click="closeSheets"
    ></div>

    <!-- Sleep timer bottom sheet -->
    <aside
      class="fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-3xl bg-zinc-900 pb-[env(safe-area-inset-bottom)] shadow-2xl ring-1 ring-white/10 transition-transform duration-300 ease-out motion-reduce:transition-none"
      :class="sleepOpen ? 'translate-y-0' : 'translate-y-full'"
      :inert="sleepOpen ? undefined : true"
      role="dialog"
      aria-label="Sleep timer"
    >
      <div class="flex items-center justify-between px-5 pt-3 pb-2">
        <div>
          <div class="mb-2 h-1 w-10 rounded-full bg-zinc-700"></div>
          <h2 class="text-lg font-bold">Sleep Timer</h2>
        </div>
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 transition active:scale-90"
          aria-label="Close sleep timer"
          @click="closeSheets"
        >
          <ChevronDown :size="22" aria-hidden="true" />
        </button>
      </div>

      <ul class="px-2 pb-2" aria-label="Sleep timer options">
        <li v-for="minutes in SLEEP_MINUTE_OPTIONS" :key="minutes">
          <button
            type="button"
            class="flex min-h-12 w-full items-center justify-between rounded-2xl px-3.5 text-left text-[15px] font-semibold transition active:bg-zinc-800"
            :class="sleep.selection.value === minutes ? 'text-indigo-400' : 'text-zinc-100'"
            @click="chooseSleepMinutes(minutes)"
          >
            {{ minutes }} minutes
            <Check v-if="sleep.selection.value === minutes" :size="18" aria-hidden="true" />
          </button>
        </li>
        <li>
          <button
            type="button"
            class="flex min-h-12 w-full items-center justify-between rounded-2xl px-3.5 text-left text-[15px] font-semibold transition active:bg-zinc-800"
            :class="sleep.selection.value === 'track' ? 'text-indigo-400' : 'text-zinc-100'"
            @click="chooseSleepEndOfTrack"
          >
            End of current track
            <Check v-if="sleep.selection.value === 'track'" :size="18" aria-hidden="true" />
          </button>
        </li>
        <li v-if="sleep.isActive.value">
          <button
            type="button"
            class="mt-1 flex min-h-12 w-full items-center rounded-2xl px-3.5 text-left text-[15px] font-semibold text-red-400 transition active:bg-zinc-800"
            @click="turnOffSleep"
          >
            Turn off timer
          </button>
        </li>
      </ul>
    </aside>

    <!-- Playlist bottom sheet -->
    <aside
      class="fixed inset-x-0 bottom-0 z-40 flex h-[78dvh] flex-col rounded-t-3xl bg-zinc-900 pb-[env(safe-area-inset-bottom)] shadow-2xl ring-1 ring-white/10 transition-transform duration-300 ease-out motion-reduce:transition-none"
      :class="playlistOpen ? 'translate-y-0' : 'translate-y-full'"
      :inert="playlistOpen ? undefined : true"
      role="dialog"
      aria-label="Playlist"
    >
      <div class="flex items-center justify-between px-5 pt-3 pb-2">
        <div>
          <div class="mx-auto mb-2 h-1 w-10 rounded-full bg-zinc-700"></div>
          <h2 class="text-lg font-bold">Up Next</h2>
        </div>
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 transition active:scale-90"
          aria-label="Close playlist"
          @click="playlistOpen = false"
        >
          <ChevronDown :size="22" aria-hidden="true" />
        </button>
      </div>

      <div
        v-if="tracks.length === 0"
        class="flex flex-1 flex-col items-center justify-center gap-3 px-8 pb-10 text-center"
      >
        <ListMusic :size="40" class="text-zinc-600" aria-hidden="true" />
        <p class="text-sm text-zinc-400">Your library is empty. Import audio files to build an offline library.</p>
      </div>

      <ul v-else class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3" aria-label="Tracks">
        <li
          v-for="track in tracks"
          :key="track.id"
          class="flex items-center gap-1 rounded-2xl"
          :class="currentTrack?.id === track.id ? 'bg-indigo-500/10' : ''"
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-2.5 text-left transition active:bg-zinc-800"
            :aria-current="currentTrack?.id === track.id ? 'true' : undefined"
            @click="player.selectTrack(track)"
          >
            <div class="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
              <img :src="track.coverUrl" alt="" class="h-full w-full object-cover" draggable="false" />
              <div
                v-if="currentTrack?.id === track.id"
                class="absolute inset-0 flex items-end justify-center gap-0.5 bg-black/50 pb-2.5"
                aria-hidden="true"
              >
                <span
                  v-for="n in 3"
                  :key="n"
                  class="animate-eq h-4 w-1 origin-bottom rounded-full bg-indigo-400"
                  :style="{ animationDelay: `${n * 0.15}s`, animationPlayState: isPlaying ? 'running' : 'paused' }"
                ></span>
              </div>
            </div>

            <div class="min-w-0 flex-1">
              <p
                class="truncate text-[15px] font-semibold"
                :class="currentTrack?.id === track.id ? 'text-indigo-400' : 'text-zinc-100'"
              >
                {{ track.title }}
              </p>
              <p class="truncate text-sm text-zinc-400">{{ track.artist }}</p>
            </div>

            <div class="flex shrink-0 flex-col items-end gap-1">
              <span class="text-xs tabular-nums text-zinc-400">{{ formatTrackDuration(track.duration) }}</span>
              <span
                class="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                :class="track.kind === 'local' ? 'bg-indigo-500/15 text-indigo-300' : 'bg-zinc-800 text-zinc-400'"
              >
                <HardDrive v-if="track.kind === 'local'" :size="10" aria-hidden="true" />
                <Cloud v-else :size="10" aria-hidden="true" />
                {{ track.kind === 'local' ? 'Local' : 'Stream' }}
              </span>
            </div>
          </button>

          <button
            v-if="track.kind === 'local'"
            type="button"
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-400 transition active:scale-90 active:bg-red-500/15 active:text-red-400"
            :aria-label="`Delete ${track.title}`"
            @click="removeTrack(track.id, track.title)"
          >
            <Trash2 :size="18" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </aside>
  </div>
</template>

