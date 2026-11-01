<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ChevronDown,
  Disc3,
  Heart,
  ListMusic,
  Moon,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  RotateCw,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-vue-next'
import MarqueeText from './MarqueeText.vue'
import WaveformScrubber from './WaveformScrubber.vue'
import type { PlayableTrack, RepeatMode } from '../types/music'

const props = defineProps<{
  currentTrack: PlayableTrack | null
  prevTrack: PlayableTrack | null
  nextTrack: PlayableTrack | null
  isPlaying: boolean
  currentTime: number
  duration: number
  isShuffle: boolean
  repeatMode: RepeatMode
  isLiked: boolean
  sleepLabel: string
  isSleepActive: boolean
  activeTab: 'library' | 'player'
  volume?: number
  volumeSupported?: boolean
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'openQueue'): void
  (e: 'openSleep'): void
  (e: 'togglePlay'): void
  (e: 'toggleShuffle'): void
  (e: 'cycleRepeat'): void
  (e: 'previous'): void
  (e: 'next'): void
  (e: 'seek', seconds: number): void
  (e: 'seekBy', deltaSeconds: number): void
  (e: 'toggleLike', id: string): void
  (e: 'setVolume', val: number): void
}>()

/* Swipe-to-dismiss gesture for iOS bottom sheet feel */
const dragOffsetY = ref(0)
const isDraggingView = ref(false)
let touchStartY = 0
let lastNonZeroVolume = 1

function onTouchStart(e: TouchEvent): void {
  const target = e.target as HTMLElement | null
  if (target && target.closest('[role="slider"], input[type="range"]')) {
    isDraggingView.value = false
    return
  }
  touchStartY = e.touches[0].clientY
  isDraggingView.value = true
}

function onTouchMove(e: TouchEvent): void {
  if (!isDraggingView.value) return
  const deltaY = e.touches[0].clientY - touchStartY
  // Only allow downward dragging
  dragOffsetY.value = deltaY > 0 ? deltaY : 0
}

function onTouchEnd(): void {
  if (!isDraggingView.value) return
  isDraggingView.value = false
  if (dragOffsetY.value > 90) {
    emit('back')
  }
  dragOffsetY.value = 0
}

const currentSourceLabel = computed(() => {
  if (!props.currentTrack) return 'Pulse Player'
  if (props.currentTrack.id.startsWith('radio') || props.currentTrack.duration <= 0) return 'Live Radio'
  if (props.currentTrack.id.startsWith('jamendo')) return 'Jamendo Music'
  return 'Offline Library'
})

function toggleMute(): void {
  if (typeof props.volume === 'number') {
    if (props.volume > 0) {
      lastNonZeroVolume = props.volume
      emit('setVolume', 0)
    } else {
      emit('setVolume', lastNonZeroVolume > 0 ? lastNonZeroVolume : 1)
    }
  }
}

function onVolumeChange(val: number): void {
  if (val > 0) {
    lastNonZeroVolume = val
  }
  emit('setVolume', val)
}
</script>

<template>
  <div
    class="now-playing-view relative flex h-full flex-col justify-between overflow-hidden px-6 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] select-none transition-transform duration-200 ease-out
           bg-slate-50 dark:bg-[#08080c] text-slate-900 dark:text-zinc-100"
    :style="dragOffsetY > 0 ? { transform: `translateY(${dragOffsetY}px)`, opacity: Math.max(0.6, 1 - dragOffsetY / 300) } : {}"
    @touchstart="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
  >
    <!-- Background Ambient Lighting / Mesh Aura that breathes with playback -->
    <div
      v-if="currentTrack"
      class="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div
        class="absolute -top-1/4 -left-1/4 h-[90vw] w-[90vw] rounded-full blur-[110px] transition-all duration-1000"
        :class="
          currentTrack.id.startsWith('radio') || currentTrack.duration <= 0
            ? 'bg-rose-500/15 dark:bg-rose-600/25'
            : currentTrack.id.startsWith('jamendo')
              ? 'bg-purple-500/15 dark:bg-purple-600/25'
              : 'bg-indigo-500/15 dark:bg-indigo-600/25'
        "
        :style="{ transform: isPlaying ? 'scale(1.15)' : 'scale(0.9)' }"
      ></div>
      <div
        class="absolute -bottom-1/4 -right-1/4 h-[80vw] w-[80vw] rounded-full blur-[100px] transition-all duration-1000"
        :class="
          currentTrack.id.startsWith('radio') || currentTrack.duration <= 0
            ? 'bg-amber-500/10 dark:bg-amber-600/20'
            : 'bg-blue-500/10 dark:bg-blue-600/20'
        "
        :style="{ transform: isPlaying ? 'scale(1.1)' : 'scale(0.85)' }"
      ></div>
    </div>

    <!-- Top Navigation & Drag Bar -->
    <header class="flex flex-col gap-2 shrink-0">
      <!-- Swipe Down Indicator Bar -->
      <div class="mx-auto h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20 transition hover:bg-slate-400 dark:hover:bg-white/40 cursor-grab"></div>

      <div class="flex items-center justify-between py-1">
        <!-- Dismiss Button -->
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full border transition active:scale-90 cursor-pointer
                 bg-white/90 text-slate-700 border-slate-200/90 shadow-sm hover:text-slate-900 hover:bg-slate-50
                 dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-white/10 dark:hover:text-white"
          aria-label="Back to library"
          @click="emit('back')"
        >
          <ChevronDown :size="22" aria-hidden="true" />
        </button>

        <!-- Center Context Info -->
        <div class="flex flex-col items-center">
          <span class="text-[10px] font-bold tracking-widest text-slate-600 dark:text-zinc-400 uppercase">
            PLAYING FROM
          </span>
          <span class="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
            {{ currentSourceLabel }}
          </span>
        </div>

        <!-- Top Right Actions: Queue & Sleep Timer -->
        <div class="flex items-center gap-2">
          <!-- Up Next Queue -->
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer
                   bg-white/90 text-slate-700 border-slate-200/90 shadow-sm hover:text-slate-900 hover:bg-slate-50
                   dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-white/10 dark:hover:text-white"
            aria-label="Open queue"
            @click="emit('openQueue')"
          >
            <ListMusic :size="15" />
            <span class="hidden sm:inline">Up Next</span>
          </button>

          <!-- Sleep Timer -->
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer border"
            :class="
              isSleepActive
                ? 'bg-indigo-600 !text-white shadow-md shadow-indigo-600/30 border-indigo-500'
                : 'bg-white/90 text-slate-700 border-slate-200/90 shadow-sm hover:text-slate-900 hover:bg-slate-50 dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-white/10 dark:hover:text-white'
            "
            aria-label="Open sleep timer"
            @click="emit('openSleep')"
          >
            <Moon :size="14" />
            <span>{{ sleepLabel }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Center Stage: Artwork Carousel Peek -->
    <section class="relative my-auto flex items-center justify-center py-4" aria-label="Album artwork">
      <div class="relative flex w-full items-center justify-center">
        <!-- Left Peek Artwork (Previous Track) -->
        <div
          v-if="prevTrack"
          class="absolute -left-2 z-0 h-44 w-12 cursor-pointer overflow-hidden rounded-2xl opacity-35 blur-[1px] transition-all duration-300 active:scale-95 hover:opacity-60"
          aria-label="Previous track artwork"
          @click="emit('previous')"
        >
          <img :src="prevTrack.coverUrl" alt="" class="h-full w-full object-cover" />
        </div>

        <!-- Center Active Artwork -->
        <div
          class="relative z-10 aspect-square w-[min(74vw,19rem)] overflow-hidden rounded-3xl border transition-all duration-500 ease-out
                 bg-white border-slate-200/90 shadow-2xl
                 dark:bg-zinc-950 dark:border-white/15"
          :class="isPlaying ? 'scale-100 shadow-[0_20px_50px_rgba(0,0,0,0.25)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]' : 'scale-[0.92] opacity-85 shadow-[0_10px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.4)]'"
        >
          <img
            v-if="currentTrack"
            :src="currentTrack.coverUrl"
            :alt="`Artwork for ${currentTrack.title}`"
            class="h-full w-full object-cover"
            draggable="false"
            @error="(e) => ((e.target as HTMLImageElement).src = './icon.svg')"
          />
          <div v-else class="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-400 dark:text-zinc-600">
            <Disc3 :size="64" class="animate-spin text-slate-500 dark:text-zinc-700" style="animation-duration: 10s;" />
            <span class="text-xs font-semibold">Select a song to play</span>
          </div>
        </div>

        <!-- Right Peek Artwork (Next Track) -->
        <div
          v-if="nextTrack"
          class="absolute -right-2 z-0 h-44 w-12 cursor-pointer overflow-hidden rounded-2xl opacity-35 blur-[1px] transition-all duration-300 active:scale-95 hover:opacity-60"
          aria-label="Next track artwork"
          @click="emit('next')"
        >
          <img :src="nextTrack.coverUrl" alt="" class="h-full w-full object-cover" />
        </div>
      </div>
    </section>

    <!-- Bottom Audio Controls Card -->
    <section class="shrink-0 space-y-4 pt-1">
      <!-- Title, Artist & Like Button -->
      <div class="flex items-center justify-between">
        <div class="min-w-0 flex-1 pr-3">
          <p class="truncate text-xs font-semibold text-slate-500 dark:text-zinc-400">
            {{ currentTrack?.artist ?? 'Pulse Music' }}
          </p>
          <MarqueeText
            :text="currentTrack?.title ?? 'Ready to Play'"
            :active="activeTab === 'player'"
            class="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-0.5"
          />
        </div>

        <!-- Like button -->
        <button
          v-if="currentTrack"
          type="button"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition active:scale-90 cursor-pointer
                 bg-white/90 text-slate-400 border-slate-200/90 shadow-sm hover:text-slate-800
                 dark:bg-zinc-900/80 dark:text-zinc-400 dark:border-white/10 dark:hover:text-white"
          :class="isLiked ? '!text-rose-500 border-rose-200 dark:border-rose-500/30' : ''"
          :aria-label="isLiked ? 'Unlike song' : 'Like song'"
          @click="emit('toggleLike', currentTrack.id)"
        >
          <Heart :size="20" :fill="isLiked ? 'currentColor' : 'none'" />
        </button>
      </div>

      <!-- Interactive Audio Waveform Scrubber -->
      <WaveformScrubber
        :track-id="currentTrack?.id ?? 'none'"
        :current-time="currentTime"
        :duration="duration"
        :disabled="!currentTrack || duration <= 0"
        @seek="emit('seek', $event)"
      />

      <!-- Volume Bar (if volume is supported) -->
      <div
        v-if="volumeSupported"
        class="flex items-center gap-3 px-2 py-0.5"
      >
        <button
          type="button"
          class="text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white transition active:scale-90 cursor-pointer"
          aria-label="Toggle mute"
          @click="toggleMute"
        >
          <VolumeX v-if="(volume ?? 1) === 0" :size="16" />
          <Volume2 v-else :size="16" />
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="volume ?? 1"
          class="pulse-range flex-1"
          :style="{ '--slider-progress': `${(volume ?? 1) * 100}%` }"
          aria-label="Volume level"
          @input="onVolumeChange(Number(($event.target as HTMLInputElement).value))"
        />
      </div>

      <!-- Primary Transport Controls -->
      <div class="flex items-center justify-between px-1 py-2">
        <!-- Shuffle Button -->
        <button
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 active:scale-90 cursor-pointer"
          :class="
            isShuffle
              ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-xs dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/40'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-white/[0.05]'
          "
          :aria-label="isShuffle ? 'Disable shuffle' : 'Enable shuffle'"
          @click="emit('toggleShuffle')"
        >
          <Shuffle :size="19" stroke-width="2" />
        </button>

        <!-- 10s Backward Skip -->
        <button
          type="button"
          :disabled="!currentTrack || duration <= 0"
          class="relative flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-white/[0.05] transition-all duration-200 active:scale-90 cursor-pointer disabled:opacity-35 disabled:pointer-events-none"
          aria-label="Rewind 10 seconds"
          @click="emit('seekBy', -10)"
        >
          <RotateCcw :size="23" stroke-width="1.75" />
          <span class="absolute text-[9px] font-black tracking-tighter">10</span>
        </button>

        <!-- Previous Track -->
        <button
          type="button"
          class="flex h-12 w-12 items-center justify-center rounded-full text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.06] transition-all duration-200 active:scale-90 cursor-pointer"
          aria-label="Previous track"
          @click="emit('previous')"
        >
          <SkipBack :size="24" class="fill-current" />
        </button>

        <!-- Main Hero Play / Pause Button with Glowing Aura -->
        <div class="relative flex items-center justify-center">
          <div
            class="pointer-events-none absolute -inset-2.5 rounded-full bg-gradient-to-r from-indigo-500/40 via-indigo-400/30 to-violet-500/40 blur-xl transition-all duration-500"
            :class="isPlaying ? 'opacity-100 scale-110' : 'opacity-0 scale-90'"
          ></div>

          <button
            type="button"
            class="now-playing-play-btn relative flex h-[72px] w-[72px] items-center justify-center rounded-full transition-all duration-200 active:scale-95 hover:scale-105 focus:outline-none cursor-pointer
                   bg-slate-900 text-white shadow-xl shadow-slate-900/25 ring-4 ring-slate-900/10 hover:bg-slate-800
                   dark:bg-white dark:text-zinc-950 dark:shadow-[0_12px_36px_rgba(255,255,255,0.25)] dark:ring-4 dark:ring-white/15 dark:hover:bg-zinc-100"
            :aria-label="isPlaying ? 'Pause' : 'Play'"
            @click="emit('togglePlay')"
          >
            <!-- Dual-pill pause bars -->
            <div v-if="isPlaying" class="flex items-center justify-center gap-2">
              <span class="h-6 w-2 rounded-full bg-current shadow-sm"></span>
              <span class="h-6 w-2 rounded-full bg-current shadow-sm"></span>
            </div>
            <!-- Play triangle centered -->
            <Play
              v-else
              :size="30"
              class="fill-current translate-x-0.5"
            />
          </button>
        </div>

        <!-- Next Track -->
        <button
          type="button"
          class="flex h-12 w-12 items-center justify-center rounded-full text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.06] transition-all duration-200 active:scale-90 cursor-pointer"
          aria-label="Next track"
          @click="emit('next')"
        >
          <SkipForward :size="24" class="fill-current" />
        </button>

        <!-- 10s Forward Skip -->
        <button
          type="button"
          :disabled="!currentTrack || duration <= 0"
          class="relative flex h-11 w-11 items-center justify-center rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-white/[0.05] transition-all duration-200 active:scale-90 cursor-pointer disabled:opacity-35 disabled:pointer-events-none"
          aria-label="Forward 10 seconds"
          @click="emit('seekBy', 10)"
        >
          <RotateCw :size="23" stroke-width="1.75" />
          <span class="absolute text-[9px] font-black tracking-tighter">10</span>
        </button>

        <!-- Repeat Mode Button -->
        <button
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 active:scale-90 cursor-pointer"
          :class="
            repeatMode !== 'off'
              ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-xs dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/40'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-white/[0.05]'
          "
          :aria-label="`Repeat mode: ${repeatMode}`"
          @click="emit('cycleRepeat')"
        >
          <Repeat1 v-if="repeatMode === 'one'" :size="18" stroke-width="2.2" />
          <Repeat v-else :size="18" stroke-width="2" />
        </button>
      </div>
    </section>
  </div>
</template>
