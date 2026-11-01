<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  AudioLines,
  Check,
  Cpu,
  Database,
  ExternalLink,
  Globe,
  Heart,
  Info,
  Music,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Tv,
  Wifi,
  WifiOff,
  X,
} from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  localCount: number
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'close'): void
}>()

/* ------------------------------------------------------------------ */
/* Network & Diagnostics State                                        */
/* ------------------------------------------------------------------ */

const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const storageUsage = ref<string | null>(null)

function onNetworkChange(): void {
  isOnline.value = navigator.onLine
}

async function loadStorageEstimate(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate()
      if (estimate.usage !== undefined) {
        const mb = (estimate.usage / (1024 * 1024)).toFixed(1)
        storageUsage.value = `${mb} MB`
      }
    } catch {
      // Storage estimate not supported or denied
    }
  }
}

/* ------------------------------------------------------------------ */
/* PWA Service Worker Update Check                                    */
/* ------------------------------------------------------------------ */

const isCheckingUpdate = ref(false)
const updateStatus = ref<'latest' | 'update_available' | 'error' | null>(null)
const lastUpdateChecked = ref<string | null>(null)

async function checkForUpdate(): Promise<void> {
  if (isCheckingUpdate.value) return
  isCheckingUpdate.value = true
  updateStatus.value = null

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await Promise.all([
          registration.update(),
          new Promise((resolve) => setTimeout(resolve, 800)),
        ])
        if (registration.waiting || registration.installing) {
          updateStatus.value = 'update_available'
        } else {
          updateStatus.value = 'latest'
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800))
        updateStatus.value = 'latest'
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 600))
      updateStatus.value = 'latest'
    }

    const now = new Date()
    lastUpdateChecked.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch (err) {
    console.error('[Pulse] Update check failed:', err)
    updateStatus.value = 'error'
  } finally {
    isCheckingUpdate.value = false
  }
}

function applyUpdate(): void {
  window.location.reload()
}

function handleClose(): void {
  emit('close')
  emit('update:open', false)
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && props.open) {
    handleClose()
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      void loadStorageEstimate()
    }
  },
)

onMounted(() => {
  window.addEventListener('online', onNetworkChange)
  window.addEventListener('offline', onNetworkChange)
  window.addEventListener('keydown', onKeydown)
  if (props.open) {
    void loadStorageEstimate()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('online', onNetworkChange)
  window.removeEventListener('offline', onNetworkChange)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
    <!-- Backdrop Overlay -->
    <div
      class="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300"
      aria-hidden="true"
      @click="handleClose"
    ></div>

    <!-- Modal Dialog Sheet -->
    <div
      class="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-2xl
             bg-white border-slate-200 text-slate-900
             dark:bg-zinc-900/95 dark:border-white/10 dark:text-zinc-100"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
    >
      <!-- Modal Header -->
      <div
        class="sticky top-0 z-20 flex items-center justify-between border-b px-6 py-4 backdrop-blur-xl
               bg-white/95 border-slate-200/80
               dark:bg-zinc-900/90 dark:border-white/[0.08]"
      >
        <div class="flex items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-600/20 dark:text-indigo-400 dark:border-indigo-500/30">
            <Info :size="16" />
          </div>
          <h2 id="about-modal-title" class="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            About Pulse
          </h2>
        </div>

        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full border transition active:scale-90 cursor-pointer
                 bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-800
                 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10 dark:hover:bg-zinc-700 dark:hover:text-white"
          aria-label="Close about modal"
          @click="handleClose"
        >
          <X :size="16" />
        </button>
      </div>

      <!-- Scrollable Body Content -->
      <div class="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        <!-- Hero / Brand Section -->
        <div class="flex flex-col items-center text-center">
          <div
            class="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 shadow-xl shadow-indigo-600/30 ring-2 ring-white/20"
          >
            <AudioLines :size="40" class="text-white" />
          </div>

          <div class="mt-4 flex items-center gap-2">
            <h1 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Pulse Player</h1>
            <span class="rounded-full px-2.5 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30">
              v1.0.0
            </span>
          </div>

          <p class="mt-2 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
            A private, high-fidelity offline music player, online streaming, live radio & television hub built for the modern web with an Apple iOS aesthetic.
          </p>
        </div>

        <!-- Software Updates Section -->
        <div class="rounded-2xl border p-4 space-y-3
                    bg-slate-50 border-slate-200/90
                    dark:bg-zinc-800/40 dark:border-white/[0.08]">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <RefreshCw :size="15" class="text-indigo-600 dark:text-indigo-400" />
              <h3 class="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Software & Updates
              </h3>
            </div>
            <span class="text-[10px] font-medium text-slate-500 dark:text-zinc-500">PWA Ready</span>
          </div>

          <p class="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            Pulse utilizes Service Workers to run offline and update seamlessly in the background.
          </p>

          <button
            type="button"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-semibold !text-white shadow-lg shadow-indigo-600/25 ring-1 ring-white/20 transition active:scale-[0.98] hover:bg-indigo-500 disabled:opacity-60 cursor-pointer"
            :disabled="isCheckingUpdate"
            @click="checkForUpdate"
          >
            <RefreshCw
              :size="15"
              :class="{ 'animate-spin': isCheckingUpdate }"
            />
            <span>{{ isCheckingUpdate ? 'Checking for updates...' : 'Check for update' }}</span>
          </button>

          <!-- Update Status Alerts -->
          <transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="-translate-y-1 opacity-0"
            enter-to-class="translate-y-0 opacity-100"
          >
            <div
              v-if="updateStatus === 'latest'"
              class="flex items-center gap-2.5 rounded-xl border p-3 text-xs font-medium
                     bg-emerald-50 text-emerald-700 border-emerald-200
                     dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
            >
              <Check :size="15" class="shrink-0" />
              <span>Pulse is up to date{{ lastUpdateChecked ? ` (checked ${lastUpdateChecked})` : '' }}.</span>
            </div>

            <div
              v-else-if="updateStatus === 'update_available'"
              class="flex flex-col gap-2.5 rounded-xl border p-3 text-xs
                     bg-amber-50 text-amber-800 border-amber-200
                     dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30"
            >
              <div class="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-300">
                <Sparkles :size="15" />
                <span>New version available!</span>
              </div>
              <p class="text-[11px] text-amber-600 dark:text-amber-300/80 leading-normal">
                A new version of Pulse Player has downloaded and is ready to apply.
              </p>
              <button
                type="button"
                class="rounded-lg bg-amber-500 py-2 px-3 text-xs font-bold text-zinc-950 transition active:scale-95 hover:bg-amber-400 cursor-pointer"
                @click="applyUpdate"
              >
                Reload to Update
              </button>
            </div>

            <div
              v-else-if="updateStatus === 'error'"
              class="rounded-xl border p-3 text-xs bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
            >
              Unable to check for updates. Please check your network connection.
            </div>
          </transition>
        </div>

        <!-- Entertainment Pillars -->
        <div class="space-y-2.5">
          <h3 class="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-500">
            Core Features
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <!-- Offline Music -->
            <div class="flex items-start gap-3 rounded-2xl border p-3.5
                        bg-slate-50 border-slate-200/90
                        dark:bg-zinc-800/30 dark:border-white/[0.06]">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400">
                <Music :size="18" />
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-900 dark:text-white">Offline Music</h4>
                <p class="mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                  Zero-buffering playback stored safely in IndexedDB without cellular data.
                </p>
              </div>
            </div>

            <!-- Online Music -->
            <div class="flex items-start gap-3 rounded-2xl border p-3.5
                        bg-slate-50 border-slate-200/90
                        dark:bg-zinc-800/30 dark:border-white/[0.06]">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-indigo-500/15 dark:text-indigo-400">
                <Globe :size="18" />
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-900 dark:text-white">Jamendo Music</h4>
                <p class="mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                  Free and legal royalty-free tracks filtered by top genres and live search.
                </p>
              </div>
            </div>

            <!-- Live Radio -->
            <div class="flex items-start gap-3 rounded-2xl border p-3.5
                        bg-slate-50 border-slate-200/90
                        dark:bg-zinc-800/30 dark:border-white/[0.06]">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
                <Radio :size="18" />
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-900 dark:text-white">Live World Radio</h4>
                <p class="mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                  Thousands of regional stations with live latency pings and signal meters.
                </p>
              </div>
            </div>

            <!-- Live TV -->
            <div class="flex items-start gap-3 rounded-2xl border p-3.5
                        bg-slate-50 border-slate-200/90
                        dark:bg-zinc-800/30 dark:border-white/[0.06]">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                <Tv :size="18" />
              </div>
              <div>
                <h4 class="text-xs font-bold text-slate-900 dark:text-white">Live Cinema TV</h4>
                <p class="mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                  HLS broadcasts from 20+ countries with aspect ratio and channel zapping.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- System & Diagnostics -->
        <div class="space-y-2.5">
          <h3 class="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-500">
            System & Diagnostics
          </h3>

          <div class="divide-y rounded-2xl border
                      bg-slate-50 border-slate-200 divide-slate-200
                      dark:divide-white/[0.06] dark:bg-zinc-800/40 dark:border-white/[0.08]">
            <!-- Network Status -->
            <div class="flex items-center justify-between px-4 py-3 text-xs">
              <span class="text-slate-500 dark:text-zinc-400">Network Status</span>
              <div class="flex items-center gap-1.5 font-medium" :class="isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
                <component :is="isOnline ? Wifi : WifiOff" :size="14" />
                <span>{{ isOnline ? 'Online' : 'Offline' }}</span>
              </div>
            </div>

            <!-- Offline Tracks Saved -->
            <div class="flex items-center justify-between px-4 py-3 text-xs">
              <span class="text-slate-500 dark:text-zinc-400">Offline Tracks Stored</span>
              <span class="font-medium text-slate-900 dark:text-white">{{ localCount }} {{ localCount === 1 ? 'track' : 'tracks' }}</span>
            </div>

            <!-- Storage Used -->
            <div v-if="storageUsage" class="flex items-center justify-between px-4 py-3 text-xs">
              <span class="text-slate-500 dark:text-zinc-400">Device Storage Used</span>
              <span class="font-medium text-slate-900 dark:text-white">{{ storageUsage }}</span>
            </div>

            <!-- Storage Engine -->
            <div class="flex items-center justify-between px-4 py-3 text-xs">
              <div class="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
                <Database :size="14" class="text-slate-400 dark:text-zinc-500" />
                <span>Storage Engine</span>
              </div>
              <span class="font-medium text-slate-900 dark:text-white">IndexedDB (Sandbox)</span>
            </div>

            <!-- Audio Engine -->
            <div class="flex items-center justify-between px-4 py-3 text-xs">
              <div class="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
                <Cpu :size="14" class="text-slate-400 dark:text-zinc-500" />
                <span>Audio Engine</span>
              </div>
              <span class="font-medium text-slate-900 dark:text-white">HTML5 Audio + MediaSession</span>
            </div>

            <!-- Video Engine -->
            <div class="flex items-center justify-between px-4 py-3 text-xs">
              <div class="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
                <Cpu :size="14" class="text-slate-400 dark:text-zinc-500" />
                <span>Video Engine</span>
              </div>
              <span class="font-medium text-slate-900 dark:text-white">HLS.js Adaptive Stream</span>
            </div>

            <!-- Frameworks -->
            <div class="flex items-center justify-between px-4 py-3 text-xs">
              <span class="text-slate-500 dark:text-zinc-400">App Framework</span>
              <span class="font-medium text-slate-900 dark:text-white">Vue 3.5 + Vite PWA</span>
            </div>
          </div>
        </div>

        <!-- Privacy & Security Guarantee -->
        <div class="rounded-2xl border p-4 space-y-2
                    bg-emerald-50 border-emerald-200
                    dark:bg-emerald-500/10 dark:border-emerald-500/20">
          <div class="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck :size="16" />
            <span>100% Private & Client-Side</span>
          </div>
          <p class="text-xs text-emerald-800 dark:text-emerald-200/90 leading-relaxed">
            Pulse does not track you, does not show ads, and does not require an account. Your local audio files never leave your browser sandbox.
          </p>
        </div>

        <!-- Open Source & Repository -->
        <div class="rounded-2xl border p-4 space-y-3
                    bg-slate-50 border-slate-200/90
                    dark:bg-zinc-800/40 dark:border-white/[0.08]">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-xs font-bold text-slate-900 dark:text-white">Open Source Project</h4>
              <p class="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Licensed under the open-source MIT License.</p>
            </div>
            <span class="rounded px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 dark:bg-zinc-700/60 dark:text-zinc-300">
              MIT
            </span>
          </div>

          <a
            href="https://github.com/bappyllcg/pulse-music-player"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition active:scale-[0.98] cursor-pointer
                   bg-white text-slate-800 border-slate-200 hover:bg-slate-100
                   dark:bg-zinc-800 dark:text-zinc-200 dark:border-white/10 dark:hover:bg-zinc-700 dark:hover:text-white"
          >
            <span>View on GitHub</span>
            <ExternalLink :size="13" />
          </a>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex items-center justify-between border-t px-6 py-3.5 backdrop-blur-xl
                  bg-white/95 border-slate-200/80
                  dark:bg-zinc-900/90 dark:border-white/[0.08]">
        <div class="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-500">
          <span>Crafted with</span>
          <Heart :size="12" class="text-rose-500 fill-rose-500" />
          <span>for music lovers</span>
        </div>
        <button
          type="button"
          class="rounded-xl border px-4 py-2 text-xs font-semibold transition active:scale-[0.98] cursor-pointer
                 bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200
                 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-white/10 dark:hover:bg-zinc-700 dark:hover:text-white"
          @click="handleClose"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
