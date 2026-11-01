<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Disc,
  FolderPlus,
  Heart,
  Music,
  Play,
  Search,
  Shuffle,
  Trash2,
  UploadCloud,
  Volume2,
  X,
} from 'lucide-vue-next'
import type { PlayableTrack } from '../types/music'

export type LibraryFilter = 'all' | 'liked' | 'recent'

const props = defineProps<{
  tracks: PlayableTrack[]
  currentTrack: PlayableTrack | null
  isPlaying: boolean
  likedIds: Set<string>
  isImporting: boolean
  selectedFilter: LibraryFilter
  searchQuery: string
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void
  (e: 'selectFilter', filter: LibraryFilter): void
  (e: 'playTrack', track: PlayableTrack): void
  (e: 'togglePlayback', track: PlayableTrack): void
  (e: 'toggleLike', id: string): void
  (e: 'removeTrack', id: string, title: string): void
  (e: 'openFilePicker'): void
  (e: 'dropFiles', files: File[]): void
  (e: 'shuffleAll'): void
  (e: 'switchToDiscover'): void
}>()

const isDraggingFiles = ref(false)

function formatTrackDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--'
  const whole = Math.floor(seconds)
  const mins = Math.floor(whole / 60)
  const secs = whole % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const totalDurationFormatted = computed(() => {
  const totalSecs = props.tracks.reduce((acc, t) => acc + (t.duration || 0), 0)
  if (totalSecs <= 0) return ''
  const hours = Math.floor(totalSecs / 3600)
  const mins = Math.floor((totalSecs % 3600) / 60)
  if (hours > 0) return `~${hours}h ${mins}m`
  return `~${mins} min`
})

function onDragOver(e: DragEvent): void {
  e.preventDefault()
  isDraggingFiles.value = true
}

function onDragLeave(e: DragEvent): void {
  e.preventDefault()
  const current = e.currentTarget as HTMLElement | null
  const related = e.relatedTarget as Node | null
  if (current && related && current.contains(related)) return
  isDraggingFiles.value = false
}

function onDrop(e: DragEvent): void {
  e.preventDefault()
  isDraggingFiles.value = false
  const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : []
  if (files.length > 0) {
    emit('dropFiles', files)
  }
}
</script>

<template>
  <div class="space-y-4" @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop">
    <!-- Library Hero Overview Card -->
    <div
      class="relative overflow-hidden rounded-3xl p-5 shadow-lg backdrop-blur-xl transition-all border
             bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/70 border-indigo-100/90 shadow-indigo-100/40
             dark:bg-gradient-to-br dark:from-[#13112a]/95 dark:via-[#0e0e1a]/95 dark:to-[#08080c]/95 dark:border-white/10 dark:shadow-2xl"
      :class="{ 'ring-2 ring-indigo-400 bg-indigo-50 dark:bg-indigo-950/80': isDraggingFiles }">
      <div class="pointer-events-none absolute -right-4 -top-4 h-32 w-32 rounded-full bg-indigo-500/15 blur-2xl"></div>

      <div class="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase
                     bg-indigo-100/90 text-indigo-700 border border-indigo-200/70
                     dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30">
              Offline Library
            </span>
            <span v-if="totalDurationFormatted" class="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              {{ totalDurationFormatted }}
            </span>
          </div>

          <h2 class="mt-1.5 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Your Music
          </h2>
          <p class="text-xs text-slate-500 dark:text-zinc-300 mt-0.5">
            {{ tracks.length }} {{ tracks.length === 1 ? 'song' : 'songs' }} stored privately on your device
          </p>
        </div>

        <!-- Quick Action Buttons -->
        <div class="flex items-center gap-2.5">
          <button type="button"
            class="btn-primary-white flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2.5 text-xs font-bold shadow-lg shadow-indigo-600/30 ring-1 ring-white/20 transition active:scale-95 hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
            :disabled="isImporting" @click="emit('openFilePicker')">
            <FolderPlus :size="15" />
            <span>{{ isImporting ? 'Importing...' : 'Add Music' }}</span>
          </button>

          <button v-if="tracks.length > 0" type="button"
            class="flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-xs font-semibold transition active:scale-95 cursor-pointer
                   bg-white text-slate-700 border border-slate-200/90 shadow-sm hover:bg-slate-50 hover:text-slate-900
                   dark:bg-zinc-800/90 dark:text-zinc-200 dark:border-white/10 dark:hover:bg-zinc-700 dark:hover:text-white" title="Shuffle play all songs"
            @click="emit('shuffleAll')">
            <Shuffle :size="14" />
            <span class="hidden sm:inline">Shuffle All</span>
          </button>
        </div>
      </div>

      <!-- Quick Search Bar inside Library -->
      <div
        class="mt-4 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 backdrop-blur-md transition
               bg-white border border-slate-200/90 shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500
               dark:bg-black/40 dark:border-white/15 dark:focus-within:border-indigo-500 dark:focus-within:ring-2 dark:focus-within:ring-indigo-500"
      >
        <Search :size="15" class="shrink-0 pointer-events-none text-slate-400 dark:text-zinc-400" />
        <input
          :value="searchQuery"
          type="search"
          placeholder="Filter library songs or artists..."
          class="w-full min-w-0 bg-transparent text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none dark:text-white dark:placeholder-zinc-500"
          @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="shrink-0 text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-white transition active:scale-90 cursor-pointer"
          aria-label="Clear library search"
          @click="emit('update:searchQuery', '')"
        >
          <X :size="14" />
        </button>
      </div>
    </div>

    <!-- Segmented Filter Control: All | Liked | Recent -->
    <div class="flex items-center justify-between pt-1">
      <div class="inline-flex rounded-full p-1 backdrop-blur-md border
               bg-slate-200/70 border-slate-300/50 shadow-inner
               dark:bg-zinc-900/80 dark:border-white/10">
        <button type="button"
          class="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
          :class="selectedFilter === 'all'
            ? 'btn-primary-white bg-indigo-600 shadow-md shadow-indigo-600/30'
            : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
            " @click="emit('selectFilter', 'all')">
          <span>All Songs</span>
        </button>

        <button type="button"
          class="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
          :class="selectedFilter === 'liked'
            ? 'btn-primary-white bg-rose-600 shadow-md shadow-rose-600/30'
            : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
            " @click="emit('selectFilter', 'liked')">
          <Heart :size="12" :fill="selectedFilter === 'liked' ? 'currentColor' : 'none'" />
          <span>Favorites</span>
        </button>

        <button type="button"
          class="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer"
          :class="selectedFilter === 'recent'
            ? 'btn-primary-white bg-indigo-600 shadow-md shadow-indigo-600/30'
            : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
            " @click="emit('selectFilter', 'recent')">
          <span>Recent</span>
        </button>
      </div>

      <span class="text-xs font-medium text-slate-500 dark:text-zinc-400 tabular-nums">
        {{ tracks.length }} {{ tracks.length === 1 ? 'track' : 'tracks' }}
      </span>
    </div>

    <!-- Empty State -->
    <div v-if="tracks.length === 0" class="flex flex-col items-center justify-center gap-4 rounded-3xl p-8 py-14 text-center backdrop-blur-md border
             bg-white/80 border-slate-200/80 shadow-sm
             dark:bg-zinc-900/40 dark:border-white/10">
      <div class="flex h-16 w-16 items-center justify-center rounded-3xl border shadow-lg
               bg-indigo-50 text-indigo-600 border-indigo-100 shadow-indigo-100/50
               dark:bg-indigo-600/15 dark:text-indigo-400 dark:border-indigo-500/25 dark:shadow-indigo-600/10">
        <UploadCloud :size="30" />
      </div>

      <div class="max-w-xs space-y-1">
        <h3 class="text-base font-bold text-slate-900 dark:text-white">
          {{
            searchQuery
              ? `No tracks matching “${searchQuery}”`
              : selectedFilter === 'liked'
                ? 'No favorite songs yet'
                : selectedFilter === 'recent'
                  ? 'No recently played tracks'
                  : 'Your offline library is empty'
          }}
        </h3>
        <p class="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
          {{
            searchQuery
              ? 'Check the spelling or clear the filter to view all your songs.'
              : selectedFilter === 'liked'
                ? 'Tap the heart icon on any song to add it to your Favorites collection.'
                : 'Import audio files (MP3, M4A, FLAC, WAV, AAC, OGG) to listen offline with lock screen controls.'
          }}
        </p>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button type="button"
          class="btn-primary-white flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-xs font-bold shadow-lg shadow-indigo-600/30 transition active:scale-95 hover:bg-indigo-500 cursor-pointer"
          @click="emit('openFilePicker')">
          <FolderPlus :size="16" />
          <span>Import Audio Files</span>
        </button>

        <button type="button" class="flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold transition active:scale-95 cursor-pointer
                 bg-white text-slate-700 border border-slate-200/90 shadow-sm hover:bg-slate-50 hover:text-slate-900
                 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10 dark:hover:bg-zinc-700 dark:hover:text-white"
          @click="emit('switchToDiscover')">
          <Music :size="14" />
          <span>Explore Free Online Music</span>
        </button>
      </div>
    </div>

    <!-- Track List -->
    <div v-else class="space-y-2">
      <div v-for="track in tracks" :key="track.id"
        class="group flex items-center justify-between rounded-2xl p-2.5 border transition-all duration-200 active:scale-[0.99] cursor-pointer"
        :class="currentTrack?.id === track.id
          ? 'bg-indigo-50/90 border-indigo-200 shadow-sm dark:bg-indigo-950/40 dark:border-indigo-500/40 dark:shadow-indigo-950/20'
          : 'bg-white/90 border-slate-200/80 shadow-sm hover:bg-white hover:border-slate-300 dark:bg-zinc-900/50 dark:border-white/[0.06] dark:hover:bg-zinc-800/60 dark:hover:border-white/[0.12]'
          " @click="emit('playTrack', track)">
        <div class="flex min-w-0 flex-1 items-center gap-3 pr-2">
          <!-- Artwork & Equalizer Overlay -->
          <div class="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border flex items-center justify-center
                   bg-slate-100 border-slate-200 dark:bg-zinc-950 dark:border-white/10 shadow-sm">
            <img v-if="track.coverUrl" :src="track.coverUrl" :alt="track.title"
              class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy"
              @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')" />
            <Disc v-else :size="24" class="text-slate-400 dark:text-zinc-500" />

            <div v-if="currentTrack?.id === track.id && isPlaying"
              class="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
              <span v-for="n in 3" :key="n" class="animate-eq mx-[1px] h-3.5 w-0.5 rounded-full bg-indigo-400"
                :style="{ animationDelay: `${n * 0.15}s` }"></span>
            </div>
            <div v-else-if="currentTrack?.id === track.id"
              class="absolute inset-0 flex items-center justify-center bg-black/35">
              <Volume2 :size="16" class="text-indigo-400" />
            </div>
          </div>

          <!-- Title and Artist -->
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold transition-colors" :class="currentTrack?.id === track.id
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-900 group-hover:text-indigo-600 dark:text-zinc-100 dark:group-hover:text-white'
              ">
              {{ track.title }}
            </p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="rounded px-1.5 py-0.2 text-[9px] font-bold border" :class="track.id.startsWith('radio') || (track.kind === 'stream' && track.duration <= 0)
                ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-transparent'
                : track.id.startsWith('jamendo')
                  ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-transparent'
                  : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-transparent'
                ">
                {{
                  track.id.startsWith('radio') || (track.kind === 'stream' && track.duration <= 0) ? 'Radio' :
                    track.id.startsWith('jamendo') ? 'Jamendo' : 'Local' }} </span>
                  <p class="truncate text-xs text-slate-500 dark:text-zinc-400">
                    {{ track.artist }}
                  </p>
            </div>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <!-- Duration -->
          <span class="font-mono text-xs text-slate-500 dark:text-zinc-500">
            {{ track.id.startsWith('radio') ? 'LIVE' : formatTrackDuration(track.duration) }}
          </span>

          <!-- Like Button -->
          <button type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 dark:text-zinc-400 transition active:scale-90 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-zinc-800 cursor-pointer"
            :class="{ 'text-rose-500 hover:text-rose-600 dark:text-rose-500 dark:hover:text-rose-400': likedIds.has(track.id) }"
            :aria-label="likedIds.has(track.id) ? 'Unlike song' : 'Like song'"
            @click.stop="emit('toggleLike', track.id)">
            <Heart :size="16" :fill="likedIds.has(track.id) ? 'currentColor' : 'none'" />
          </button>

          <!-- Remove Button -->
          <button v-if="track.kind === 'local'" type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 dark:text-zinc-500 transition active:scale-90 hover:text-rose-500 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-zinc-800 cursor-pointer"
            title="Delete song from local storage" aria-label="Remove song"
            @click.stop="emit('removeTrack', track.id, track.title)">
            <Trash2 :size="15" />
          </button>

          <!-- Play / Pause Icon Button -->
          <button type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90 cursor-pointer border
                   bg-slate-100 text-slate-800 border-slate-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 hover:shadow-md
                   dark:bg-white/[0.08] dark:text-white dark:border-white/10 dark:hover:bg-indigo-600 dark:hover:text-white dark:hover:border-indigo-600"
            :aria-label="currentTrack?.id === track.id && isPlaying ? 'Pause' : 'Play'"
            @click.stop="emit('togglePlayback', track)">
            <div v-if="currentTrack?.id === track.id && isPlaying" class="flex items-center justify-center gap-0.5">
              <span class="h-3 w-1 rounded-full bg-current"></span>
              <span class="h-3 w-1 rounded-full bg-current"></span>
            </div>
            <Play v-else :size="14" fill="currentColor" class="translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
