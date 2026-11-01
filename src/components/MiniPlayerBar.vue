<script setup lang="ts">
import { Heart, Maximize2, Play } from 'lucide-vue-next'
import type { PlayableTrack } from '../types/music'

defineProps<{
  currentTrack: PlayableTrack
  isPlaying: boolean
  progressPercent: number
  isLiked: boolean
}>()

const emit = defineEmits<{
  (e: 'togglePlay'): void
  (e: 'toggleLike', id: string): void
  (e: 'expand'): void
}>()
</script>

<template>
  <div class="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] z-30">
    <div
      class="mini-player-bar relative flex flex-col overflow-hidden rounded-2xl bg-zinc-900/95 p-2 shadow-2xl ring-1 ring-white/15 backdrop-blur-xl transition active:scale-[0.99]"
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
          @click="emit('expand')"
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
            :class="{ 'text-rose-500': isLiked }"
            :aria-label="isLiked ? 'Unlike' : 'Like'"
            @click.stop="emit('toggleLike', currentTrack.id)"
          >
            <Heart :size="16" :fill="isLiked ? 'currentColor' : 'none'" />
          </button>

          <!-- Play / Pause in mini player -->
          <button
            type="button"
            class="mini-player-play-btn flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-950 shadow-md transition active:scale-90 hover:bg-zinc-100"
            :aria-label="isPlaying ? 'Pause' : 'Play'"
            @click.stop="emit('togglePlay')"
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
            @click="emit('expand')"
          >
            <Maximize2 :size="14" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

