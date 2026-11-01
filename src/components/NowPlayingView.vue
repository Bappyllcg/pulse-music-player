<script setup lang="ts">
import {
  AudioLines,
  ChevronLeft,
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
} from 'lucide-vue-next'
import MarqueeText from './MarqueeText.vue'
import WaveformScrubber from './WaveformScrubber.vue'
import type { PlayableTrack, RepeatMode } from '../types/music'

defineProps<{
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
}>()
</script>

<template>
  <div
    class="now-playing-view flex h-full flex-col justify-between px-6 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]"
  >
    <!-- Top Navigation Bar -->
    <header class="flex items-center justify-between py-2">
      <button
        type="button"
        class="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 ring-1 ring-white/10 backdrop-blur-md transition active:scale-90 hover:text-white"
        aria-label="Back to library"
        @click="emit('back')"
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
          @click="emit('openQueue')"
        >
          <ListMusic :size="15" />
          <span>Up Next</span>
        </button>

        <!-- Sleep Timer button -->
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 backdrop-blur-md"
          :class="
            isSleepActive
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
              : 'bg-zinc-900/80 text-zinc-300 ring-1 ring-white/10 hover:text-white'
          "
          aria-label="Open sleep timer"
          @click="emit('openSleep')"
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
          @click="emit('previous')"
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

        <!-- Right Peek Artwork (Next Track) -->
        <div
          v-if="nextTrack"
          class="absolute -right-3 z-0 h-44 w-12 cursor-pointer overflow-hidden rounded-2xl opacity-30 blur-[1px] transition-all duration-300 active:scale-95"
          aria-label="Next track artwork"
          @click="emit('next')"
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
          :class="isLiked ? 'text-rose-500 ring-rose-500/30' : 'text-zinc-400'"
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
          @click="emit('toggleShuffle')"
        >
          <Shuffle :size="19" stroke-width="2" />
        </button>

        <!-- 10s Backward Skip with "10" inside -->
        <button
          type="button"
          class="relative flex h-11 w-11 items-center justify-center rounded-full text-zinc-400 transition-all duration-200 hover:text-zinc-200 hover:bg-white/[0.05] active:scale-90"
          aria-label="Rewind 10 seconds"
          @click="emit('seekBy', -10)"
        >
          <RotateCcw :size="23" stroke-width="1.75" />
          <span class="absolute text-[9px] font-black tracking-tighter">10</span>
        </button>

        <!-- Previous Track -->
        <button
          type="button"
          class="flex h-12 w-12 items-center justify-center rounded-full text-zinc-300 transition-all duration-200 hover:text-white hover:bg-white/[0.06] active:scale-90"
          aria-label="Previous track"
          @click="emit('previous')"
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
            class="now-playing-play-btn relative flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white text-zinc-950 shadow-[0_12px_36px_rgba(255,255,255,0.25)] ring-4 ring-white/15 transition-all duration-200 active:scale-95 hover:scale-105 hover:bg-zinc-100 focus:outline-none"
            :aria-label="isPlaying ? 'Pause' : 'Play'"
            @click="emit('togglePlay')"
          >
            <!-- Dual-pill sleek pause bars -->
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
          @click="emit('next')"
        >
          <SkipForward :size="24" class="fill-current" />
        </button>

        <!-- 10s Forward Skip with "10" inside -->
        <button
          type="button"
          class="relative flex h-11 w-11 items-center justify-center rounded-full text-zinc-400 transition-all duration-200 hover:text-zinc-200 hover:bg-white/[0.05] active:scale-90"
          aria-label="Forward 10 seconds"
          @click="emit('seekBy', 10)"
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
          @click="emit('cycleRepeat')"
        >
          <Repeat1 v-if="repeatMode === 'one'" :size="18" stroke-width="2.2" />
          <Repeat v-else :size="18" stroke-width="2" />
        </button>
      </div>
    </section>
  </div>
</template>

