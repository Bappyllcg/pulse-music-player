<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Check,
  Database,
  Moon,
  Music,
  Radio,
  Settings,
  Sliders,
  Sparkles,
  Trash2,
  Tv,
  Volume2,
  X,
} from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'close'): void
}>()

/* ------------------------------------------------------------------ */
/* Settings State (Persisted in localStorage)                         */
/* ------------------------------------------------------------------ */

function getSavedBoolean(key: string, defaultValue: boolean): boolean {
  try {
    const val = localStorage.getItem(key)
    return val !== null ? JSON.parse(val) : defaultValue
  } catch {
    return defaultValue
  }
}

function saveBoolean(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage quota
  }
}

const highQualityAudio = ref(getSavedBoolean('pulse:setting:hq_audio', true))
const autoPlayNext = ref(getSavedBoolean('pulse:setting:autoplay_next', true))
const showWaveform = ref(getSavedBoolean('pulse:setting:show_waveform', true))
const showPingLatency = ref(getSavedBoolean('pulse:setting:show_latency', true))
const cacheClearNotice = ref<string | null>(null)
let noticeTimeout: number | undefined

function toggleSetting(setting: 'hq' | 'autoplay' | 'waveform' | 'latency'): void {
  switch (setting) {
    case 'hq':
      highQualityAudio.value = !highQualityAudio.value
      saveBoolean('pulse:setting:hq_audio', highQualityAudio.value)
      break
    case 'autoplay':
      autoPlayNext.value = !autoPlayNext.value
      saveBoolean('pulse:setting:autoplay_next', autoPlayNext.value)
      break
    case 'waveform':
      showWaveform.value = !showWaveform.value
      saveBoolean('pulse:setting:show_waveform', showWaveform.value)
      break
    case 'latency':
      showPingLatency.value = !showPingLatency.value
      saveBoolean('pulse:setting:show_latency', showPingLatency.value)
      break
  }
}

function clearStreamCache(): void {
  if (typeof caches !== 'undefined') {
    void caches.keys().then((keys) => {
      keys.forEach((k) => {
        if (k.includes('stream') || k.includes('jamendo')) {
          void caches.delete(k)
        }
      })
    })
  }
  cacheClearNotice.value = 'Temporary stream cache cleared'
  window.clearTimeout(noticeTimeout)
  noticeTimeout = window.setTimeout(() => {
    cacheClearNotice.value = null
  }, 3000)
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

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
    <!-- Backdrop Overlay -->
    <div
      class="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
      aria-hidden="true"
      @click="handleClose"
    ></div>

    <!-- Modal Dialog Sheet -->
    <div
      class="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-zinc-900/95 ring-1 ring-white/10 shadow-2xl backdrop-blur-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <!-- Modal Header -->
      <div
        class="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.08] bg-zinc-900/90 px-6 py-4 backdrop-blur-xl"
      >
        <div class="flex items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30">
            <Settings :size="16" />
          </div>
          <h2 id="settings-modal-title" class="text-base font-bold text-white tracking-tight">
            Settings
          </h2>
        </div>

        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 ring-1 ring-white/10 transition active:scale-90 hover:bg-zinc-700 hover:text-white"
          aria-label="Close settings modal"
          @click="handleClose"
        >
          <X :size="16" />
        </button>
      </div>

      <!-- Scrollable Body Content -->
      <div class="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        <!-- Settings Header Note / Banner -->
        <div class="rounded-2xl bg-indigo-500/10 p-4 ring-1 ring-indigo-500/20">
          <div class="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <Sparkles :size="15" />
            <span>Preferences & Controls</span>
          </div>
          <p class="mt-1 text-xs text-indigo-200/90 leading-relaxed">
            Customize your audio playback, display preferences, and cache controls. Additional advanced settings will be expanded here.
          </p>
        </div>

        <!-- Section 1: Audio & Playback -->
        <div class="space-y-2.5">
          <h3 class="px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Audio & Playback
          </h3>

          <div class="divide-y divide-white/[0.06] rounded-2xl bg-zinc-800/40 ring-1 ring-white/[0.08]">
            <!-- High Quality Audio Toggle -->
            <div class="flex items-center justify-between p-4">
              <div class="flex items-start gap-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                  <Volume2 :size="16" />
                </div>
                <div>
                  <h4 class="text-xs font-semibold text-white">Prefer High-Fidelity Audio</h4>
                  <p class="text-[11px] text-zinc-400 leading-tight mt-0.5">
                    Stream highest available bitrate (up to 320 kbps) when on Wi-Fi
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                :aria-checked="highQualityAudio"
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                :class="highQualityAudio ? 'bg-indigo-600' : 'bg-zinc-700'"
                @click="toggleSetting('hq')"
              >
                <span
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out"
                  :class="highQualityAudio ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </div>

            <!-- Auto-Play Next Item -->
            <div class="flex items-center justify-between p-4">
              <div class="flex items-start gap-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                  <Music :size="16" />
                </div>
                <div>
                  <h4 class="text-xs font-semibold text-white">Continuous Playback</h4>
                  <p class="text-[11px] text-zinc-400 leading-tight mt-0.5">
                    Automatically play next track in queue when current song ends
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                :aria-checked="autoPlayNext"
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                :class="autoPlayNext ? 'bg-indigo-600' : 'bg-zinc-700'"
                @click="toggleSetting('autoplay')"
              >
                <span
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out"
                  :class="autoPlayNext ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </div>

            <!-- Equalizer & Audio Presets (Placeholder) -->
            <div class="flex items-center justify-between p-4 opacity-75">
              <div class="flex items-start gap-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-700/50 text-zinc-400">
                  <Sliders :size="16" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="text-xs font-semibold text-white">Parametric Equalizer</h4>
                    <span class="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-300">
                      Coming Soon
                    </span>
                  </div>
                  <p class="text-[11px] text-zinc-400 leading-tight mt-0.5">
                    Bass boost, treble control, and genre-specific EQ profiles
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 2: Display & Interface -->
        <div class="space-y-2.5">
          <h3 class="px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Interface & Display
          </h3>

          <div class="divide-y divide-white/[0.06] rounded-2xl bg-zinc-800/40 ring-1 ring-white/[0.08]">
            <!-- Theme: OLED Dark -->
            <div class="flex items-center justify-between p-4">
              <div class="flex items-start gap-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-700/50 text-zinc-300">
                  <Moon :size="16" />
                </div>
                <div>
                  <h4 class="text-xs font-semibold text-white">Appearance Theme</h4>
                  <p class="text-[11px] text-zinc-400 leading-tight mt-0.5">
                    Midnight OLED with glassmorphism effects
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-1.5 rounded-full bg-zinc-800/90 px-2.5 py-1 text-[11px] font-medium text-emerald-400 ring-1 ring-white/10">
                <Check :size="12" />
                <span>OLED Dark</span>
              </div>
            </div>

            <!-- Waveform Scrubber -->
            <div class="flex items-center justify-between p-4">
              <div class="flex items-start gap-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400">
                  <Radio :size="16" />
                </div>
                <div>
                  <h4 class="text-xs font-semibold text-white">Interactive Waveform Visualizer</h4>
                  <p class="text-[11px] text-zinc-400 leading-tight mt-0.5">
                    Display dynamic visual wave bars in the Now Playing screen
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                :aria-checked="showWaveform"
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                :class="showWaveform ? 'bg-indigo-600' : 'bg-zinc-700'"
                @click="toggleSetting('waveform')"
              >
                <span
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out"
                  :class="showWaveform ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </div>

            <!-- Live Stream Health & Ping Latency HUD -->
            <div class="flex items-center justify-between p-4">
              <div class="flex items-start gap-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <Tv :size="16" />
                </div>
                <div>
                  <h4 class="text-xs font-semibold text-white">Signal & Latency Indicators</h4>
                  <p class="text-[11px] text-zinc-400 leading-tight mt-0.5">
                    Show stream ping (ms) and signal meters on Radio and TV cards
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                :aria-checked="showPingLatency"
                class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                :class="showPingLatency ? 'bg-indigo-600' : 'bg-zinc-700'"
                @click="toggleSetting('latency')"
              >
                <span
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out"
                  :class="showPingLatency ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </div>
          </div>
        </div>

        <!-- Section 3: Storage & Maintenance -->
        <div class="space-y-2.5">
          <h3 class="px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Storage & Maintenance
          </h3>

          <div class="rounded-2xl bg-zinc-800/40 p-4 ring-1 ring-white/[0.08] space-y-3">
            <div class="flex items-start gap-3">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-700/50 text-zinc-300">
                <Database :size="16" />
              </div>
              <div class="min-w-0 flex-1">
                <h4 class="text-xs font-semibold text-white">Temporary Stream Cache</h4>
                <p class="text-[11px] text-zinc-400 leading-tight mt-0.5">
                  Clear transient streaming audio buffers. Your imported offline songs remain safe.
                </p>
              </div>
            </div>

            <button
              type="button"
              class="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-200 ring-1 ring-white/10 transition active:scale-[0.98] hover:bg-zinc-700 hover:text-white"
              @click="clearStreamCache"
            >
              <Trash2 :size="14" class="text-zinc-400" />
              <span>Clear Temporary Cache</span>
            </button>

            <transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="-translate-y-1 opacity-0"
              enter-to-class="translate-y-0 opacity-100"
            >
              <div
                v-if="cacheClearNotice"
                class="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-2.5 text-[11px] font-medium text-emerald-400 ring-1 ring-emerald-500/20"
              >
                <Check :size="13" class="shrink-0" />
                <span>{{ cacheClearNotice }}</span>
              </div>
            </transition>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex items-center justify-end border-t border-white/[0.08] bg-zinc-900/90 px-6 py-3.5 backdrop-blur-xl">
        <button
          type="button"
          class="rounded-xl bg-zinc-800/80 px-5 py-2 text-xs font-semibold text-zinc-300 ring-1 ring-white/10 transition active:scale-[0.98] hover:bg-zinc-700 hover:text-white"
          @click="handleClose"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>

