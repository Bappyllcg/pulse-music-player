<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ChevronDown,
  Compass,
  FolderPlus,
  ListMusic,
  Trash2,
} from 'lucide-vue-next'
import type { PlayableTrack } from '../types/music'

const props = defineProps<{
  open: boolean
  queue: PlayableTrack[]
  currentTrack: PlayableTrack | null
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'close'): void
  (e: 'selectTrack', track: PlayableTrack): void
  (e: 'removeTrack', id: string, title: string): void
  (e: 'importAudio'): void
  (e: 'discoverOnline'): void
}>()

/* Swipe-to-Dismiss Gesture */
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
    emit('close')
    emit('update:open', false)
  }
  playlistDragOffset.value = 0
}

function formatTrackDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--'
  const whole = Math.floor(seconds)
  const mins = Math.floor(whole / 60)
  const secs = whole % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const totalQueueTime = computed(() => {
  const total = props.queue.reduce((acc, t) => acc + (t.duration || 0), 0)
  if (total <= 0) return ''
  const m = Math.floor(total / 60)
  return `${m} min`
})
</script>

<template>
  <div>
    <!-- Backdrop Overlay -->
    <div
      class="fixed inset-0 z-40 bg-black/75 backdrop-blur-md transition-opacity duration-300"
      :class="open ? 'opacity-100' : 'pointer-events-none opacity-0'"
      aria-hidden="true"
      @click="emit('close'); emit('update:open', false)"
    ></div>

    <!-- Up Next Queue Drawer Sheet -->
    <aside
      class="fixed inset-x-0 bottom-0 z-50 flex h-[80dvh] flex-col rounded-t-[2.5rem] border pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] shadow-2xl backdrop-blur-2xl transition-transform duration-300 ease-out
             bg-white border-slate-200 text-slate-900
             dark:bg-zinc-900/95 dark:border-white/15 dark:text-zinc-100"
      :class="open ? 'translate-y-0' : 'translate-y-full'"
      :style="playlistDragOffset > 0 ? { transform: `translateY(${playlistDragOffset}px)`, transition: 'none' } : {}"
      :inert="open ? undefined : true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upnext-queue-title"
      @touchstart="onPlaylistTouchStart"
      @touchmove="onPlaylistTouchMove"
      @touchend="onPlaylistTouchEnd"
    >
      <!-- Drag Handle -->
      <div class="flex justify-center pt-3 pb-1 cursor-grab">
        <div class="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-zinc-700/80 transition hover:bg-slate-400 dark:hover:bg-zinc-500"></div>
      </div>

      <!-- Header with Meta & Actions -->
      <div class="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.08] px-6 py-3">
        <div class="flex items-center gap-2.5">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-600/20 dark:text-indigo-400 dark:border-indigo-500/30">
            <ListMusic :size="18" />
          </div>
          <div>
            <h2 id="upnext-queue-title" class="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Up Next Queue
            </h2>
            <p class="text-xs text-slate-500 dark:text-zinc-400">
              {{ queue.length }} {{ queue.length === 1 ? 'song' : 'songs' }}
              <span v-if="totalQueueTime"> • {{ totalQueueTime }}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full border transition active:scale-90 cursor-pointer
                 bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-800
                 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10 dark:hover:bg-zinc-700 dark:hover:text-white"
          aria-label="Close queue"
          @click="emit('close'); emit('update:open', false)"
        >
          <ChevronDown :size="18" />
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-if="queue.length === 0"
        class="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-white/10">
          <ListMusic :size="28" />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-bold text-slate-800 dark:text-zinc-200">The playback queue is empty</p>
          <p class="text-xs text-slate-500 dark:text-zinc-400">Select any song from your library or explore free online music to build your queue.</p>
        </div>

        <div class="flex items-center gap-2 pt-2">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold !text-white shadow-md transition active:scale-95 hover:bg-indigo-500 cursor-pointer"
            @click="emit('importAudio')"
          >
            <FolderPlus :size="14" />
            <span>Add Music</span>
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition active:scale-95 cursor-pointer
                   bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200
                   dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10 dark:hover:bg-zinc-700"
            @click="emit('discoverOnline')"
          >
            <Compass :size="14" />
            <span>Discover Online</span>
          </button>
        </div>
      </div>

      <!-- Queue Track Items List -->
      <div v-else class="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
        <div
          v-for="(track, index) in queue"
          :key="track.id"
          class="group flex items-center justify-between rounded-2xl p-2 border transition-all duration-150 active:scale-[0.99] cursor-pointer"
          :class="
            currentTrack?.id === track.id
              ? 'bg-indigo-50 border-indigo-200 shadow-sm dark:bg-indigo-950/40 dark:border-indigo-500/40 dark:shadow-indigo-950/20'
              : 'bg-white/80 border-slate-200/80 hover:bg-slate-50/90 dark:bg-zinc-900/40 dark:border-white/[0.04] dark:hover:bg-zinc-800/60'
          "
          @click="emit('selectTrack', track)"
        >
          <div class="flex min-w-0 flex-1 items-center gap-3 pr-2">
            <!-- Order index / Equalizer -->
            <div class="flex h-10 w-7 shrink-0 items-center justify-center">
              <div
                v-if="currentTrack?.id === track.id"
                class="flex items-center justify-center gap-0.5"
              >
                <span
                  v-for="n in 3"
                  :key="n"
                  class="animate-eq h-3 w-0.5 rounded-full bg-indigo-600 dark:bg-indigo-400"
                  :style="{ animationDelay: `${n * 0.15}s` }"
                ></span>
              </div>
              <span v-else class="font-mono text-xs font-semibold text-slate-400 dark:text-zinc-500">
                {{ index + 1 }}
              </span>
            </div>

            <!-- Artwork -->
            <div class="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200/80 dark:bg-zinc-950 dark:border-white/10">
              <img
                :src="track.coverUrl"
                alt=""
                class="h-full w-full object-cover"
                loading="lazy"
                @error="(e) => ((e.target as HTMLImageElement).src = './icon.svg')"
              />
            </div>

            <!-- Title & Artist -->
            <div class="min-w-0 flex-1">
              <p
                class="truncate text-xs font-bold transition-colors"
                :class="
                  currentTrack?.id === track.id
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-800 group-hover:text-indigo-600 dark:text-zinc-100 dark:group-hover:text-white'
                "
              >
                {{ track.title }}
              </p>
              <p class="truncate text-[11px] text-slate-500 dark:text-zinc-400">
                {{ track.artist }}
              </p>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <!-- Duration -->
            <span class="font-mono text-xs text-slate-500 dark:text-zinc-400">
              {{ formatTrackDuration(track.duration) }}
            </span>

            <!-- Remove Button for local tracks -->
            <button
              v-if="track.kind === 'local'"
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-500 dark:hover:text-rose-400 dark:hover:bg-zinc-800 transition active:scale-90 cursor-pointer"
              title="Remove track"
              aria-label="Remove track"
              @click.stop="emit('removeTrack', track.id, track.title)"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>
