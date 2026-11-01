<script setup lang="ts">
import {
  Heart,
  Pause,
  Play,
  Radio,
  RefreshCw,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
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
    <!-- Country / Region Priority Bar -->
    <div class="mb-2.5 -mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
      <button
        v-for="reg in regions"
        :key="reg.id"
        type="button"
        class="flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95"
        :class="
          activeRegion === reg.id
            ? 'bg-gradient-to-r from-rose-500 to-indigo-600 text-white shadow-md shadow-rose-600/30 ring-1 ring-white/20'
            : 'bg-zinc-900/80 text-zinc-400 ring-1 ring-white/10 hover:text-white hover:bg-zinc-800'
        "
        @click="emit('selectRegion', reg.id)"
      >
        <span>{{ reg.flag }}</span>
        <span>{{ reg.label }}</span>
      </button>
    </div>

    <!-- Category Filtration Sub-Bar -->
    <div class="mb-5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
      <button
        v-for="cat in categories"
        :key="cat.id"
        type="button"
        class="flex shrink-0 whitespace-nowrap items-center rounded-full px-3 py-1 text-[11px] font-semibold transition active:scale-95"
        :class="
          activeCategory === cat.id
            ? 'bg-zinc-100 text-zinc-950 font-bold shadow-md ring-1 ring-white'
            : 'bg-zinc-900/80 text-zinc-400 ring-1 ring-white/5 hover:text-white hover:bg-zinc-800'
        "
        @click="emit('selectCategory', cat.id)"
      >
        <span>{{ cat.label }}</span>
      </button>
    </div>

    <!-- Section Header -->
    <div class="mb-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h2 class="text-lg font-bold text-white">
          {{ activeLabel }}
        </h2>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:text-white hover:bg-zinc-800"
          title="Refresh radio stations"
          @click="emit('refresh')"
        >
          <RefreshCw
            :size="13"
            :class="{ 'animate-spin': isLoading }"
          />
        </button>
      </div>

      <div class="flex items-center gap-2">
        <span
          v-if="isLoading && stations.length > 0"
          class="flex items-center gap-1 text-[11px] font-medium text-rose-400"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping"></span>
          <span>Tuning...</span>
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading && stations.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-2xl bg-zinc-900/40 py-16 text-center ring-1 ring-zinc-800"
    >
      <div class="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent"></div>
      <p class="text-sm font-medium text-zinc-300">Tuning into live radio playlist...</p>
      <p class="text-xs text-zinc-500">Connecting to Radio Browser directory</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error && stations.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-2xl bg-zinc-900/40 py-12 px-6 text-center ring-1 ring-zinc-800"
    >
      <Radio :size="32" class="text-zinc-600" />
      <p class="text-sm font-medium text-zinc-300">{{ error }}</p>
      <button
        type="button"
        class="mt-1 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md active:scale-95 hover:bg-rose-500"
        @click="emit('refresh')"
      >
        Retry
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="stations.length === 0"
      class="flex flex-col items-center justify-center gap-2 rounded-2xl bg-zinc-900/40 py-12 text-center ring-1 ring-zinc-800"
    >
      <Radio :size="32" class="text-zinc-600" />
      <p class="text-sm font-medium text-zinc-300">No radio stations found</p>
      <p class="text-xs text-zinc-500">Try changing category or clearing your search.</p>
    </div>

    <!-- Radio Station Grid -->
    <div v-else class="space-y-2">
      <div
        v-for="station in stations"
        :key="station.id"
        class="group flex items-center justify-between rounded-2xl bg-zinc-900/50 p-2.5 ring-1 transition active:scale-[0.99] cursor-pointer hover:bg-zinc-800/60"
        :class="
          currentTrack?.id === station.id
            ? 'bg-rose-950/30 ring-rose-500/40'
            : getStationStatus(station.id) === 'offline'
              ? 'ring-white/[0.03] opacity-75 hover:opacity-100 hover:ring-white/[0.08]'
              : 'ring-white/[0.06] active:bg-zinc-800/80'
        "
        @click="emit('playStation', station)"
      >
        <div class="flex min-w-0 flex-1 items-center gap-3 pr-2">
          <div class="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-950 p-1 ring-1 ring-white/10 flex items-center justify-center">
            <img
              v-if="station.coverUrl"
              :src="station.coverUrl"
              :alt="station.title"
              class="h-full w-full object-contain"
              loading="lazy"
              @error="(e) => ((e.target as HTMLElement).style.display = 'none')"
            />
            <Radio v-else :size="20" class="text-rose-400" />

            <!-- Playing equalizer animation -->
            <div
              v-if="currentTrack?.id === station.id"
              class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl"
            >
              <span
                v-for="n in 3"
                :key="n"
                class="animate-eq mx-[1px] h-3.5 w-1 origin-bottom rounded-full bg-rose-400"
                :style="{ animationDelay: `${n * 0.15}s`, animationPlayState: isPlaying ? 'running' : 'paused' }"
              ></span>
            </div>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <p
                class="truncate text-sm font-semibold transition-colors"
                :class="
                  currentTrack?.id === station.id
                    ? 'text-rose-300 font-bold'
                    : getStationStatus(station.id) === 'offline'
                      ? 'text-zinc-400 group-hover:text-zinc-200'
                      : 'text-zinc-100 group-hover:text-rose-300'
                "
              >
                {{ station.title }}
              </p>
              <span
                v-if="station.bitrate"
                class="shrink-0 rounded bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-400 ring-1 ring-rose-500/30"
              >
                {{ station.bitrate }}K
              </span>
              <span
                v-else-if="station.codec"
                class="shrink-0 rounded bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-400 ring-1 ring-rose-500/30"
              >
                {{ station.codec }}
              </span>
            </div>
            <p class="truncate text-xs text-zinc-400">{{ station.artist || 'Live Radio' }}</p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <!-- Network Strength Badge -->
          <div
            v-if="getStationStatus(station.id) !== 'offline'"
            class="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 transition"
            :class="
              getNetworkStrength(station.id) === 'excellent'
                ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/25'
                : getNetworkStrength(station.id) === 'good'
                  ? 'bg-teal-500/10 text-teal-400 ring-teal-500/25'
                  : getNetworkStrength(station.id) === 'fair'
                    ? 'bg-amber-500/10 text-amber-400 ring-amber-500/25'
                    : 'bg-zinc-800/80 text-zinc-400 ring-white/10'
            "
            :title="
              getStationLatency(station.id)
                ? `Network Ping: ${getStationLatency(station.id)}ms (${getNetworkStrength(station.id)})`
                : 'Stream Signal: Good'
            "
          >
            <SignalHigh
              v-if="getNetworkStrength(station.id) === 'excellent'"
              :size="12"
              class="text-emerald-400"
            />
            <SignalMedium
              v-else-if="getNetworkStrength(station.id) === 'good'"
              :size="12"
              class="text-teal-400"
            />
            <SignalLow
              v-else-if="getNetworkStrength(station.id) === 'fair' || getNetworkStrength(station.id) === 'poor'"
              :size="12"
              class="text-amber-400"
            />
            <SignalZero
              v-else
              :size="12"
              class="text-zinc-500"
            />
            <span
              v-if="getStationLatency(station.id)"
              class="font-mono text-[9px] font-semibold text-zinc-300"
            >
              {{ getStationLatency(station.id) }}ms
            </span>
            <span
              v-else-if="getStationStatus(station.id) === 'online'"
              class="font-mono text-[9px] font-semibold text-emerald-400/90"
            >
              Good
            </span>
            <span
              v-else
              class="flex items-center gap-1 text-[9px] text-zinc-400 font-medium"
            >
              <span class="h-1 w-1 rounded-full bg-rose-400 animate-ping"></span>
              <span>Checking...</span>
            </span>
          </div>

          <!-- Favorite Heart Button -->
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition active:scale-90"
            :class="{ 'text-rose-500': likedIds.has(station.id) }"
            :aria-label="likedIds.has(station.id) ? 'Unlike' : 'Like'"
            @click.stop="emit('toggleLike', station.id)"
          >
            <Heart :size="15" :fill="likedIds.has(station.id) ? 'currentColor' : 'none'" />
          </button>

          <!-- Circular Play Button -->
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.08] text-white ring-1 ring-white/15 transition group-hover:bg-rose-600 group-hover:text-white active:scale-90"
            :aria-label="currentTrack?.id === station.id && isPlaying ? 'Pause' : 'Play'"
            @click.stop="emit('togglePlayback', station)"
          >
            <Pause v-if="currentTrack?.id === station.id && isPlaying" :size="14" fill="currentColor" />
            <Play v-else :size="14" fill="currentColor" class="translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

