<script setup lang="ts">
import { ChevronUp, Heart, Play } from 'lucide-vue-next'
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
  <div
    class="absolute inset-x-3 z-20 mx-auto max-w-lg pointer-events-auto"
    style="bottom: calc(max(env(safe-area-inset-bottom, 0px), 8px) + 3.25rem);"
  >
    <div
      class="glass-mini-player relative flex flex-col overflow-hidden rounded-2xl p-2.5 shadow-2xl transition-all duration-200 active:scale-[0.99] cursor-pointer"
      @click="emit('expand')"
    >
      <!-- Top subtle hairline progress bar -->
      <div class="absolute inset-x-0 top-0 h-[2.5px] bg-slate-200/80 dark:bg-white/[0.08]">
        <div
          class="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-300 transition-all duration-150 shadow-[0_0_8px_rgba(99,102,241,0.6)]"
          :style="{ width: `${progressPercent}%` }"
        ></div>
      </div>

      <div class="flex items-center justify-between pt-0.5">
        <!-- Left Thumbnail & Meta -->
        <div class="flex min-w-0 flex-1 items-center gap-3 pr-2">
          <div class="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200/80 shadow-md flex items-center justify-center dark:bg-zinc-950 dark:border-white/10">
            <img
              :src="currentTrack.coverUrl"
              :alt="currentTrack.title"
              class="h-full w-full object-cover"
              loading="lazy"
              @error="(e) => ((e.target as HTMLImageElement).src = './icon.svg')"
            />
            <div
              v-if="isPlaying"
              class="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[0.5px]"
            >
              <span
                v-for="n in 3"
                :key="n"
                class="animate-eq mx-[1px] h-3.5 w-0.5 rounded-full bg-indigo-400"
                :style="{ animationDelay: `${n * 0.15}s` }"
              ></span>
            </div>
          </div>

          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-bold text-slate-900 dark:text-zinc-100">
              {{ currentTrack.title }}
            </p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span
                class="shrink-0 rounded px-1.5 py-0.2 text-[9px] font-bold"
                :class="
                  currentTrack.id.startsWith('radio') || currentTrack.duration <= 0
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
                    : currentTrack.id.startsWith('jamendo')
                      ? 'bg-purple-100 text-purple-700 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30'
                      : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400'
                "
              >
                {{ currentTrack.id.startsWith('radio') || currentTrack.duration <= 0 ? 'Radio' : currentTrack.id.startsWith('jamendo') ? 'Jamendo' : 'Offline' }}
              </span>
              <p class="truncate text-[11px] text-slate-500 dark:text-zinc-400">
                {{ currentTrack.artist }}
              </p>
            </div>
          </div>
        </div>

        <!-- Right Quick Controls -->
        <div class="flex items-center gap-1.5 pl-1" @click.stop>
          <!-- Like button -->
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition active:scale-90 hover:text-rose-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.08] cursor-pointer"
            :class="{ '!text-rose-500': isLiked }"
            :aria-label="isLiked ? 'Unlike' : 'Like'"
            @click="emit('toggleLike', currentTrack.id)"
          >
            <Heart :size="16" :fill="isLiked ? 'currentColor' : 'none'" />
          </button>

          <!-- Play / Pause Hero Pill in mini player -->
          <button
            type="button"
            class="mini-player-play-btn flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90 hover:scale-105 cursor-pointer shadow-md
                   bg-slate-900 text-white hover:bg-slate-800
                   dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
            :aria-label="isPlaying ? 'Pause' : 'Play'"
            @click="emit('togglePlay')"
          >
            <div v-if="isPlaying" class="flex items-center justify-center gap-1">
              <span class="h-3.5 w-1 rounded-full bg-current"></span>
              <span class="h-3.5 w-1 rounded-full bg-current"></span>
            </div>
            <Play v-else :size="16" fill="currentColor" class="translate-x-0.5" />
          </button>

          <!-- Expand to Now Playing -->
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.08] cursor-pointer"
            aria-label="Expand player to fullscreen"
            @click="emit('expand')"
          >
            <ChevronUp :size="18" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
