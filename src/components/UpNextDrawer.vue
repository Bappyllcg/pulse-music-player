<script setup lang="ts">
import { ref } from 'vue'
import {
  ChevronDown,
  Globe,
  ListMusic,
  MinusCircle,
  Plus,
} from 'lucide-vue-next'
import type { PlayableTrack } from '../types/music'

defineProps<{
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

/* ------------------------------------------------------------------ */
/* Swipe-to-Dismiss Gesture                                           */
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
</script>

<template>
  <div>
    <!-- Backdrop Overlay -->
    <div class="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
      :class="open ? 'opacity-100' : 'pointer-events-none opacity-0'" aria-hidden="true"
      @click="emit('close'); emit('update:open', false)"></div>

    <!-- Up Next Queue Drawer -->
    <aside
      class="fixed inset-x-0 bottom-0 z-50 flex h-[78dvh] flex-col rounded-t-[2.5rem] bg-zinc-900 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] shadow-2xl ring-1 ring-white/15 transition-transform duration-300 ease-out"
      :class="open ? 'translate-y-0' : 'translate-y-full'"
      :style="playlistDragOffset > 0 ? { transform: `translateY(${playlistDragOffset}px)`, transition: 'none' } : {}"
      :inert="open ? undefined : true" role="dialog" aria-label="Playlist queue">
      <div class="flex items-center justify-between px-6 pt-4 pb-2 cursor-grab active:cursor-grabbing"
        @touchstart="onPlaylistTouchStart" @touchmove="onPlaylistTouchMove" @touchend="onPlaylistTouchEnd"
        @touchcancel="onPlaylistTouchEnd">
        <div>
          <div class="mx-auto mb-2 h-1 w-10 rounded-full bg-zinc-700"></div>
          <h2 class="text-xl font-bold text-white">Up Next</h2>
        </div>
        <button type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 ring-1 ring-white/10 transition active:scale-90 hover:text-white"
          aria-label="Close playlist" @click="emit('close'); emit('update:open', false)">
          <ChevronDown :size="20" aria-hidden="true" />
        </button>
      </div>

      <!-- Empty Queue State -->
      <div v-if="queue.length === 0"
        class="flex flex-1 flex-col items-center justify-center gap-3 px-8 pb-10 text-center">
        <ListMusic :size="40" class="text-zinc-500" aria-hidden="true" />
        <p class="text-sm font-medium text-zinc-400">
          Your queue is empty. Import audio files or discover online music.
        </p>
        <div class="mt-2 flex flex-wrap items-center justify-center gap-2.5">
          <button type="button"
            class="flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/20 transition active:scale-95 hover:bg-indigo-500"
            @click="emit('importAudio')">
            <Plus :size="14" />
            <span>Import Audio</span>
          </button>
          <button type="button"
            class="flex items-center gap-1.5 rounded-full bg-zinc-800 text-zinc-200 ring-1 ring-white/10 hover:bg-zinc-700 hover:text-white px-4 py-2 text-xs font-semibold transition active:scale-95"
            @click="emit('discoverOnline')">
            <Globe :size="14" class="text-indigo-400" />
            <span>Online Music</span>
          </button>
        </div>
      </div>

      <!-- Queue List -->
      <ul v-else class="min-h-0 flex-1 overflow-y-auto px-4 pb-4 space-y-1.5" aria-label="Queued tracks">
        <li v-for="track in queue" :key="track.id"
          class="flex items-center justify-between rounded-2xl p-2.5 transition active:bg-zinc-800/80"
          :class="currentTrack?.id === track.id ? 'bg-indigo-950/40 ring-1 ring-indigo-500/30' : 'bg-zinc-800/40'">
          <button type="button" class="flex min-w-0 flex-1 items-center gap-3 text-left"
            @click="emit('selectTrack', track)">
            <div class="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
              <img :src="track.coverUrl" alt="" class="h-full w-full object-cover" />
              <div v-if="currentTrack?.id === track.id"
                class="absolute inset-0 flex items-center justify-center bg-black/40">
                <span v-for="n in 3" :key="n" class="animate-eq mx-[1px] h-3 w-0.5 rounded-full bg-indigo-400"
                  :style="{ animationDelay: `${n * 0.15}s` }"></span>
              </div>
            </div>

            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold"
                :class="currentTrack?.id === track.id ? 'text-indigo-300' : 'text-zinc-100'">
                {{ track.title }}
              </p>
              <p class="truncate text-xs text-zinc-400">{{ track.artist }}</p>
            </div>
          </button>

          <div class="flex items-center gap-2 pl-2">
            <span class="text-xs tabular-nums text-zinc-500">{{ formatTrackDuration(track.duration) }}</span>
            <button v-if="track.kind === 'local'" type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition active:scale-90 active:text-zinc-200 hover:text-zinc-300"
              :aria-label="`Remove ${track.title} from playlist`" title="Remove from playlist"
              @click="emit('removeTrack', track.id, track.title)">
              <MinusCircle :size="16" />
            </button>
          </div>
        </li>
      </ul>
    </aside>
  </div>
</template>
