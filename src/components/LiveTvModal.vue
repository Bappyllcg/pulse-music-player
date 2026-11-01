<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Hls from 'hls.js'
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture,
  Play,
  RefreshCw,
  Scan,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
  SlidersHorizontal,
  Tv,
  Volume2,
  VolumeX,
  X,
} from 'lucide-vue-next'
import {
  TV_REGIONS,
  sanitizeStreamUrl,
  useLiveTv,
  type TvChannel,
} from '../composables/useLiveTv'
import { useHorizontalScroll } from '../composables/useHorizontalScroll'

const props = defineProps<{
  channel: TvChannel | null
  channels: TvChannel[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'selectChannel', channel: TvChannel): void
  (e: 'next'): void
  (e: 'prev'): void
}>()

const {
  getChannelStatus,
  setChannelStatus,
  getChannelLatency,
  setChannelLatency,
  getChannelNetworkStrength,
} = useLiveTv()

const videoRef = ref<HTMLVideoElement | null>(null)
const playerContainerRef = ref<HTMLDivElement | null>(null)
const isBuffering = ref(true)
const isPlayingVideo = ref(false)
const streamError = ref<string | null>(null)
const isFullscreen = ref(false)
const showChannelDrawer = ref(true)
const zappingGuideContainerRef = ref<HTMLDivElement | null>(null)
const zappingScroll = useHorizontalScroll(zappingGuideContainerRef)

// Glassmorphic Player UI state
const areControlsVisible = ref(true)
let idleTimeout: number | undefined
const isMuted = ref(false)
const volume = ref(1)

// Aspect Ratio Modes: 'fit' | '16:9' | '4:3' | 'fill'
export type AspectRatioMode = 'fit' | '16:9' | '4:3' | 'fill'
const activeAspectRatio = ref<AspectRatioMode>('fit')
const showAspectMenu = ref(false)

// Multi-bitrate Quality Selection
interface StreamQualityLevel {
  index: number // -1 for Auto
  name: string
  bitrate: number
  height: number
  width: number
}
const qualityLevels = ref<StreamQualityLevel[]>([])
const currentQualityIndex = ref<number>(-1)
const showQualityMenu = ref(false)
const activeBitrateText = ref('')

// Telemetry & Stats HUD
const showStatsHud = ref(false)
const statsResolution = ref('--')
const statsBufferSec = ref(0)
const statsBitrate = ref('--')
const statsFps = ref(0)
const statsDroppedFrames = ref(0)
let statsInterval: number | undefined

// Channel Zap OSD Banner (Apple TV / Set-top box style)
const showZapBanner = ref(false)
let zapBannerTimer: number | undefined

// Center Screen Action Ripple
const centerActionIcon = ref<'play' | 'pause' | null>(null)
let centerActionTimer: number | undefined

// Auto-Skip on Offline / Dead Streams
const autoSkipCountdown = ref<number | null>(null)
let autoSkipTimer: number | undefined

let hlsInstance: Hls | null = null

const countryInfo = computed(() => {
  const reg = TV_REGIONS.find((r) => r.id === props.channel?.country)
  return reg ? `${reg.flag} ${reg.label}` : 'Live TV'
})

const videoClass = computed(() => {
  switch (activeAspectRatio.value) {
    case '16:9':
      return 'w-full h-full object-fill aspect-video'
    case '4:3':
      return 'h-full aspect-[4/3] object-fill mx-auto'
    case 'fill':
      return 'w-full h-full object-cover'
    case 'fit':
    default:
      return 'w-full h-full object-contain'
  }
})

const currentQualityLabel = computed(() => {
  if (currentQualityIndex.value === -1) {
    return activeBitrateText.value ? `Auto (${activeBitrateText.value})` : 'Auto'
  }
  const found = qualityLevels.value.find((q) => q.index === currentQualityIndex.value)
  return found ? found.name : 'Auto'
})

// Auto-hiding control bar timer
function resetIdleTimer(): void {
  areControlsVisible.value = true
  if (idleTimeout) {
    window.clearTimeout(idleTimeout)
    idleTimeout = undefined
  }
  if (isPlayingVideo.value && !showQualityMenu.value && !showAspectMenu.value) {
    idleTimeout = window.setTimeout(() => {
      areControlsVisible.value = false
    }, 3500)
  }
}

function cancelAutoSkip(): void {
  if (autoSkipTimer) {
    window.clearInterval(autoSkipTimer)
    autoSkipTimer = undefined
  }
  autoSkipCountdown.value = null
}

function triggerAutoSkip(): void {
  cancelAutoSkip()
  autoSkipCountdown.value = 2
  autoSkipTimer = window.setInterval(() => {
    if (autoSkipCountdown.value === null) {
      cancelAutoSkip()
      return
    }
    autoSkipCountdown.value--
    if (autoSkipCountdown.value <= 0) {
      cancelAutoSkip()
      emit('next')
    }
  }, 1000)
}

function triggerZapBanner(): void {
  showZapBanner.value = true
  if (zapBannerTimer) window.clearTimeout(zapBannerTimer)
  zapBannerTimer = window.setTimeout(() => {
    showZapBanner.value = false
  }, 3500)
}

function triggerCenterAction(type: 'play' | 'pause'): void {
  centerActionIcon.value = type
  if (centerActionTimer) window.clearTimeout(centerActionTimer)
  centerActionTimer = window.setTimeout(() => {
    centerActionIcon.value = null
  }, 600)
}

function cleanUpHls(): void {
  cancelAutoSkip()
  if (idleTimeout) window.clearTimeout(idleTimeout)
  if (zapBannerTimer) window.clearTimeout(zapBannerTimer)
  if (centerActionTimer) window.clearTimeout(centerActionTimer)
  if (statsInterval) window.clearInterval(statsInterval)

  if (hlsInstance) {
    hlsInstance.destroy()
    hlsInstance = null
  }
}

function togglePlayPause(): void {
  const video = videoRef.value
  if (!video) return

  if (video.paused) {
    void video.play().then(() => {
      isPlayingVideo.value = true
      triggerCenterAction('play')
      resetIdleTimer()
    }).catch(() => {})
  } else {
    video.pause()
    isPlayingVideo.value = false
    triggerCenterAction('pause')
    areControlsVisible.value = true
  }
}

function jumpToLiveEdge(): void {
  const video = videoRef.value
  if (!video) return
  try {
    if (video.seekable && video.seekable.length > 0) {
      video.currentTime = video.seekable.end(video.seekable.length - 1)
    }
  } catch {}
}

function setAspectRatio(mode: AspectRatioMode): void {
  activeAspectRatio.value = mode
  showAspectMenu.value = false
  resetIdleTimer()
}

function selectQuality(index: number): void {
  if (!hlsInstance) return
  hlsInstance.currentLevel = index
  currentQualityIndex.value = index
  showQualityMenu.value = false
  resetIdleTimer()
}

function toggleMute(): void {
  const video = videoRef.value
  if (!video) return
  isMuted.value = !isMuted.value
  video.muted = isMuted.value
  resetIdleTimer()
}

function onVolumeInput(e: Event): void {
  const val = Number((e.target as HTMLInputElement).value)
  volume.value = val
  const video = videoRef.value
  if (video) {
    video.volume = val
    if (val === 0) {
      isMuted.value = true
      video.muted = true
    } else if (isMuted.value) {
      isMuted.value = false
      video.muted = false
    }
  }
  resetIdleTimer()
}

function updateStats(): void {
  const video = videoRef.value
  if (!video) return

  if (video.videoWidth && video.videoHeight) {
    statsResolution.value = `${video.videoWidth}x${video.videoHeight}`
  }

  // Calculate live buffer ahead in seconds
  let bufSecs = 0
  if (video.buffered && video.buffered.length > 0) {
    for (let i = 0; i < video.buffered.length; i++) {
      if (video.buffered.start(i) <= video.currentTime && video.buffered.end(i) >= video.currentTime) {
        bufSecs = Math.max(0, video.buffered.end(i) - video.currentTime)
        break
      }
    }
  }
  statsBufferSec.value = Number(bufSecs.toFixed(1))

  // Frame stats
  if (typeof (video as any).getVideoPlaybackQuality === 'function') {
    const q = (video as any).getVideoPlaybackQuality()
    statsDroppedFrames.value = q.droppedVideoFrames || 0
    statsFps.value = Math.round(q.totalVideoFrames > 0 ? 30 : 0)
  }
}

async function loadChannelStream(channel: TvChannel): Promise<void> {
  cleanUpHls()
  isBuffering.value = true
  isPlayingVideo.value = false
  streamError.value = null
  qualityLevels.value = []
  currentQualityIndex.value = -1
  activeBitrateText.value = ''
  showQualityMenu.value = false
  showAspectMenu.value = false
  triggerZapBanner()
  resetIdleTimer()

  if (!videoRef.value) {
    await nextTick()
  }

  const video = videoRef.value
  if (!video) return

  const streamUrl = sanitizeStreamUrl(channel.url)
  if (!streamUrl) {
    isBuffering.value = false
    setChannelStatus(channel.id, 'offline')
    streamError.value =
      'This stream uses unencrypted HTTP (raw IP) and cannot be loaded over HTTPS due to browser security restrictions.'
    triggerAutoSkip()
    return
  }

  let networkRetryCount = 0
  const loadStartTime = performance.now()

  if (Hls.isSupported()) {
    hlsInstance = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      // Keep live edge latency tight
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 6,
      // Progressive playback start
      progressive: true,
      // Buffer optimization
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      startFragPrefetch: true,
      // ABR & Screen Resolution Fitting
      capLevelToPlayerSize: true,
      // Error Recovery
      highBufferWatchdogPeriod: 2,
    })

    hlsInstance.loadSource(streamUrl)
    hlsInstance.attachMedia(video)

    hlsInstance.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
      setChannelStatus(channel.id, 'online')
      const ping = Math.round(performance.now() - loadStartTime)
      if (ping > 0 && ping < 6000) {
        setChannelLatency(channel.id, ping)
      }

      // Extract multi-bitrate quality levels
      if (data.levels && data.levels.length > 0) {
        const lvls: StreamQualityLevel[] = [
          { index: -1, name: 'Auto', bitrate: 0, height: 0, width: 0 },
        ]
        data.levels.forEach((lvl, idx) => {
          const height = lvl.height || 0
          const width = lvl.width || 0
          const name = height ? `${height}p` : lvl.name || `Quality ${idx + 1}`
          lvls.push({
            index: idx,
            name,
            bitrate: lvl.bitrate || 0,
            height,
            width,
          })
        })
        qualityLevels.value = lvls
      }

      // Autoplay with safe muted fallback
      void video.play().catch(() => {
        isMuted.value = true
        video.muted = true
        void video.play().catch(() => {})
      })
    })

    hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
      if (hlsInstance && hlsInstance.levels[data.level]) {
        const lvl = hlsInstance.levels[data.level]
        if (lvl.height) {
          activeBitrateText.value = `${lvl.height}p`
        }
        if (lvl.bitrate) {
          statsBitrate.value = `${Math.round(lvl.bitrate / 1000)} kbps`
        }
      }
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
              triggerAutoSkip()
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
            triggerAutoSkip()
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
        setChannelStatus(channel.id, 'online')
        const ping = Math.round(performance.now() - loadStartTime)
        if (ping > 0 && ping < 6000) {
          setChannelLatency(channel.id, ping)
        }
        void video.play().catch(() => {
          isMuted.value = true
          video.muted = true
          void video.play().catch(() => {})
        })
      },
      { once: true },
    )
    video.addEventListener('error', () => {
      setChannelStatus(channel.id, 'offline')
      streamError.value = 'Unable to stream this channel. Format or CORS error.'
      isBuffering.value = false
      triggerAutoSkip()
    })
  } else {
    streamError.value = 'HLS streaming is not supported on this browser.'
    isBuffering.value = false
  }

  // Poll stream diagnostics HUD every second
  statsInterval = window.setInterval(updateStats, 1000)
}

function onVideoPlaying(): void {
  cancelAutoSkip()
  isBuffering.value = false
  isPlayingVideo.value = true
  streamError.value = null
  if (props.channel) {
    setChannelStatus(props.channel.id, 'online')
  }
  resetIdleTimer()
}

function scrollToActiveChannel(smooth = true): void {
  if (!props.channel) return
  nextTick(() => {
    const container = zappingGuideContainerRef.value
    if (!container) return
    const activeEl = container.querySelector<HTMLElement>(`[data-channel-id="${props.channel?.id}"]`)
    if (activeEl) {
      const containerWidth = container.clientWidth
      const elOffsetLeft = activeEl.offsetLeft
      const elWidth = activeEl.offsetWidth
      const targetScrollLeft = elOffsetLeft - (containerWidth / 2) + (elWidth / 2)

      container.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: smooth ? 'smooth' : 'auto',
      })
    }
  })
}

function handleSelectChannel(ch: TvChannel): void {
  if (zappingScroll.isDragClick()) return
  emit('selectChannel', ch)
  scrollToActiveChannel(true)
}

watch(
  () => props.channel?.id,
  (newId, oldId) => {
    if (newId && newId !== oldId && props.channel) {
      void loadChannelStream(props.channel)
      scrollToActiveChannel(true)
    } else if (!newId) {
      cleanUpHls()
    }
  },
)

watch(showChannelDrawer, (isOpen) => {
  if (isOpen) {
    setTimeout(() => {
      scrollToActiveChannel(true)
    }, 60)
  }
})

watch(
  () => props.channels.length,
  () => {
    setTimeout(() => {
      scrollToActiveChannel(false)
    }, 60)
  },
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
  resetIdleTimer()
  if (e.key === 'Escape') {
    if (showQualityMenu.value || showAspectMenu.value) {
      showQualityMenu.value = false
      showAspectMenu.value = false
    } else {
      emit('close')
    }
  } else if (e.key === 'ArrowRight') {
    emit('next')
  } else if (e.key === 'ArrowLeft') {
    emit('prev')
  } else if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
    togglePlayPause()
  } else if (e.key === 'f' || e.key === 'F') {
    toggleFullscreen()
  } else if (e.key === 'm' || e.key === 'M') {
    toggleMute()
  } else if (e.key === 'd' || e.key === 'D') {
    showStatsHud.value = !showStatsHud.value
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
  })

  // Ensure DOM is ready, then load channel immediately on 1st mount
  await nextTick()
  if (props.channel) {
    void loadChannelStream(props.channel)
    setTimeout(() => {
      scrollToActiveChannel(false)
    }, 150)
  }
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
    class="live-tv-modal fixed inset-0 z-50 flex flex-col bg-black text-white select-none overflow-hidden"
    @mousemove="resetIdleTimer"
    @touchstart="resetIdleTimer"
  >
    <!-- Top Pro Glassmorphic Header -->
    <header
      class="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300"
      :class="areControlsVisible || !isPlayingVideo || streamError ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
    >
      <!-- Channel Identity -->
      <div class="flex items-center gap-3 min-w-0 flex-1 pr-3">
        <div class="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-zinc-900/90 ring-1 ring-white/15 flex items-center justify-center p-1 shadow-lg shadow-black/50">
          <img
            v-if="channel.logo"
            :src="channel.logo"
            :alt="channel.cleanName"
            class="h-full w-full object-contain"
            @error="(e) => ((e.target as HTMLElement).style.display = 'none')"
          />
          <Tv v-else :size="20" class="text-zinc-400" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h2 class="truncate text-base font-bold text-white tracking-tight">
              {{ channel.cleanName }}
            </h2>
            <span
              v-if="channel.resolution"
              class="shrink-0 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300 ring-1 ring-cyan-500/30"
            >
              {{ channel.resolution }}
            </span>
            <!-- Loading Indicator Pill -->
            <span
              v-if="isBuffering && !streamError"
              class="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/25 px-2 py-0.5 text-[9px] font-bold text-indigo-300 ring-1 ring-indigo-400/40"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping"></span>
              <span>Loading...</span>
            </span>

            <!-- Signal Strength Pill -->
            <span
              v-else-if="getChannelStatus(channel.id) === 'offline'"
              class="inline-flex items-center gap-1 rounded bg-zinc-800/90 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 ring-1 ring-amber-500/20"
            >
              <SignalZero :size="10" class="text-amber-500/80" />
              OFFLINE
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-zinc-300 ring-1 ring-white/10"
              :title="getChannelLatency(channel.id) ? `Ping: ${getChannelLatency(channel.id)}ms (${getChannelNetworkStrength(channel.id)})` : 'Network Strength: Good'"
            >
              <SignalHigh v-if="getChannelNetworkStrength(channel.id) === 'excellent'" :size="11" class="text-emerald-400" />
              <SignalMedium v-else-if="getChannelNetworkStrength(channel.id) === 'good'" :size="11" class="text-teal-400" />
              <SignalLow v-else-if="getChannelNetworkStrength(channel.id) === 'fair' || getChannelNetworkStrength(channel.id) === 'poor'" :size="11" class="text-amber-400" />
              <SignalZero v-else :size="11" class="text-zinc-500" />
              <span v-if="getChannelLatency(channel.id)" class="font-mono text-[9px] text-zinc-300">
                {{ getChannelLatency(channel.id) }}ms
              </span>
            </span>
          </div>
          <p class="truncate text-xs text-zinc-400">
            {{ countryInfo }}
            <span v-if="channel.group" class="text-zinc-500"> • {{ channel.group }}</span>
          </p>
        </div>
      </div>

      <!-- Action & Setting Controls -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Aspect Ratio Button -->
        <div class="relative">
          <button
            type="button"
            class="flex h-9 items-center gap-1.5 rounded-full bg-zinc-900/80 px-3 text-xs font-semibold text-zinc-200 ring-1 ring-white/10 hover:text-white hover:bg-zinc-800 active:scale-95 transition backdrop-blur-md"
            title="Aspect Ratio"
            @click.stop="showAspectMenu = !showAspectMenu; showQualityMenu = false"
          >
            <Scan :size="14" />
            <span class="uppercase tracking-wider text-[11px]">{{ activeAspectRatio }}</span>
          </button>

          <!-- Aspect Ratio Dropdown Menu -->
          <div
            v-if="showAspectMenu"
            class="absolute right-0 top-11 z-40 w-36 overflow-hidden rounded-2xl bg-zinc-900/95 p-1 text-xs shadow-2xl ring-1 ring-white/15 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
          >
            <p class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Aspect Ratio</p>
            <button
              v-for="opt in [
                { id: 'fit', label: 'Fit (Original)' },
                { id: '16:9', label: '16:9 Wide' },
                { id: '4:3', label: '4:3 Classic TV' },
                { id: 'fill', label: 'Fill / Zoom' },
              ]"
              :key="opt.id"
              type="button"
              class="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left font-medium transition"
              :class="activeAspectRatio === opt.id ? 'bg-indigo-600 text-white font-semibold' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'"
              @click="setAspectRatio(opt.id as AspectRatioMode)"
            >
              <span>{{ opt.label }}</span>
              <span v-if="activeAspectRatio === opt.id" class="text-[10px]">✓</span>
            </button>
          </div>
        </div>

        <!-- Multi-Bitrate Quality Selector -->
        <div v-if="qualityLevels.length > 1" class="relative">
          <button
            type="button"
            class="flex h-9 items-center gap-1.5 rounded-full bg-zinc-900/80 px-3 text-xs font-semibold text-zinc-200 ring-1 ring-white/10 hover:text-white hover:bg-zinc-800 active:scale-95 transition backdrop-blur-md"
            title="Stream Quality"
            @click.stop="showQualityMenu = !showQualityMenu; showAspectMenu = false"
          >
            <SlidersHorizontal :size="14" />
            <span class="text-[11px]">{{ currentQualityLabel }}</span>
          </button>

          <!-- Quality Dropdown Menu -->
          <div
            v-if="showQualityMenu"
            class="absolute right-0 top-11 z-40 w-44 max-h-64 overflow-y-auto rounded-2xl bg-zinc-900/95 p-1 text-xs shadow-2xl ring-1 ring-white/15 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 no-scrollbar"
          >
            <p class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Stream Quality</p>
            <button
              v-for="lvl in qualityLevels"
              :key="lvl.index"
              type="button"
              class="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left font-medium transition"
              :class="currentQualityIndex === lvl.index ? 'bg-indigo-600 text-white font-semibold' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'"
              @click="selectQuality(lvl.index)"
            >
              <span>{{ lvl.name }}</span>
              <span v-if="lvl.bitrate" class="text-[10px] text-zinc-400">
                {{ Math.round(lvl.bitrate / 1000) }}k
              </span>
              <span v-if="currentQualityIndex === lvl.index" class="text-[10px]">✓</span>
            </button>
          </div>
        </div>

        <!-- Telemetry Stats HUD Button -->
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 ring-1 ring-white/10 hover:text-white active:scale-95 transition backdrop-blur-md"
          :class="showStatsHud ? 'bg-indigo-600 text-white ring-indigo-500' : ''"
          title="Toggle Stream Diagnostics (Key: D)"
          @click="showStatsHud = !showStatsHud"
        >
          <Activity :size="16" />
        </button>

        <!-- Picture-in-Picture -->
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 ring-1 ring-white/10 hover:text-white active:scale-95 transition backdrop-blur-md"
          title="Picture in Picture"
          @click="togglePictureInPicture"
        >
          <PictureInPicture :size="16" />
        </button>

        <!-- Fullscreen -->
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 ring-1 ring-white/10 hover:text-white active:scale-95 transition backdrop-blur-md"
          :title="isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'"
          @click="toggleFullscreen"
        >
          <Minimize v-if="isFullscreen" :size="16" />
          <Maximize v-else :size="16" />
        </button>

        <!-- Close Player -->
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 ring-1 ring-white/10 hover:bg-rose-600 hover:text-white active:scale-95 transition backdrop-blur-md"
          title="Close TV Player (Esc)"
          @click="emit('close')"
        >
          <X :size="18" />
        </button>
      </div>
    </header>

    <!-- Main Screen Stage Area -->
    <div
      class="relative flex-1 bg-black flex items-center justify-center overflow-hidden cursor-pointer"
      @click="togglePlayPause"
    >
      <!-- HTML5 Video Component with Pro Engine Settings -->
      <video
        ref="videoRef"
        :class="videoClass"
        autoplay
        playsinline
        webkit-playsinline
        preload="auto"
        @loadstart="isBuffering = true"
        @waiting="isBuffering = true"
        @playing="onVideoPlaying"
        @pause="isPlayingVideo = false"
      ></video>

      <!-- Center Screen Action Ripple Indicator -->
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="scale-75 opacity-0"
        enter-to-class="scale-100 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="scale-100 opacity-100"
        leave-to-class="scale-125 opacity-0"
      >
        <div
          v-if="centerActionIcon"
          class="pointer-events-none absolute flex h-20 w-20 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md ring-1 ring-white/20 shadow-2xl"
        >
          <Play v-if="centerActionIcon === 'play'" :size="36" fill="currentColor" class="translate-x-0.5" />
          <Pause v-else :size="36" fill="currentColor" />
        </div>
      </transition>

      <!-- TV-Style Channel Zap OSD Banner -->
      <transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="-translate-y-4 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-300 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="-translate-y-4 opacity-0"
      >
        <div
          v-if="showZapBanner"
          class="pointer-events-none absolute top-16 left-6 z-20 flex items-center gap-3 rounded-2xl bg-zinc-950/85 px-4 py-2.5 ring-1 ring-white/15 backdrop-blur-xl shadow-2xl"
        >
          <img
            v-if="channel.logo"
            :src="channel.logo"
            :alt="channel.cleanName"
            class="h-8 w-8 object-contain rounded-lg"
          />
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-white">{{ channel.cleanName }}</span>
              <span class="rounded bg-rose-500/20 px-1 py-0.2 text-[8px] font-bold text-rose-300">LIVE</span>
            </div>
            <p class="text-[11px] text-zinc-400">{{ countryInfo }} • {{ channel.group || 'Live TV' }}</p>
          </div>
        </div>
      </transition>

      <!-- Telemetry Stream Stats HUD Overlay -->
      <div
        v-if="showStatsHud"
        class="absolute top-16 right-6 z-20 w-56 rounded-2xl bg-zinc-950/90 p-3 text-[11px] ring-1 ring-indigo-500/40 backdrop-blur-xl shadow-2xl font-mono text-zinc-300 pointer-events-auto"
        @click.stop
      >
        <div class="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2 font-sans font-bold text-white">
          <span class="flex items-center gap-1.5 text-indigo-400">
            <Activity :size="13" />
            Stream Diagnostics
          </span>
          <button type="button" class="text-zinc-500 hover:text-white" @click="showStatsHud = false">
            <X :size="14" />
          </button>
        </div>
        <div class="space-y-1">
          <div class="flex justify-between">
            <span class="text-zinc-500">Engine:</span>
            <span class="text-white">HLS.js Low-Latency</span>
          </div>
          <div class="flex justify-between">
            <span class="text-zinc-500">Resolution:</span>
            <span class="text-cyan-300 font-semibold">{{ statsResolution }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-zinc-500">Bitrate:</span>
            <span class="text-emerald-400">{{ statsBitrate }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-zinc-500">Buffer Ahead:</span>
            <span class="text-amber-300">{{ statsBufferSec }}s</span>
          </div>
          <div class="flex justify-between">
            <span class="text-zinc-500">Dropped:</span>
            <span>{{ statsDroppedFrames }} frames</span>
          </div>
          <div class="flex justify-between">
            <span class="text-zinc-500">Aspect Mode:</span>
            <span class="uppercase text-indigo-300">{{ activeAspectRatio }}</span>
          </div>
        </div>
      </div>

      <!-- Buffering Spinner Overlay -->
      <div
        v-if="isBuffering && !streamError"
        class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs z-10 animate-in fade-in duration-200"
      >
        <div class="relative flex items-center justify-center">
          <div class="h-14 w-14 animate-spin rounded-full border-3 border-indigo-500/20 border-t-indigo-500 shadow-2xl"></div>
          <Tv :size="20" class="absolute text-indigo-400 animate-pulse" />
        </div>
        <p class="mt-4 text-xs font-bold text-zinc-100 tracking-wide">Loading live stream...</p>
        <p class="mt-1 text-[11px] text-zinc-400">Buffering real-time broadcast</p>
      </div>

      <!-- Stream Error Overlay with Auto-Skip -->
      <div
        v-if="streamError"
        class="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center z-20 cursor-default"
        @click.stop
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30 shadow-lg">
          <Tv :size="28" />
        </div>
        <h3 class="mt-3 text-base font-bold text-white">Stream Offline</h3>
        <p class="mt-1.5 max-w-sm text-xs text-zinc-400 leading-relaxed">{{ streamError }}</p>
        <p v-if="autoSkipCountdown !== null" class="mt-3 text-xs font-semibold text-amber-400 animate-pulse">
          Auto-skipping to next live channel in {{ autoSkipCountdown }}s...
        </p>
        <div class="mt-5 flex items-center gap-3">
          <button
            v-if="autoSkipCountdown !== null"
            type="button"
            class="flex items-center gap-1.5 rounded-full bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 ring-1 ring-white/10 active:scale-95 hover:bg-zinc-700"
            @click="cancelAutoSkip"
          >
            <span>Stay on Channel</span>
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 ring-1 ring-white/10 active:scale-95 hover:bg-zinc-700"
            @click="cancelAutoSkip(); loadChannelStream(channel)"
          >
            <RefreshCw :size="13" />
            <span>Retry</span>
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-full bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 active:scale-95 hover:bg-indigo-500"
            @click="cancelAutoSkip(); emit('next')"
          >
            <span>Skip to Next</span>
            <ChevronRight :size="14" />
          </button>
        </div>
      </div>

      <!-- Quick Zapping Floating Navigation Buttons -->
      <button
        type="button"
        class="group absolute left-4 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white/80 ring-1 ring-white/10 backdrop-blur-md transition hover:bg-black/90 hover:scale-105 hover:text-white active:scale-95 shadow-xl"
        :class="areControlsVisible ? 'opacity-100' : 'opacity-0 hover:opacity-100'"
        title="Previous Channel (Left Arrow)"
        @click.stop="emit('prev')"
      >
        <ChevronLeft :size="24" />
      </button>

      <button
        type="button"
        class="group absolute right-4 top-1/2 -translate-y-1/2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white/80 ring-1 ring-white/10 backdrop-blur-md transition hover:bg-black/90 hover:scale-105 hover:text-white active:scale-95 shadow-xl"
        :class="areControlsVisible ? 'opacity-100' : 'opacity-0 hover:opacity-100'"
        title="Next Channel (Right Arrow)"
        @click.stop="emit('next')"
      >
        <ChevronRight :size="24" />
      </button>
    </div>

    <!-- Bottom Pro Player Cinema Bar -->
    <div
      class="absolute bottom-0 inset-x-0 z-30 transition-opacity duration-300"
      :class="areControlsVisible || !isPlayingVideo || streamError ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
      @click.stop
    >
      <div class="bg-gradient-to-t from-black/95 via-black/80 to-transparent px-4 pb-3 pt-6 backdrop-blur-md">
        <div class="flex items-center justify-between gap-4">
          <!-- Playback & Live Sync Controls -->
          <div class="flex items-center gap-3">
            <!-- Play / Pause -->
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-950 shadow-lg active:scale-95 transition hover:bg-zinc-200"
              :title="isPlayingVideo ? 'Pause (Space)' : 'Play (Space)'"
              @click="togglePlayPause"
            >
              <Pause v-if="isPlayingVideo" :size="18" fill="currentColor" />
              <Play v-else :size="18" fill="currentColor" class="translate-x-0.5" />
            </button>

            <!-- Jump to Live Edge -->
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-bold tracking-wider text-rose-400 ring-1 ring-rose-500/30 hover:bg-rose-500/30 transition active:scale-95"
              title="Jump to live edge"
              @click="jumpToLiveEdge"
            >
              <span class="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span>LIVE EDGE</span>
            </button>

            <!-- Volume Control & Slider -->
            <div class="group flex items-center gap-2">
              <button
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 hover:text-white transition hover:bg-white/10"
                :title="isMuted ? 'Unmute (M)' : 'Mute (M)'"
                @click="toggleMute"
              >
                <VolumeX v-if="isMuted || volume === 0" :size="18" />
                <Volume2 v-else :size="18" />
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                :value="isMuted ? 0 : volume"
                class="h-1.5 w-16 cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-indigo-500 transition opacity-80 group-hover:opacity-100 group-hover:w-20"
                @input="onVolumeInput"
              />
            </div>
          </div>

          <!-- Channel Info / Drawer Toggle -->
          <div class="flex items-center gap-3">
            <span class="hidden sm:inline-block text-xs font-semibold text-zinc-300">
              {{ channel.cleanName }}
            </span>
            <button
              v-if="channels.length > 1"
              type="button"
              class="flex items-center gap-1.5 rounded-full bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-200 ring-1 ring-white/10 hover:bg-zinc-700 active:scale-95 transition"
              @click="showChannelDrawer = !showChannelDrawer"
            >
              <Tv :size="13" />
              <span>Channels ({{ channels.length }})</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Channel Zapping Bar -->
    <div
      v-if="showChannelDrawer && channels.length > 1"
      class="relative z-40 border-t border-white/10 bg-zinc-950/95 px-4 py-2.5 backdrop-blur-xl"
    >
      <div class="mb-1.5 flex items-center justify-between">
        <span class="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          Zapping Guide ({{ channels.length }})
        </span>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            :disabled="!zappingScroll.canScrollLeft.value"
            class="flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
            aria-label="Scroll channels left"
            @click="zappingScroll.scrollLeft()"
          >
            <ChevronLeft :size="12" />
          </button>
          <button
            type="button"
            :disabled="!zappingScroll.canScrollRight.value"
            class="flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer"
            aria-label="Scroll channels right"
            @click="zappingScroll.scrollRight()"
          >
            <ChevronRight :size="12" />
          </button>
          <span class="text-[11px] text-zinc-500 ml-1">Tap channel to watch</span>
        </div>
      </div>

      <div
        ref="zappingGuideContainerRef"
        class="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 scroll-smooth select-none cursor-grab active:cursor-grabbing"
      >
        <button
          v-for="ch in channels"
          :key="ch.id"
          :data-channel-id="ch.id"
          type="button"
          class="flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer"
          :class="
            ch.id === channel.id
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/40 ring-1 ring-white/20'
              : 'bg-zinc-900/90 text-zinc-300 ring-1 ring-white/5 hover:bg-zinc-800 hover:text-white'
          "
          @click="handleSelectChannel(ch)"
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
            class="flex items-center gap-1 rounded bg-zinc-900/90 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-400/90 ring-1 ring-amber-500/20"
          >
            <SignalZero :size="9" />
            <span>Off</span>
          </span>
          <span
            v-else
            class="flex items-center gap-1"
          >
            <SignalHigh v-if="getChannelNetworkStrength(ch.id) === 'excellent'" :size="10" class="text-emerald-400" />
            <SignalMedium v-else-if="getChannelNetworkStrength(ch.id) === 'good'" :size="10" class="text-teal-400" />
            <SignalLow v-else-if="getChannelNetworkStrength(ch.id) === 'fair' || getChannelNetworkStrength(ch.id) === 'poor'" :size="10" class="text-amber-400" />
            <span
              v-if="ch.resolution"
              class="rounded bg-black/40 px-1 py-0.2 text-[8px] font-bold text-zinc-300"
            >
              {{ ch.resolution }}
            </span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
