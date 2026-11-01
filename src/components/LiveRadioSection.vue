<script setup lang="ts">
import {
  Heart,
  Play,
  Radio,
  RefreshCw,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
  Volume2,
} from 'lucide-vue-next'
import type { PlayableTrack } from '../types/music'
import type {
  NetworkStrengthLevel,
  RadioCategory,
  RadioCategoryId,
  RadioHealthStatus,
  RadioRegion,
  RadioRegionId,
  RadioStation,
} from '../composables/useRadio'

defineProps<{
  regions: RadioRegion[]
  categories: RadioCategory[]
  activeRegion: RadioRegionId
  activeCategory: RadioCategoryId
  stations: RadioStation[]
  currentTrack: PlayableTrack | null
  isPlaying: boolean
  isLoading: boolean
  error: string | null
  activeLabel: string
  likedIds: Set<string>
  getStationStatus: (id: string) => RadioHealthStatus
  getStationLatency: (id: string) => number | undefined
  getNetworkStrength: (id: string) => NetworkStrengthLevel
}>()

const emit = defineEmits<{
  (e: 'selectRegion', id: RadioRegionId): void
  (e: 'selectCategory', id: RadioCategoryId): void
  (e: 'refresh'): void
  (e: 'playStation', station: RadioStation): void
  (e: 'togglePlayback', station: RadioStation): void
  (e: 'toggleLike', id: string): void
}>()
</script>

<template>
  <div class="space-y-4">
    <!-- Live Radio Hero Banner -->
    <div
      class="relative overflow-hidden rounded-3xl p-5 shadow-lg backdrop-blur-xl transition-all border
             bg-gradient-to-br from-rose-50/90 via-white to-orange-50/60 border-rose-100/90 shadow-rose-100/40
             dark:bg-gradient-to-br dark:from-[#281018]/95 dark:via-[#160d13]/95 dark:to-[#08080c]/95 dark:border-white/10 dark:shadow-2xl"
    >
      <div class="pointer-events-none absolute -right-6 -bottom-6 h-36 w-36 rounded-full bg-rose-500/15 dark:bg-rose-600/20 blur-2xl"></div>

      <div class="relative z-10 flex items-center justify-between">
        <div>
          <div class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            <span class="relative flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
              <span class="relative inline-flex h-2 w-2 rounded-full bg-rose-500"></span>
            </span>
            <span>Worldwide Radio</span>
          </div>

          <h2 class="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Live Radio
          </h2>
          <p class="mt-0.5 text-xs text-slate-500 dark:text-zinc-300">
            Hundreds of crystal-clear regional & global broadcast streams
          </p>
        </div>

        <div
          class="flex h-12 w-12 items-center justify-center rounded-2xl
                 bg-rose-100/90 text-rose-600 border border-rose-200/80 shadow-sm
                 dark:bg-rose-600/30 dark:text-rose-400 dark:border-rose-500/30 dark:shadow-inner"
        >
          <Radio :size="24" />
        </div>
      </div>

      <!-- Country / Region Carousel inside Hero -->
      <div class="mt-4 pt-2 border-t border-slate-200/70 dark:border-white/[0.08]">
        <div class="mb-1.5 flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
            Select Country
          </span>
          <span class="text-[10px] text-slate-500 dark:text-zinc-500">
            Priority coverage
          </span>
        </div>

        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            v-for="reg in regions"
            :key="reg.id"
            type="button"
            class="flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer border"
            :class="
              activeRegion === reg.id
                ? 'bg-gradient-to-r from-rose-600 to-rose-500 !text-white shadow-md shadow-rose-600/30 border-rose-500 font-bold'
                : 'bg-white text-slate-700 border-slate-200 shadow-xs hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 dark:bg-white/[0.08] dark:text-zinc-200 dark:border-white/10 dark:hover:text-white dark:hover:bg-white/[0.14]'
            "
            @click="emit('selectRegion', reg.id)"
          >
            <span>{{ reg.flag }}</span>
            <span>{{ reg.label }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Category Filtration Sub-Bar -->
    <div>
      <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          class="flex shrink-0 whitespace-nowrap items-center rounded-full px-3.5 py-1 text-xs font-semibold transition active:scale-95 cursor-pointer border"
          :class="
            activeCategory === cat.id
              ? 'bg-slate-900 !text-white font-bold shadow-md border-slate-900 dark:bg-white dark:!text-zinc-950 dark:border-white'
              : 'bg-white text-slate-600 border-slate-200 shadow-xs hover:bg-slate-50 hover:text-slate-900 dark:bg-zinc-900/80 dark:text-zinc-400 dark:border-white/10 dark:hover:text-white dark:hover:bg-zinc-800'
          "
          @click="emit('selectCategory', cat.id)"
        >
          <span>{{ cat.label }}</span>
        </button>
      </div>
    </div>

    <!-- Station List Header -->
    <div class="flex items-center justify-between pt-1">
      <div class="flex items-center gap-2">
        <h3 class="text-base font-bold text-slate-900 dark:text-white tracking-tight">
          {{ activeLabel }}
        </h3>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition cursor-pointer"
          title="Refresh radio stations"
          :disabled="isLoading"
          @click="emit('refresh')"
        >
          <RefreshCw :size="13" :class="{ 'animate-spin': isLoading }" />
        </button>
      </div>

      <div class="flex items-center gap-2">
        <span
          v-if="isLoading && stations.length > 0"
          class="flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping"></span>
          <span>Checking signals...</span>
        </span>
        <span v-else class="text-xs font-medium text-slate-500 dark:text-zinc-400 tabular-nums">
          {{ stations.length }} {{ stations.length === 1 ? 'station' : 'stations' }}
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading && stations.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-3xl p-8 py-16 text-center border
             bg-white/80 border-slate-200/90 shadow-sm
             dark:bg-zinc-900/40 dark:border-zinc-800"
    >
      <div class="h-9 w-9 animate-spin rounded-full border-2 border-rose-500 border-t-transparent shadow-lg shadow-rose-500/20"></div>
      <p class="text-sm font-semibold text-slate-800 dark:text-zinc-200">Tuning radio frequencies...</p>
      <p class="text-xs text-slate-500 dark:text-zinc-500">Connecting to RadioBrowser directory</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error && stations.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-3xl p-8 py-12 px-6 text-center border
             bg-white/80 border-slate-200/90 shadow-sm
             dark:bg-zinc-900/40 dark:border-zinc-800"
    >
      <Radio :size="32" class="text-slate-400 dark:text-zinc-600" />
      <p class="text-sm font-semibold text-slate-800 dark:text-zinc-200">{{ error }}</p>
      <button
        type="button"
        class="mt-1 rounded-full bg-rose-600 px-5 py-2 text-xs font-semibold !text-white shadow-lg shadow-rose-600/30 active:scale-95 hover:bg-rose-500 transition cursor-pointer"
        @click="emit('refresh')"
      >
        Retry Tuning
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="stations.length === 0"
      class="flex flex-col items-center justify-center gap-2 rounded-3xl p-8 py-12 text-center border
             bg-white/80 border-slate-200/90 shadow-sm
             dark:bg-zinc-900/40 dark:border-zinc-800"
    >
      <Radio :size="32" class="text-slate-400 dark:text-zinc-600" />
      <p class="text-sm font-bold text-slate-800 dark:text-zinc-200">No radio stations found</p>
      <p class="text-xs text-slate-500 dark:text-zinc-400">Try selecting another country or category.</p>
    </div>

    <!-- Station Grid -->
    <div v-else class="space-y-2">
      <div
        v-for="station in stations"
        :key="station.id"
        class="group flex items-center justify-between rounded-2xl p-2.5 border transition-all duration-200 active:scale-[0.99] cursor-pointer"
        :class="
          currentTrack?.id === station.id
            ? 'bg-rose-50/90 border-rose-200/90 shadow-md shadow-rose-100/50 dark:bg-rose-950/40 dark:border-rose-500/40 dark:shadow-lg dark:shadow-rose-950/20'
            : getStationStatus(station.id) === 'offline'
              ? 'bg-slate-100/60 border-slate-200/50 opacity-75 hover:opacity-100 dark:bg-zinc-900/30 dark:border-white/[0.03]'
              : 'bg-white/80 border-slate-200/80 hover:bg-slate-50/90 hover:border-slate-300 shadow-xs dark:bg-zinc-900/50 dark:border-white/[0.06] dark:hover:bg-zinc-800/60 dark:hover:border-white/[0.12]'
        "
        @click="emit('playStation', station)"
      >
        <div class="flex min-w-0 flex-1 items-center gap-3 pr-2">
          <!-- Logo frame with fallback -->
          <div
            class="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl p-1 flex items-center justify-center
                   bg-slate-100 border border-slate-200/80
                   dark:bg-zinc-950 dark:border-white/10"
          >
            <img
              v-if="station.coverUrl"
              :src="station.coverUrl"
              :alt="station.title"
              class="h-full w-full object-contain"
              loading="lazy"
              @error="(e) => ((e.target as HTMLElement).style.display = 'none')"
            />
            <Radio v-else :size="20" class="text-slate-400 dark:text-zinc-500" />

            <div
              v-if="currentTrack?.id === station.id && isPlaying"
              class="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px]"
            >
              <span
                v-for="n in 3"
                :key="n"
                class="animate-eq mx-[1px] h-3.5 w-0.5 rounded-full bg-rose-400"
                :style="{ animationDelay: `${n * 0.15}s` }"
              ></span>
            </div>
            <div
              v-else-if="currentTrack?.id === station.id"
              class="absolute inset-0 flex items-center justify-center bg-black/40"
            >
              <Volume2 :size="16" class="text-rose-400" />
            </div>
          </div>

          <!-- Station Name and Details -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <p
                class="truncate text-sm font-semibold transition-colors"
                :class="
                  currentTrack?.id === station.id
                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                    : getStationStatus(station.id) === 'offline'
                      ? 'text-slate-400 group-hover:text-slate-600 dark:text-zinc-400 dark:group-hover:text-zinc-200'
                      : 'text-slate-800 group-hover:text-rose-600 dark:text-zinc-100 dark:group-hover:text-rose-300'
                "
              >
                {{ station.title }}
              </p>
              <span
                v-if="station.bitrate"
                class="shrink-0 rounded px-1.5 py-0.2 text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
              >
                {{ station.bitrate }}k
              </span>
            </div>
            <p class="truncate text-xs text-slate-500 dark:text-zinc-400">
              {{ station.tags || 'Live Broadcast' }}
            </p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <!-- Network Signal Indicator -->
          <div
            v-if="getStationStatus(station.id) !== 'offline'"
            class="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border transition"
            :class="
              getNetworkStrength(station.id) === 'excellent'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25'
                : getNetworkStrength(station.id) === 'good'
                  ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/25'
                  : getNetworkStrength(station.id) === 'fair'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800/80 dark:text-zinc-400 dark:border-white/10'
            "
            :title="
              getStationLatency(station.id)
                ? `Latency: ${getStationLatency(station.id)}ms (${getNetworkStrength(station.id)})`
                : 'Signal Good'
            "
          >
            <SignalHigh
              v-if="getNetworkStrength(station.id) === 'excellent'"
              :size="12"
              class="text-emerald-600 dark:text-emerald-400"
            />
            <SignalMedium
              v-else-if="getNetworkStrength(station.id) === 'good'"
              :size="12"
              class="text-teal-600 dark:text-teal-400"
            />
            <SignalLow
              v-else-if="getNetworkStrength(station.id) === 'fair' || getNetworkStrength(station.id) === 'poor'"
              :size="12"
              class="text-amber-600 dark:text-amber-400"
            />
            <SignalZero
              v-else
              :size="12"
              class="text-slate-400 dark:text-zinc-500"
            />
            <span
              v-if="getStationLatency(station.id)"
              class="font-mono text-[9px] font-semibold text-slate-600 dark:text-zinc-300"
            >
              {{ getStationLatency(station.id) }}ms
            </span>
            <span
              v-else-if="getStationStatus(station.id) === 'online'"
              class="font-mono text-[9px] font-semibold text-emerald-600 dark:text-emerald-400/90"
            >
              Live
            </span>
          </div>

          <!-- Like Button -->
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition active:scale-90 cursor-pointer"
            :class="{ '!text-rose-500': likedIds.has(station.id) }"
            :aria-label="likedIds.has(station.id) ? 'Unlike station' : 'Like station'"
            @click.stop="emit('toggleLike', station.id)"
          >
            <Heart :size="16" :fill="likedIds.has(station.id) ? 'currentColor' : 'none'" />
          </button>

          <!-- Play / Pause Icon Button -->
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90 cursor-pointer
                   bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-rose-600 group-hover:!text-white group-hover:border-rose-600
                   dark:bg-white/[0.08] dark:text-white dark:border-white/10 dark:group-hover:bg-rose-600 dark:group-hover:text-white"
            :aria-label="currentTrack?.id === station.id && isPlaying ? 'Pause' : 'Play'"
            @click.stop="emit('togglePlayback', station)"
          >
            <div
              v-if="currentTrack?.id === station.id && isPlaying"
              class="flex items-center justify-center gap-0.5"
            >
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
