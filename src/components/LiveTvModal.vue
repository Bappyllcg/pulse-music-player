<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Hls from 'hls.js'
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  PictureInPicture,
  RefreshCw,
  Tv,
  X,
} from 'lucide-vue-next'
import {
  TV_REGIONS,
  sanitizeStreamUrl,
  useLiveTv,
  type TvChannel,
} from '../composables/useLiveTv'

const props = defineProps<{
  channel: TvChannel | null
  channels: TvChannel[]
}>()

const { getChannelStatus, setChannelStatus } = useLiveTv()

const countryInfo = computed(() => {
  const reg = TV_REGIONS.find((r) => r.id === props.channel?.country)
  return reg ? `${reg.flag} ${reg.label}` : 'Live TV'
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'selectChannel', channel: TvChannel): void
  (e: 'next'): void
  (e: 'prev'): void
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const playerContainerRef = ref<HTMLDivElement | null>(null)
const isBuffering = ref(true)
const streamError = ref<string | null>(null)
const isFullscreen = ref(false)
const showChannelDrawer = ref(true)

let hlsInstance: Hls | null = null

function cleanUpHls(): void {
  if (hlsInstance) {
    hlsInstance.destroy()
    hlsInstance = null
  }
}

function loadChannelStream(channel: TvChannel): void {
  cleanUpHls()
  isBuffering.value = true
  streamError.value = null

  const video = videoRef.value
  if (!video) return

  const streamUrl = sanitizeStreamUrl(channel.url)
  if (!streamUrl) {
    isBuffering.value = false
    setChannelStatus(channel.id, 'offline')
    streamError.value =
      'This stream uses unencrypted HTTP (raw IP) and cannot be loaded over HTTPS due to browser security restrictions. Tap Next Channel to continue.'
    return
  }

  let networkRetryCount = 0

  if (Hls.isSupported()) {
    hlsInstance = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 60,
    })

    hlsInstance.loadSource(streamUrl)
    hlsInstance.attachMedia(video)

    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      isBuffering.value = false
      void video.play().catch(() => {})
    })

    hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            networkRetryCount++
            if (networkRetryCount <= 2) {
              hlsInstance?.startLoad()
            } else {
              cleanUpHls()
              setChannelStatus(channel.id, 'offline')
              streamError.value =
                'Stream connection failed. This channel may be temporarily offline or restricted by CORS.'
              isBuffering.value = false
            }
            break
          case Hls.ErrorTypes.MEDIA_ERROR:
            hlsInstance?.recoverMediaError()
            break
          default:
            cleanUpHls()
            setChannelStatus(channel.id, 'offline')
            streamError.value = 'Stream connection lost. This channel may be temporarily offline.'
            isBuffering.value = false
            break
        }
      }
    })
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // Native Safari / iOS HLS
    video.src = streamUrl
    video.addEventListener(
      'loadedmetadata',
      () => {
        isBuffering.value = false
        void video.play().catch(() => {})
      },
      { once: true },
    )
    video.addEventListener('error', () => {
      setChannelStatus(channel.id, 'offline')
      streamError.value = 'Unable to stream this channel. Format or CORS error.'
      isBuffering.value = false
    })
  } else {
    streamError.value = 'HLS streaming is not supported on this browser.'
    isBuffering.value = false
  }
}

function onVideoPlaying(): void {
  isBuffering.value = false
  streamError.value = null
  if (props.channel) {
    setChannelStatus(props.channel.id, 'online')
  }
}

watch(
  () => props.channel,
  (newChan) => {
    if (newChan) {
      loadChannelStream(newChan)
    } else {
      cleanUpHls()
    }
  },
  { immediate: true },
)

function toggleFullscreen(): void {
  const container = playerContainerRef.value
  if (!container) return

  if (!document.fullscreenElement) {
    void container.requestFullscreen().then(() => {
      isFullscreen.value = true
    }).catch(() => {})
  } else {
    void document.exitFullscreen().then(() => {
      isFullscreen.value = false
    }).catch(() => {})
  }
}

function togglePictureInPicture(): void {
  const video = videoRef.value
  if (!video) return

  if (document.pictureInPictureElement) {
    void document.exitPictureInPicture().catch(() => {})
  } else if (document.pictureInPictureEnabled && typeof video.requestPictureInPicture === 'function') {
    void video.requestPictureInPicture().catch(() => {})
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    emit('close')
  } else if (e.key === 'ArrowRight') {
    emit('next')
  } else if (e.key === 'ArrowLeft') {
    emit('prev')
  } else if (e.key === 'f' || e.key === 'F') {
    toggleFullscreen()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
  })
})

onBeforeUnmount(() => {
  cleanUpHls()
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    v-if="channel"
    ref="playerContainerRef"
    class="fixed inset-0 z-50 flex flex-col bg-zinc-950/98 text-white backdrop-blur-2xl transition-all"
  >
    <!-- Top Bar with Channel Branding & Controls -->
    <header class="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-zinc-900/80 backdrop-blur-md">
      <!-- Channel Info -->
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div class="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-zinc-800 ring-1 ring-white/10 flex items-center justify-center p-1">
          <img
            v-if="channel.logo"
            :src="channel.logo"
            :alt="channel.cleanName"
            class="h-full w-full object-contain"
            @error="(e) => ((e.target as HTMLElement).style.display = 'none')"
          />
          <Tv v-else :size="18" class="text-zinc-400" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h2 class="truncate text-sm font-bold text-white tracking-tight">
              {{ channel.cleanName }}
            </h2>
            <span
              v-if="channel.resolution"
              class="shrink-0 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300 ring-1 ring-cyan-500/30"
            >
              {{ channel.resolution }}
            </span>
            <!-- Status Badge -->
            <span
              v-if="getChannelStatus(channel.id) === 'offline'"
              class="inline-flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold text-zinc-400 ring-1 ring-white/10"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-zinc-500"></span>
              OFFLINE
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1 rounded bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-400 ring-1 ring-rose-500/30"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              LIVE
            </span>
          </div>
          <p class="truncate text-xs text-zinc-400">
            {{ countryInfo }}
            <span v-if="channel.group" class="text-zinc-500"> • {{ channel.group }}</span>
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-1.5 shrink-0">
        <!-- PiP -->
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-300 ring-1 ring-white/10 hover:text-white active:scale-95 transition"
          title="Picture in Picture"
          @click="togglePictureInPicture"
        >
          <PictureInPicture :size="16" />
        </button>

        <!-- Fullscreen -->
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-300 ring-1 ring-white/10 hover:text-white active:scale-95 transition"
          :title="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'"
          @click="toggleFullscreen"
        >
          <Minimize v-if="isFullscreen" :size="16" />
          <Maximize v-else :size="16" />
        </button>

        <!-- Close -->
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-300 ring-1 ring-white/10 hover:bg-rose-500 hover:text-white active:scale-95 transition"
          title="Close TV Player"
          @click="emit('close')"
        >
          <X :size="18" />
        </button>
      </div>
    </header>

    <!-- Main Video Screen Area -->
    <div class="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
      <video
        ref="videoRef"
        class="h-full w-full object-contain"
        autoplay
        playsinline
        controls
        @waiting="isBuffering = true"
        @playing="onVideoPlaying"
      ></video>

      <!-- Buffering Spinner Overlay -->
      <div
        v-if="isBuffering && !streamError"
        class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <div class="h-10 w-10 animate-spin rounded-full border-3 border-indigo-500 border-t-transparent"></div>
        <p class="mt-3 text-xs font-semibold text-zinc-300">Tuning in live stream...</p>
      </div>

      <!-- Stream Error Overlay -->
      <div
        v-if="streamError"
        class="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 p-6 text-center"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-rose-400 ring-1 ring-red-500/30">
          <Tv :size="24" />
        </div>
        <h3 class="mt-3 text-sm font-bold text-white">Stream Unavailable</h3>
        <p class="mt-1 max-w-xs text-xs text-zinc-400">{{ streamError }}</p>
        <div class="mt-4 flex items-center gap-3">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md active:scale-95 hover:bg-indigo-500"
            @click="loadChannelStream(channel)"
          >
            <RefreshCw :size="13" />
            <span>Retry</span>
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 ring-1 ring-white/10 active:scale-95 hover:bg-zinc-700"
            @click="emit('next')"
          >
            <span>Next Channel</span>
            <ChevronRight :size="13" />
          </button>
        </div>
      </div>

      <!-- Quick Zapping Navigation Floating Overlays -->
      <button
        type="button"
        class="group absolute left-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white/70 ring-1 ring-white/10 backdrop-blur-md transition hover:bg-black/90 hover:text-white active:scale-90"
        title="Previous Channel (Left Arrow)"
        @click="emit('prev')"
      >
        <ChevronLeft :size="20" />
      </button>

      <button
        type="button"
        class="group absolute right-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white/70 ring-1 ring-white/10 backdrop-blur-md transition hover:bg-black/90 hover:text-white active:scale-90"
        title="Next Channel (Right Arrow)"
        @click="emit('next')"
      >
        <ChevronRight :size="20" />
      </button>
    </div>

    <!-- Bottom Channel Zapping Bar -->
    <div
      v-if="showChannelDrawer && channels.length > 1"
      class="border-t border-white/10 bg-zinc-900/95 px-4 py-2.5 backdrop-blur-lg"
    >
      <div class="mb-2 flex items-center justify-between">
        <span class="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          Channels in list ({{ channels.length }})
        </span>
        <span class="text-[11px] text-zinc-500">Tap to zap channel</span>
      </div>

      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <button
          v-for="ch in channels"
          :key="ch.id"
          type="button"
          class="flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition active:scale-95"
          :class="
            ch.id === channel.id
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
              : 'bg-zinc-800/80 text-zinc-300 ring-1 ring-white/5 hover:bg-zinc-700 hover:text-white'
          "
          @click="emit('selectChannel', ch)"
        >
          <img
            v-if="ch.logo"
            :src="ch.logo"
            :alt="ch.cleanName"
            class="h-4 w-4 object-contain rounded"
            @error="(e) => ((e.target as HTMLElement).style.display = 'none')"
          />
          <span class="truncate max-w-[120px]">{{ ch.cleanName }}</span>
          <span
            v-if="getChannelStatus(ch.id) === 'offline'"
            class="rounded bg-zinc-900/90 px-1.5 py-0.5 text-[8px] font-bold text-zinc-400 ring-1 ring-white/10"
          >
            Offline
          </span>
          <span
            v-else-if="ch.resolution"
            class="rounded bg-black/40 px-1 py-0.2 text-[8px] font-bold"
          >
            {{ ch.resolution }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
