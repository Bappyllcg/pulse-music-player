<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Grid,
  Play,
  RefreshCw,
  Search,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
  Tv,
  X,
} from 'lucide-vue-next'
import { useHorizontalScroll } from '../composables/useHorizontalScroll'
import type {
  ChannelHealthStatus,
  NetworkStrengthLevel,
  TvCategory,
  TvCategoryId,
  TvChannel,
  TvRegion,
  TvRegionId,
} from '../composables/useLiveTv'

const props = defineProps<{
  regions: TvRegion[]
  categories: TvCategory[]
  activeRegion: TvRegionId
  activeCategory: TvCategoryId
  channels: TvChannel[]
  activePlayingChannel: TvChannel | null
  isLoading: boolean
  error: string | null
  activeLabel: string
  searchQuery: string
  getChannelStatus: (id: string) => ChannelHealthStatus
  getChannelLatency: (id: string) => number | undefined
  getNetworkStrength: (id: string) => NetworkStrengthLevel
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void
  (e: 'selectRegion', id: TvRegionId): void
  (e: 'selectCategory', id: TvCategoryId): void
  (e: 'refresh'): void
  (e: 'playChannel', channel: TvChannel): void
}>()

const countryScrollRef = ref<HTMLElement | null>(null)
const categoryScrollRef = ref<HTMLElement | null>(null)

const countryScroll = useHorizontalScroll(countryScrollRef)
const categoryScroll = useHorizontalScroll(categoryScrollRef)

const isCountryGridExpanded = ref(false)
const countrySearchQuery = ref('')

const filteredRegions = computed(() => {
  const query = countrySearchQuery.value.trim().toLowerCase()
  if (!query) return props.regions
  return props.regions.filter(
    (reg) =>
      reg.label.toLowerCase().includes(query) ||
      reg.id.toLowerCase().includes(query)
  )
})

function handleSelectRegion(id: TvRegionId) {
  if (countryScroll.isDragClick()) return
  emit('selectRegion', id)
  countryScroll.scrollActiveIntoView()
}

function handleSelectCategory(id: TvCategoryId) {
  if (categoryScroll.isDragClick()) return
  emit('selectCategory', id)
  categoryScroll.scrollActiveIntoView()
}

function toggleCountryGrid() {
  isCountryGridExpanded.value = !isCountryGridExpanded.value
  if (!isCountryGridExpanded.value) {
    setTimeout(() => {
      countryScroll.scrollActiveIntoView()
    }, 100)
  }
}
</script>

<template>
  <div class="space-y-3">
    <!-- Compact Live TV Toolbar Card -->
    <div
      class="relative overflow-hidden rounded-2xl p-3 sm:p-3.5 shadow-sm backdrop-blur-xl transition-all border
             bg-gradient-to-r from-amber-50/70 via-white to-orange-50/40 border-amber-100/90 shadow-amber-100/20
             dark:bg-gradient-to-r dark:from-[#221307]/90 dark:via-[#140f09]/90 dark:to-[#08080c]/90 dark:border-white/10 dark:shadow-none"
    >
      <!-- Header Row: Title, Live indicator & Refresh -->
      <div class="relative z-10 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl
                   bg-amber-100 text-amber-700 border border-amber-200/80 shadow-2xs
                   dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30"
          >
            <Tv :size="15" />
          </div>
          <div class="min-w-0">
            <div class="flex items-baseline gap-2 flex-wrap">
              <h2 class="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                Live Television
              </h2>
              <span class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                           bg-amber-100/90 text-amber-800 border border-amber-200/70
                           dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 whitespace-nowrap">
                <span class="relative flex h-1.5 w-1.5">
                  <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                  <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                </span>
                Cinema Stream
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition active:scale-95 cursor-pointer
                 bg-white text-slate-700 border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:text-slate-900
                 dark:bg-zinc-800/90 dark:text-zinc-200 dark:border-white/10 dark:hover:bg-zinc-700 dark:hover:text-white shrink-0"
          title="Refresh TV channels"
          :disabled="isLoading"
          @click="emit('refresh')"
        >
          <RefreshCw :size="12" :class="{ 'animate-spin': isLoading }" />
          <span class="hidden sm:inline">Refresh</span>
        </button>
      </div>

      <!-- TV Channel Search Bar -->
      <div
        class="mt-2.5 flex items-center gap-2 rounded-xl px-3 py-1.5 backdrop-blur-md transition
               bg-white/90 border border-slate-200/90 shadow-2xs focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20
               dark:bg-black/40 dark:border-white/10 dark:focus-within:border-amber-500 dark:focus-within:ring-2 dark:focus-within:ring-amber-500/30 dark:focus-within:bg-black/60"
      >
        <Search :size="14" class="shrink-0 pointer-events-none text-slate-400 dark:text-zinc-400" />
        <input
          id="tv-search-input"
          name="tvSearch"
          :value="searchQuery"
          type="search"
          placeholder="Filter channels, categories, or HD/1080p..."
          class="w-full min-w-0 bg-transparent text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none dark:text-white dark:placeholder-zinc-500"
          @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="shrink-0 text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white transition active:scale-90 cursor-pointer p-0.5"
          aria-label="Clear TV search"
          @click="emit('update:searchQuery', '')"
        >
          <X :size="13" />
        </button>
      </div>
    </div>

    <!-- Country / Region Filter Section -->
    <div>
      <div class="mb-1.5 flex items-center justify-between px-1">
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
            Select Country
          </span>
          <span class="rounded-full bg-amber-100/90 dark:bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-500/30">
            {{ regions.length }}
          </span>
        </div>

        <!-- Carousel Controls & View All Toggle -->
        <div class="flex items-center gap-1">
          <template v-if="!isCountryGridExpanded">
            <button
              type="button"
              :disabled="!countryScroll.canScrollLeft.value"
              class="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
              title="Scroll left"
              aria-label="Scroll countries left"
              @click="countryScroll.scrollLeft()"
            >
              <ChevronLeft :size="14" />
            </button>
            <button
              type="button"
              :disabled="!countryScroll.canScrollRight.value"
              class="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
              title="Scroll right"
              aria-label="Scroll countries right"
              @click="countryScroll.scrollRight()"
            >
              <ChevronRight :size="14" />
            </button>
          </template>

          <button
            type="button"
            class="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 cursor-pointer
                   bg-white/85 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/90 shadow-2xs
                   dark:bg-white/[0.08] dark:hover:bg-white/[0.14] dark:text-zinc-200 dark:border-white/10 dark:hover:text-white"
            :class="{ 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-500/40': isCountryGridExpanded }"
            @click="toggleCountryGrid"
          >
            <Grid :size="11" />
            <span>{{ isCountryGridExpanded ? 'Collapse' : `All (${regions.length})` }}</span>
            <ChevronUp v-if="isCountryGridExpanded" :size="12" />
            <ChevronDown v-else :size="12" />
          </button>
        </div>
      </div>

      <!-- Mode A: Horizontal Carousel with Edge Fades -->
      <div v-if="!isCountryGridExpanded" class="relative group/carousel">
        <div
          class="pointer-events-none absolute left-0 inset-y-0 w-6 z-10 bg-gradient-to-r from-slate-50 dark:from-[#08080c] to-transparent transition-opacity duration-200"
          :class="countryScroll.canScrollLeft.value ? 'opacity-100' : 'opacity-0'"
        ></div>

        <div
          ref="countryScrollRef"
          class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 scroll-smooth select-none cursor-grab active:cursor-grabbing"
        >
          <button
            v-for="reg in regions"
            :key="reg.id"
            :data-active="activeRegion === reg.id"
            type="button"
            class="flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer border"
            :class="
              activeRegion === reg.id
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 !text-white shadow-md shadow-amber-600/30 border-amber-500 font-bold'
                : 'bg-white text-slate-700 border-slate-200 shadow-xs hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 dark:bg-zinc-900/80 dark:text-zinc-200 dark:border-white/10 dark:hover:text-white dark:hover:bg-zinc-800'
            "
            @click="handleSelectRegion(reg.id)"
          >
            <span>{{ reg.flag }}</span>
            <span>{{ reg.label }}</span>
          </button>
        </div>

        <div
          class="pointer-events-none absolute right-0 inset-y-0 w-6 z-10 bg-gradient-to-l from-slate-50 dark:from-[#08080c] to-transparent transition-opacity duration-200"
          :class="countryScroll.canScrollRight.value ? 'opacity-100' : 'opacity-0'"
        ></div>
      </div>

      <!-- Mode B: Expanded Multi-Row Grid with In-Place Search -->
      <div v-else class="space-y-2 pt-1 animate-in fade-in-50 duration-200">
        <div
          class="flex items-center gap-2 rounded-xl px-3 py-1.5 transition
                 bg-white border border-slate-200/90 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20
                 dark:bg-black/40 dark:border-white/15 dark:focus-within:ring-amber-500/30"
        >
          <Search :size="13" class="shrink-0 pointer-events-none text-slate-400 dark:text-zinc-500" />
          <input
            id="tv-country-search"
            name="tvCountrySearch"
            v-model="countrySearchQuery"
            type="text"
            placeholder="Search countries..."
            class="w-full min-w-0 bg-transparent text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none dark:text-white dark:placeholder-zinc-500"
          />
          <button
            v-if="countrySearchQuery"
            type="button"
            class="shrink-0 text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
            aria-label="Clear country search"
            @click="countrySearchQuery = ''"
          >
            <X :size="12" />
          </button>
        </div>

        <div class="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1 py-1">
          <button
            v-for="reg in filteredRegions"
            :key="reg.id"
            :data-active="activeRegion === reg.id"
            type="button"
            class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer border"
            :class="
              activeRegion === reg.id
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 !text-white shadow-md shadow-amber-600/30 border-amber-500 font-bold'
                : 'bg-white text-slate-700 border-slate-200 shadow-xs hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 dark:bg-zinc-900/80 dark:text-zinc-200 dark:border-white/10 dark:hover:text-white dark:hover:bg-zinc-800'
            "
            @click="handleSelectRegion(reg.id); isCountryGridExpanded = false"
          >
            <span>{{ reg.flag }}</span>
            <span>{{ reg.label }}</span>
          </button>
          <p v-if="filteredRegions.length === 0" class="w-full py-3 text-center text-xs text-slate-500 dark:text-zinc-400">
            No country matches “{{ countrySearchQuery }}”
          </p>
        </div>
      </div>
    </div>

    <!-- Category Filtration Sub-Bar with Horizontal Scroll -->
    <div class="relative group/categories">
      <!-- Left Edge Fade -->
      <div
        class="pointer-events-none absolute left-0 inset-y-0 w-4 z-10 bg-gradient-to-r from-slate-50 dark:from-[#08080c] to-transparent transition-opacity duration-200"
        :class="categoryScroll.canScrollLeft.value ? 'opacity-100' : 'opacity-0'"
      ></div>

      <div
        ref="categoryScrollRef"
        class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth select-none cursor-grab active:cursor-grabbing"
      >
        <button
          v-for="cat in categories"
          :key="cat.id"
          :data-active="activeCategory === cat.id"
          type="button"
          class="flex shrink-0 whitespace-nowrap items-center rounded-full px-3.5 py-1 text-xs font-semibold transition active:scale-95 cursor-pointer border"
          :class="
            activeCategory === cat.id
              ? 'bg-slate-900 !text-white font-bold shadow-md border-slate-900 dark:bg-white dark:!text-zinc-950 dark:border-white'
              : 'bg-white text-slate-600 border-slate-200 shadow-xs hover:bg-slate-50 hover:text-slate-900 dark:bg-zinc-900/80 dark:text-zinc-400 dark:border-white/10 dark:hover:text-white dark:hover:bg-zinc-800'
          "
          @click="handleSelectCategory(cat.id)"
        >
          <span>{{ cat.label }}</span>
        </button>
      </div>

      <!-- Right Edge Fade -->
      <div
        class="pointer-events-none absolute right-0 inset-y-0 w-4 z-10 bg-gradient-to-l from-slate-50 dark:from-[#08080c] to-transparent transition-opacity duration-200"
        :class="categoryScroll.canScrollRight.value ? 'opacity-100' : 'opacity-0'"
      ></div>
    </div>

    <!-- Section Header -->
    <div class="flex items-center justify-between pt-1">
      <div class="flex items-center gap-2">
        <h3 class="text-base font-bold text-slate-900 dark:text-white tracking-tight">
          {{ activeLabel }}
        </h3>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition cursor-pointer"
          title="Refresh TV channels"
          :disabled="isLoading"
          @click="emit('refresh')"
        >
          <RefreshCw :size="13" :class="{ 'animate-spin': isLoading }" />
        </button>
      </div>

      <div class="flex items-center gap-2">
        <span
          v-if="isLoading && channels.length > 0"
          class="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>
          <span>Checking feeds...</span>
        </span>
        <span v-else class="text-xs font-medium text-slate-500 dark:text-zinc-400 tabular-nums">
          {{ channels.length }} {{ channels.length === 1 ? 'channel' : 'channels' }}
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading && channels.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-3xl p-8 py-16 text-center border
             bg-white/80 border-slate-200/90 shadow-sm
             dark:bg-zinc-900/40 dark:border-zinc-800"
    >
      <div class="h-9 w-9 animate-spin rounded-full border-2 border-amber-500 border-t-transparent shadow-lg shadow-amber-500/20"></div>
      <p class="text-sm font-semibold text-slate-800 dark:text-zinc-200">Fetching live broadcast guide...</p>
      <p class="text-xs text-slate-500 dark:text-zinc-500">Connecting to iptv-org directory</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error && channels.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-3xl p-8 py-12 px-6 text-center border
             bg-white/80 border-slate-200/90 shadow-sm
             dark:bg-zinc-900/40 dark:border-zinc-800"
    >
      <Tv :size="32" class="text-slate-400 dark:text-zinc-600" />
      <p class="text-sm font-semibold text-slate-800 dark:text-zinc-200">{{ error }}</p>
      <button
        type="button"
        class="mt-1 rounded-full bg-amber-600 px-5 py-2 text-xs font-semibold !text-white shadow-lg shadow-amber-600/30 active:scale-95 hover:bg-amber-500 transition cursor-pointer"
        @click="emit('refresh')"
      >
        Retry Channels
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="channels.length === 0"
      class="flex flex-col items-center justify-center gap-2 rounded-3xl p-8 py-12 text-center border
             bg-white/80 border-slate-200/90 shadow-sm
             dark:bg-zinc-900/40 dark:border-zinc-800"
    >
      <Tv :size="32" class="text-slate-400 dark:text-zinc-600" />
      <p class="text-sm font-bold text-slate-800 dark:text-zinc-200">No TV channels found</p>
      <p class="text-xs text-slate-500 dark:text-zinc-400">Try selecting another country or category.</p>
    </div>

    <!-- Channel Grid -->
    <TransitionGroup v-else name="media-list" tag="div" class="space-y-2">
      <div
        v-for="ch in channels"
        :key="ch.id"
        class="media-card-item group flex items-center justify-between rounded-2xl p-2.5 border transition-all duration-200 active:scale-[0.99] cursor-pointer"
        :class="
          activePlayingChannel?.id === ch.id
            ? 'bg-amber-50/90 border-amber-200/90 shadow-md shadow-amber-100/50 dark:bg-amber-950/40 dark:border-amber-500/40 dark:shadow-lg dark:shadow-amber-950/20'
            : getChannelStatus(ch.id) === 'offline'
              ? 'bg-slate-100/60 border-slate-200/50 opacity-75 hover:opacity-100 dark:bg-zinc-900/30 dark:border-white/[0.03]'
              : 'bg-white/80 border-slate-200/80 hover:bg-slate-50/90 hover:border-slate-300 shadow-xs dark:bg-zinc-900/50 dark:border-white/[0.06] dark:hover:bg-zinc-800/60 dark:hover:border-white/[0.12]'
        "
        @click="emit('playChannel', ch)"
      >
        <div class="flex min-w-0 flex-1 items-center gap-3 pr-2">
          <!-- Logo frame with fallback -->
          <div
            class="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl p-1 flex items-center justify-center
                   bg-slate-100 border border-slate-200/80
                   dark:bg-zinc-950 dark:border-white/10"
          >
            <img
              v-if="ch.logo"
              :src="ch.logo"
              :alt="ch.cleanName"
              class="h-full w-full object-contain"
              loading="lazy"
              @error="(e) => ((e.target as HTMLElement).style.display = 'none')"
            />
            <Tv v-else :size="20" class="text-slate-400 dark:text-zinc-500" />
          </div>

          <!-- Channel Info -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <p
                class="truncate text-sm font-semibold transition-colors"
                :class="
                  activePlayingChannel?.id === ch.id
                    ? 'text-amber-600 dark:text-amber-400 font-bold'
                    : getChannelStatus(ch.id) === 'offline'
                      ? 'text-slate-400 group-hover:text-slate-600 dark:text-zinc-400 dark:group-hover:text-zinc-200'
                      : 'text-slate-800 group-hover:text-amber-600 dark:text-zinc-100 dark:group-hover:text-amber-300'
                "
              >
                {{ ch.cleanName }}
              </p>
              <span
                v-if="ch.resolution"
                class="shrink-0 rounded px-1.5 py-0.2 text-[9px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30"
              >
                {{ ch.resolution }}
              </span>
            </div>
            <p class="truncate text-xs text-slate-500 dark:text-zinc-400">
              {{ ch.group || 'Live Stream' }}
            </p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <!-- Network Signal Indicator -->
          <div
            v-if="getChannelStatus(ch.id) !== 'offline'"
            class="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border transition"
            :class="
              getNetworkStrength(ch.id) === 'excellent'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25'
                : getNetworkStrength(ch.id) === 'good'
                  ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/25'
                  : getNetworkStrength(ch.id) === 'fair'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800/80 dark:text-zinc-400 dark:border-white/10'
            "
            :title="
              getChannelLatency(ch.id)
                ? `Latency: ${getChannelLatency(ch.id)}ms (${getNetworkStrength(ch.id)})`
                : 'Signal Good'
            "
          >
            <SignalHigh
              v-if="getNetworkStrength(ch.id) === 'excellent'"
              :size="12"
              class="text-emerald-600 dark:text-emerald-400"
            />
            <SignalMedium
              v-else-if="getNetworkStrength(ch.id) === 'good'"
              :size="12"
              class="text-teal-600 dark:text-teal-400"
            />
            <SignalLow
              v-else-if="getNetworkStrength(ch.id) === 'fair' || getNetworkStrength(ch.id) === 'poor'"
              :size="12"
              class="text-amber-600 dark:text-amber-400"
            />
            <SignalZero
              v-else
              :size="12"
              class="text-slate-400 dark:text-zinc-500"
            />
            <span
              v-if="getChannelLatency(ch.id)"
              class="font-mono text-[9px] font-semibold text-slate-600 dark:text-zinc-300"
            >
              {{ getChannelLatency(ch.id) }}ms
            </span>
            <span
              v-else-if="getChannelStatus(ch.id) === 'online'"
              class="font-mono text-[9px] font-semibold text-emerald-600 dark:text-emerald-400/90"
            >
              Live
            </span>
          </div>

          <!-- Play / Watch Button -->
          <div
            class="flex h-9 w-9 items-center justify-center rounded-full transition active:scale-90 cursor-pointer
                   bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-amber-600 group-hover:!text-white group-hover:border-amber-600
                   dark:bg-white/[0.08] dark:text-white dark:border-white/10 dark:group-hover:bg-amber-600 dark:group-hover:text-white"
          >
            <div
              v-if="activePlayingChannel?.id === ch.id"
              class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            ></div>
            <Play v-else :size="14" fill="currentColor" class="translate-x-0.5" />
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>
