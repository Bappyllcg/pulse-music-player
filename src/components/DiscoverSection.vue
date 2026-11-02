<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  Grid,
  Heart,
  Music,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Volume2,
  X,
} from 'lucide-vue-next'
import { useHorizontalScroll } from '../composables/useHorizontalScroll'
import type { PlayableTrack } from '../types/music'
import type { OnlineGenre } from '../composables/useOnlineMusic'

const props = defineProps<{
  genres: OnlineGenre[]
  activeGenreId: string
  tracks: PlayableTrack[]
  currentTrack: PlayableTrack | null
  isPlaying: boolean
  isLoading: boolean
  error: string | null
  searchQuery: string
  likedIds: Set<string>
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void
  (e: 'selectGenre', id: string): void
  (e: 'playTrack', track: PlayableTrack): void
  (e: 'togglePlayback', track: PlayableTrack): void
  (e: 'toggleLike', id: string): void
  (e: 'retry'): void
}>()

const genreScrollRef = ref<HTMLElement | null>(null)
const genreScroll = useHorizontalScroll(genreScrollRef)
const isGenreGridExpanded = ref(false)

function handleSelectGenre(id: string) {
  if (genreScroll.isDragClick()) return
  emit('selectGenre', id)
  genreScroll.scrollActiveIntoView()
}

function toggleGenreGrid() {
  isGenreGridExpanded.value = !isGenreGridExpanded.value
  if (!isGenreGridExpanded.value) {
    setTimeout(() => {
      genreScroll.scrollActiveIntoView()
    }, 100)
  }
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--'
  const whole = Math.floor(seconds)
  const mins = Math.floor(whole / 60)
  const secs = whole % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const headerTitle = computed(() => {
  if (props.searchQuery.trim()) {
    return `Results for “${props.searchQuery.trim()}”`
  }
  const found = props.genres.find((g) => g.id === props.activeGenreId)
  return found ? `Curated ${found.label}` : 'Discover Online Tracks'
})
</script>

<template>
  <div class="space-y-3">
    <!-- Compact Discover Toolbar Card -->
    <div
      class="relative overflow-hidden rounded-2xl p-3 sm:p-3.5 shadow-sm backdrop-blur-xl transition-all border
             bg-gradient-to-r from-purple-50/70 via-white to-indigo-50/40 border-purple-100/90 shadow-purple-100/20
             dark:bg-gradient-to-r dark:from-[#170e28]/90 dark:via-[#110e1c]/90 dark:to-[#08080c]/90 dark:border-white/10 dark:shadow-none"
    >
      <!-- Header Row: Title & badge -->
      <div class="relative z-10 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl
                   bg-purple-100 text-purple-700 border border-purple-200/80 shadow-2xs
                   dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30"
          >
            <Compass :size="15" />
          </div>
          <div class="min-w-0">
            <div class="flex items-baseline gap-2 flex-wrap">
              <h2 class="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                Discover Music
              </h2>
              <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                           bg-purple-100/90 text-purple-700 border border-purple-200/70
                           dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30 whitespace-nowrap">
                <Sparkles :size="10" />
                Jamendo Free
              </span>
            </div>
          </div>
        </div>

        <button
          v-if="error"
          type="button"
          class="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition active:scale-95 cursor-pointer
                 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100
                 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-500/30 shrink-0"
          @click="emit('retry')"
        >
          <RefreshCw :size="12" />
          <span>Retry</span>
        </button>
      </div>

      <!-- Discover Search Bar -->
      <div
        class="mt-2.5 flex items-center gap-2 rounded-xl px-3 py-1.5 backdrop-blur-md transition
               bg-white/90 border border-slate-200/90 shadow-2xs focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20
               dark:bg-black/40 dark:border-white/10 dark:focus-within:border-purple-500 dark:focus-within:ring-2 dark:focus-within:ring-purple-500/30 dark:focus-within:bg-black/60"
      >
        <Search :size="14" class="shrink-0 pointer-events-none text-slate-400 dark:text-zinc-400" />
        <input
          :value="searchQuery"
          type="search"
          placeholder="Search songs, artists, synthwave..."
          class="w-full min-w-0 bg-transparent text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none dark:text-white dark:placeholder-zinc-500"
          @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="shrink-0 text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white transition active:scale-90 cursor-pointer p-0.5"
          aria-label="Clear search"
          @click="emit('update:searchQuery', '')"
        >
          <X :size="13" />
        </button>
      </div>
    </div>

    <!-- Curated Genres Filter Pill Bar -->
    <div>
      <div class="mb-2 flex items-center justify-between px-1">
        <div class="flex items-center gap-1.5">
          <h3 class="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
            Top Genres
          </h3>
          <span class="rounded-full bg-purple-100/90 dark:bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300 border border-purple-200/70 dark:border-purple-500/30">
            {{ genres.length }}
          </span>
        </div>

        <!-- Carousel Nudges & View All Toggle -->
        <div class="flex items-center gap-1">
          <template v-if="!isGenreGridExpanded">
            <button
              type="button"
              :disabled="!genreScroll.canScrollLeft.value"
              class="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
              title="Scroll left"
              aria-label="Scroll genres left"
              @click="genreScroll.scrollLeft()"
            >
              <ChevronLeft :size="14" />
            </button>
            <button
              type="button"
              :disabled="!genreScroll.canScrollRight.value"
              class="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
              title="Scroll right"
              aria-label="Scroll genres right"
              @click="genreScroll.scrollRight()"
            >
              <ChevronRight :size="14" />
            </button>
          </template>

          <button
            type="button"
            class="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 cursor-pointer
                   bg-white/85 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/90 shadow-2xs
                   dark:bg-white/[0.08] dark:hover:bg-white/[0.14] dark:text-zinc-200 dark:border-white/10 dark:hover:text-white"
            :class="{ 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-500/40': isGenreGridExpanded }"
            @click="toggleGenreGrid"
          >
            <Grid :size="11" />
            <span>{{ isGenreGridExpanded ? 'Collapse' : `All (${genres.length})` }}</span>
            <ChevronUp v-if="isGenreGridExpanded" :size="12" />
            <ChevronDown v-else :size="12" />
          </button>
        </div>
      </div>

      <!-- Mode A: Carousel -->
      <div v-if="!isGenreGridExpanded" class="relative group/genres">
        <!-- Left Edge Fade -->
        <div
          class="pointer-events-none absolute left-0 inset-y-0 w-4 z-10 bg-gradient-to-r from-slate-50 dark:from-[#08080c] to-transparent transition-opacity duration-200"
          :class="genreScroll.canScrollLeft.value ? 'opacity-100' : 'opacity-0'"
        ></div>

        <div
          ref="genreScrollRef"
          class="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth select-none cursor-grab active:cursor-grabbing"
        >
          <button
            v-for="genre in genres"
            :key="genre.id"
            :data-active="activeGenreId === genre.id && !searchQuery.trim()"
            type="button"
            class="flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer border"
            :class="
              activeGenreId === genre.id && !searchQuery.trim()
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 !text-white shadow-md shadow-indigo-600/30 border-purple-500 font-bold'
                : 'bg-white text-slate-700 border-slate-200 shadow-xs hover:bg-purple-50/70 hover:text-purple-700 hover:border-purple-200 dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-white/10 dark:hover:text-white dark:hover:bg-zinc-800/80'
            "
            @click="handleSelectGenre(genre.id)"
          >
            <span>{{ genre.label }}</span>
          </button>
        </div>

        <!-- Right Edge Fade -->
        <div
          class="pointer-events-none absolute right-0 inset-y-0 w-4 z-10 bg-gradient-to-l from-slate-50 dark:from-[#08080c] to-transparent transition-opacity duration-200"
          :class="genreScroll.canScrollRight.value ? 'opacity-100' : 'opacity-0'"
        ></div>
      </div>

      <!-- Mode B: Expanded Multi-Row Wrapped Grid -->
      <div v-else class="flex flex-wrap gap-1.5 py-1 max-h-52 overflow-y-auto animate-in fade-in-50 duration-200">
        <button
          v-for="genre in genres"
          :key="genre.id"
          :data-active="activeGenreId === genre.id && !searchQuery.trim()"
          type="button"
          class="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer border"
          :class="
            activeGenreId === genre.id && !searchQuery.trim()
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 !text-white shadow-md shadow-indigo-600/30 border-purple-500 font-bold'
              : 'bg-white text-slate-700 border-slate-200 shadow-xs hover:bg-purple-50/70 hover:text-purple-700 hover:border-purple-200 dark:bg-zinc-900/80 dark:text-zinc-300 dark:border-white/10 dark:hover:text-white dark:hover:bg-zinc-800/80'
          "
          @click="handleSelectGenre(genre.id); isGenreGridExpanded = false"
        >
          <span>{{ genre.label }}</span>
        </button>
      </div>
    </div>

    <!-- Tracks Header -->
    <div class="flex items-center justify-between pt-1">
      <h3 class="text-base font-bold text-slate-900 dark:text-white tracking-tight">
        {{ headerTitle }}
      </h3>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition cursor-pointer"
          title="Refresh online tracks"
          :disabled="isLoading"
          @click="emit('retry')"
        >
          <RefreshCw :size="13" :class="{ 'animate-spin': isLoading }" />
        </button>
        <span class="text-xs font-medium text-slate-500 dark:text-zinc-400">
          {{ tracks.length }} {{ tracks.length === 1 ? 'track' : 'tracks' }}
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading && tracks.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-3xl p-8 py-16 text-center border
             bg-white/80 border-slate-200/90 shadow-sm
             dark:bg-zinc-900/40 dark:border-zinc-800"
    >
      <div class="h-9 w-9 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent shadow-lg shadow-indigo-500/20"></div>
      <p class="text-sm font-semibold text-slate-800 dark:text-zinc-200">Exploring Jamendo catalog...</p>
      <p class="text-xs text-slate-500 dark:text-zinc-500">
        {{ searchQuery.trim() ? `Searching for “${searchQuery.trim()}”` : 'Fetching trending online streams' }}
      </p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error && tracks.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-3xl p-8 py-12 px-6 text-center border
             bg-white/80 border-slate-200/90 shadow-sm
             dark:bg-zinc-900/40 dark:border-zinc-800"
    >
      <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-zinc-800 dark:text-rose-400 border border-rose-200 dark:border-white/10">
        <Music :size="24" />
      </div>
      <p class="text-sm font-semibold text-slate-800 dark:text-zinc-200">{{ error }}</p>
      <button
        type="button"
        class="mt-1 rounded-full bg-indigo-600 px-5 py-2 text-xs font-semibold !text-white shadow-lg shadow-indigo-600/30 active:scale-95 hover:bg-indigo-500 transition cursor-pointer"
        @click="emit('retry')"
      >
        Retry Discovery
      </button>
    </div>

    <!-- Empty Search State -->
    <div
      v-else-if="tracks.length === 0"
      class="flex flex-col items-center justify-center gap-2 rounded-3xl p-8 py-12 text-center border
             bg-white/80 border-slate-200/90 shadow-sm
             dark:bg-zinc-900/40 dark:border-zinc-800"
    >
      <Music :size="32" class="text-slate-400 dark:text-zinc-600" />
      <p class="text-sm font-bold text-slate-800 dark:text-zinc-200">No tracks found</p>
      <p class="text-xs text-slate-500 dark:text-zinc-400">Try searching a different artist or choosing another genre.</p>
    </div>

    <!-- Track List -->
    <TransitionGroup v-else name="media-list" tag="div" class="space-y-2">
      <div
        v-for="track in tracks"
        :key="track.id"
        class="group flex items-center justify-between rounded-2xl p-2.5 border transition-all duration-200 active:scale-[0.99] cursor-pointer"
        :class="
          currentTrack?.id === track.id
            ? 'bg-indigo-50/90 border-indigo-200/90 shadow-md shadow-indigo-100/50 dark:bg-indigo-950/40 dark:border-indigo-500/40 dark:shadow-lg dark:shadow-indigo-950/20'
            : 'bg-white/80 border-slate-200/80 hover:bg-slate-50/90 hover:border-slate-300 shadow-xs dark:bg-zinc-900/50 dark:border-white/[0.06] dark:hover:bg-zinc-800/60 dark:hover:border-white/[0.12]'
        "
        @click="emit('playTrack', track)"
      >
        <div class="flex min-w-0 flex-1 items-center gap-3 pr-2">
          <!-- Artwork & Equalizer Overlay -->
          <div class="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200/80 dark:bg-zinc-900 dark:border-white/10">
            <img
              :src="track.coverUrl"
              :alt="track.title"
              class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              @error="(e) => ((e.target as HTMLImageElement).src = './icon.svg')"
            />
            <div
              v-if="currentTrack?.id === track.id && isPlaying"
              class="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]"
            >
              <span
                v-for="n in 3"
                :key="n"
                class="animate-eq mx-[1px] h-3.5 w-0.5 rounded-full bg-indigo-400"
                :style="{ animationDelay: `${n * 0.15}s` }"
              ></span>
            </div>
            <div
              v-else-if="currentTrack?.id === track.id"
              class="absolute inset-0 flex items-center justify-center bg-black/35"
            >
              <Volume2 :size="16" class="text-indigo-400" />
            </div>
          </div>

          <!-- Title and Artist -->
          <div class="min-w-0 flex-1">
            <p
              class="truncate text-sm font-semibold transition-colors"
              :class="
                currentTrack?.id === track.id
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-slate-800 group-hover:text-indigo-600 dark:text-zinc-100 dark:group-hover:text-white'
              "
            >
              {{ track.title }}
            </p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="rounded px-1.5 py-0.2 text-[9px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400">
                Jamendo
              </span>
              <p class="truncate text-xs text-slate-500 dark:text-zinc-400">
                {{ track.artist }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <!-- Duration -->
          <span class="hidden font-mono text-xs text-slate-500 dark:text-zinc-400 sm:inline">
            {{ formatDuration(track.duration) }}
          </span>

          <!-- Like Button -->
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition active:scale-90 cursor-pointer"
            :class="{ '!text-rose-500': likedIds.has(track.id) }"
            :aria-label="likedIds.has(track.id) ? 'Unlike song' : 'Like song'"
            @click.stop="emit('toggleLike', track.id)"
          >
            <Heart :size="16" :fill="likedIds.has(track.id) ? 'currentColor' : 'none'" :class="{ 'animate-heart-pop': likedIds.has(track.id) }" />
          </button>

          <!-- Play / Pause Icon Button -->
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90 cursor-pointer
                   bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-indigo-600 group-hover:!text-white group-hover:border-indigo-600
                   dark:bg-white/[0.08] dark:text-white dark:border-white/10 dark:group-hover:bg-indigo-600 dark:group-hover:text-white"
            :aria-label="currentTrack?.id === track.id && isPlaying ? 'Pause' : 'Play'"
            @click.stop="emit('togglePlayback', track)"
          >
            <div
              v-if="currentTrack?.id === track.id && isPlaying"
              class="flex items-center justify-center gap-0.5"
            >
              <span class="h-3 w-1 rounded-full bg-current"></span>
              <span class="h-3 w-1 rounded-full bg-current"></span>
            </div>
            <Play v-else :size="14" fill="currentColor" class="translate-x-0.5" />
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>
