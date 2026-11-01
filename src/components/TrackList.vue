<script setup lang="ts">
import {
  Globe,
  Heart,
  MinusCircle,
  Music,
  Pause,
  Play,
  Plus,
  X,
} from 'lucide-vue-next'
import type { PlayableTrack } from '../types/music'

defineProps<{
  tracks: PlayableTrack[]
  currentTrack: PlayableTrack | null
  isPlaying: boolean
  likedIds: Set<string>
  isImporting: boolean
  selectedFilter: 'all' | 'liked' | 'recent' | 'online' | 'radio' | 'tv'
  searchQuery: string
  isLoadingOnline: boolean
  onlineError: string | null
}>()

const emit = defineEmits<{
  (e: 'playTrack', track: PlayableTrack): void
  (e: 'togglePlayback', track: PlayableTrack): void
  (e: 'toggleLike', id: string): void
  (e: 'removeTrack', id: string, title: string): void
  (e: 'openFilePicker'): void
  (e: 'selectOnline'): void
  (e: 'clearSearch'): void
  (e: 'retryOnline'): void
}>()

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
    <!-- Loading state for online music -->
    <div
      v-if="isLoadingOnline && selectedFilter === 'online' && tracks.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-2xl bg-zinc-900/40 p-8 py-16 text-center ring-1 ring-zinc-800"
    >
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
      <p class="text-sm font-semibold text-zinc-300">Searching Jamendo catalog...</p>
      <p class="text-xs text-zinc-500">
        {{ searchQuery.trim() ? `Searching for “${searchQuery.trim()}”` : 'Fetching curated music from Jamendo' }}
      </p>
    </div>

    <!-- Error state for online music -->
    <div
      v-else-if="selectedFilter === 'online' && onlineError && tracks.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-2xl bg-zinc-900/40 p-8 py-12 px-6 text-center ring-1 ring-zinc-800"
    >
      <Globe :size="32" class="text-zinc-600" />
      <p class="text-sm font-semibold text-zinc-300">{{ onlineError }}</p>
      <button
        type="button"
        class="mt-1 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md active:scale-95 hover:bg-indigo-500"
        @click="emit('retryOnline')"
      >
        Retry
      </button>
    </div>

    <!-- Generic Empty State with Action Buttons -->
    <div
      v-else-if="tracks.length === 0"
      class="flex flex-col items-center justify-center gap-3.5 rounded-3xl bg-zinc-900/40 p-6 py-14 text-center ring-1 ring-zinc-800/80"
    >
      <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/70 text-zinc-500 ring-1 ring-white/10 shadow-sm">
        <Music :size="28" />
      </div>

      <div class="max-w-xs space-y-1">
        <p class="text-base font-bold text-zinc-200">No tracks found</p>
        <p class="text-xs text-zinc-400 leading-relaxed">
          {{
            searchQuery
              ? (selectedFilter === 'online'
                  ? `No online tracks matching “${searchQuery}”.`
                  : `No tracks matching “${searchQuery}”. Try searching online music or importing files.`)
              : selectedFilter === 'liked'
                ? 'No liked tracks yet. Tap the heart on any song to add it!'
                : selectedFilter === 'recent'
                  ? 'No recently played tracks yet.'
                  : selectedFilter === 'online'
                    ? 'No online music found. Try another genre.'
                    : 'Import audio files from your device or stream free online music.'
          }}
        </p>
      </div>

      <!-- Action buttons: Import & Online Music -->
      <div class="mt-2 flex flex-wrap items-center justify-center gap-2.5">
        <!-- Import Button -->
        <button
          type="button"
          class="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 ring-1 ring-white/20 transition active:scale-95 hover:bg-indigo-500 disabled:opacity-50"
          :disabled="isImporting"
          @click="emit('openFilePicker')"
        >
          <Plus :size="15" />
          <span>{{ isImporting ? 'Adding...' : 'Import Audio' }}</span>
        </button>

        <!-- Online Music Button -->
        <button
          v-if="selectedFilter !== 'online'"
          type="button"
          class="flex items-center gap-2 rounded-full bg-zinc-800/90 text-zinc-200 ring-1 ring-white/10 transition active:scale-95 hover:bg-zinc-700 hover:text-white px-4 py-2.5 text-xs font-semibold"
          @click="emit('selectOnline')"
        >
          <Globe :size="15" class="text-indigo-400" />
          <span>Online Music</span>
        </button>

        <!-- Clear search button if search query is active -->
        <button
          v-if="searchQuery"
          type="button"
          class="flex items-center gap-1.5 rounded-full bg-zinc-800/50 text-zinc-400 ring-1 ring-white/5 transition active:scale-95 hover:text-zinc-200 px-3.5 py-2 text-xs font-medium"
          @click="emit('clearSearch')"
        >
          <X :size="13" />
          <span>Clear search</span>
        </button>
      </div>
    </div>

    <!-- Track List -->
    <ul v-else class="space-y-2">
      <li
        v-for="track in tracks"
        :key="track.id"
        class="group flex items-center justify-between rounded-2xl bg-zinc-900/50 p-2.5 ring-1 ring-white/[0.06] transition active:scale-[0.99] active:bg-zinc-800/80"
        :class="{ 'bg-indigo-950/30 ring-indigo-500/30': currentTrack?.id === track.id }"
      >
        <!-- Song Info & Thumbnail (Tap navigates to player without pausing) -->
        <div
          class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 pr-2"
          @click="emit('playTrack', track)"
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
            <div class="flex items-center gap-1.5">
              <p
                class="truncate text-sm font-semibold"
                :class="currentTrack?.id === track.id ? 'text-indigo-300' : 'text-zinc-100'"
              >
                {{ track.title }}
              </p>
              <span
                v-if="track.kind === 'stream'"
                class="shrink-0 rounded bg-indigo-500/15 px-1.5 py-0.5 text-[9px] font-bold text-indigo-400 ring-1 ring-indigo-500/30"
              >
                ONLINE
              </span>
            </div>
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
            @click.stop="emit('toggleLike', track.id)"
          >
            <Heart :size="15" :fill="likedIds.has(track.id) ? 'currentColor' : 'none'" />
          </button>

          <!-- Circular Play Button (Explicitly toggles playback) -->
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-white ring-1 ring-white/15 transition active:scale-90 active:bg-white/20"
            :aria-label="currentTrack?.id === track.id && isPlaying ? 'Pause' : 'Play'"
            @click.stop="emit('togglePlayback', track)"
          >
            <Pause v-if="currentTrack?.id === track.id && isPlaying" :size="15" fill="currentColor" />
            <Play v-else :size="15" fill="currentColor" class="translate-x-0.5" />
          </button>

          <!-- Remove button for local files -->
          <button
            v-if="track.kind === 'local'"
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 opacity-60 transition active:scale-90 active:text-zinc-200 hover:opacity-100 hover:text-zinc-300"
            :aria-label="`Remove ${track.title} from playlist`"
            title="Remove from playlist"
            @click.stop="emit('removeTrack', track.id, track.title)"
          >
            <MinusCircle :size="15" />
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

