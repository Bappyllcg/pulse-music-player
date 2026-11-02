<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import {
  Check,
  HardDrive,
  Keyboard,
  Monitor,
  Moon,
  Radio,
  Settings,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-vue-next'
import { useTheme, type ThemeMode } from '../composables/useTheme'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'close'): void
}>()

const { theme, resolvedTheme, setTheme } = useTheme()

function selectTheme(mode: ThemeMode): void {
  setTheme(mode)
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
  <Transition name="modal-spring">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <!-- Backdrop Overlay -->
      <div
        class="fixed inset-0 bg-black/70 backdrop-blur-md"
        aria-hidden="true"
        @click="handleClose"
      ></div>

      <!-- Modal Dialog Sheet -->
      <div
        class="modal-dialog-sheet relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-2xl
               bg-white border-slate-200 text-slate-900
               dark:bg-zinc-900/95 dark:border-white/10 dark:text-zinc-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
      <!-- Modal Header -->
      <div
        class="sticky top-0 z-20 flex items-center justify-between border-b px-6 py-4 backdrop-blur-xl
               bg-white/95 border-slate-200/80
               dark:bg-zinc-900/90 dark:border-white/[0.08]"
      >
        <div class="flex items-center gap-2.5">
          <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-600/20 dark:text-indigo-400 dark:border-indigo-500/30">
            <Settings :size="16" />
          </div>
          <h2 id="settings-modal-title" class="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Settings
          </h2>
        </div>

        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full border transition active:scale-90 cursor-pointer
                 bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-800
                 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10 dark:hover:bg-zinc-700 dark:hover:text-white"
          aria-label="Close settings modal"
          @click="handleClose"
        >
          <X :size="16" />
        </button>
      </div>

      <!-- Scrollable Body Content -->
      <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        <!-- Section: Appearance / Theme -->
        <div class="space-y-3">
          <div class="flex items-center justify-between px-1">
            <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              Appearance & Theme
            </h3>
            <span class="text-[10px] font-medium text-slate-500 dark:text-zinc-400">
              Active: <strong class="text-indigo-600 dark:text-indigo-400 capitalize">{{ theme }}</strong>
              <span v-if="theme === 'system'" class="text-slate-400 dark:text-zinc-500"> ({{ resolvedTheme }})</span>
            </span>
          </div>

          <!-- 3-Card Visual Theme Selector -->
          <div class="grid grid-cols-3 gap-2.5">
            <!-- System Option Card -->
            <button
              type="button"
              class="relative flex flex-col items-center justify-between rounded-2xl p-3 text-center transition active:scale-95 border cursor-pointer"
              :class="
                theme === 'system'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-md ring-2 ring-indigo-500/20 dark:bg-indigo-950/50 dark:text-white dark:ring-indigo-500'
                  : 'bg-slate-100/70 border-slate-200/90 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:bg-zinc-800/40 dark:text-zinc-400 dark:border-white/[0.08] dark:hover:bg-zinc-800/70 dark:hover:text-zinc-200'
              "
              @click="selectTheme('system')"
            >
              <span
                v-if="theme === 'system'"
                class="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow"
              >
                <Check :size="12" />
              </span>

              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl transition"
                :class="theme === 'system' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-400' : 'bg-slate-200 text-slate-600 dark:bg-zinc-700/50 dark:text-zinc-400'"
              >
                <Monitor :size="20" />
              </div>

              <div class="mt-2">
                <div class="text-xs font-bold" :class="theme === 'system' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-zinc-300'">
                  System
                </div>
                <div class="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Auto
                </div>
              </div>
            </button>

            <!-- Light Option Card -->
            <button
              type="button"
              class="relative flex flex-col items-center justify-between rounded-2xl p-3 text-center transition active:scale-95 border cursor-pointer"
              :class="
                theme === 'light'
                  ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-md ring-2 ring-amber-500/20 dark:bg-indigo-950/50 dark:text-white dark:ring-indigo-500'
                  : 'bg-slate-100/70 border-slate-200/90 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:bg-zinc-800/40 dark:text-zinc-400 dark:border-white/[0.08] dark:hover:bg-zinc-800/70 dark:hover:text-zinc-200'
              "
              @click="selectTheme('light')"
            >
              <span
                v-if="theme === 'light'"
                class="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-white shadow"
              >
                <Check :size="12" />
              </span>

              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl transition"
                :class="theme === 'light' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-slate-200 text-slate-600 dark:bg-zinc-700/50 dark:text-zinc-400'"
              >
                <Sun :size="20" />
              </div>

              <div class="mt-2">
                <div class="text-xs font-bold" :class="theme === 'light' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-zinc-300'">
                  Light
                </div>
                <div class="mt-0.5 text-[9px] text-slate-500 dark:text-zinc-500">
                  Day iOS
                </div>
              </div>
            </button>

            <!-- Dark Option Card -->
            <button
              type="button"
              class="relative flex flex-col items-center justify-between rounded-2xl p-3 text-center transition active:scale-95 border cursor-pointer"
              :class="
                theme === 'dark'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-md ring-2 ring-indigo-500/20 dark:bg-indigo-950/50 dark:text-white dark:ring-indigo-500'
                  : 'bg-slate-100/70 border-slate-200/90 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:bg-zinc-800/40 dark:text-zinc-400 dark:border-white/[0.08] dark:hover:bg-zinc-800/70 dark:hover:text-zinc-200'
              "
              @click="selectTheme('dark')"
            >
              <span
                v-if="theme === 'dark'"
                class="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow"
              >
                <Check :size="12" />
              </span>

              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl transition"
                :class="theme === 'dark' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-400' : 'bg-slate-200 text-slate-600 dark:bg-zinc-700/50 dark:text-zinc-400'"
              >
                <Moon :size="20" />
              </div>

              <div class="mt-2">
                <div class="text-xs font-bold" :class="theme === 'dark' ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-zinc-300'">
                  Dark
                </div>
                <div class="mt-0.5 text-[9px] text-slate-500 dark:text-zinc-500">
                  OLED Night
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Section: Audio & Playback Engine -->
        <div class="space-y-2.5">
          <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 px-1">
            Engine & Features
          </h3>

          <div class="divide-y rounded-2xl border
                      bg-slate-50 border-slate-200 divide-slate-200
                      dark:divide-white/[0.06] dark:bg-zinc-800/40 dark:border-white/[0.08]">
            <div class="flex items-center justify-between p-3.5">
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <ShieldCheck :size="16" />
                </div>
                <div>
                  <div class="text-xs font-semibold text-slate-900 dark:text-white">100% Offline & Private</div>
                  <div class="text-[11px] text-slate-500 dark:text-zinc-400">Saved directly inside IndexedDB with zero remote tracking</div>
                </div>
              </div>
              <span class="rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                Active
              </span>
            </div>

            <div class="flex items-center justify-between p-3.5">
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400">
                  <HardDrive :size="16" />
                </div>
                <div>
                  <div class="text-xs font-semibold text-slate-900 dark:text-white">MediaSession Lock Screen</div>
                  <div class="text-[11px] text-slate-500 dark:text-zinc-400">Controls artwork, scrubbing & playback on lock screen & Bluetooth</div>
                </div>
              </div>
              <span class="rounded px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
                Supported
              </span>
            </div>

            <div class="flex items-center justify-between p-3.5">
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
                  <Radio :size="16" />
                </div>
                <div>
                  <div class="text-xs font-semibold text-slate-900 dark:text-white">HLS.js Live Video Engine</div>
                  <div class="text-[11px] text-slate-500 dark:text-zinc-400">Adaptive bitrate streaming with network ping diagnostics</div>
                </div>
              </div>
              <span class="rounded px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400">
                Ready
              </span>
            </div>
          </div>
        </div>

        <!-- Section: Keyboard Shortcuts -->
        <div class="space-y-2.5">
          <div class="flex items-center gap-1.5 px-1">
            <Keyboard :size="13" class="text-slate-600 dark:text-zinc-400" />
            <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
              Keyboard Shortcuts
            </h3>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="flex items-center justify-between rounded-xl p-2.5 border
                        bg-slate-50 border-slate-200/80
                        dark:bg-zinc-800/40 dark:border-white/[0.06]">
              <span class="text-slate-700 dark:text-zinc-300">Play / Pause</span>
              <kbd class="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold bg-slate-200 text-slate-800 dark:bg-zinc-700/60 dark:text-zinc-200">Space</kbd>
            </div>
            <div class="flex items-center justify-between rounded-xl p-2.5 border
                        bg-slate-50 border-slate-200/80
                        dark:bg-zinc-800/40 dark:border-white/[0.06]">
              <span class="text-slate-700 dark:text-zinc-300">Seek ±5s</span>
              <kbd class="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold bg-slate-200 text-slate-800 dark:bg-zinc-700/60 dark:text-zinc-200">← / →</kbd>
            </div>
            <div class="flex items-center justify-between rounded-xl p-2.5 border
                        bg-slate-50 border-slate-200/80
                        dark:bg-zinc-800/40 dark:border-white/[0.06]">
              <span class="text-slate-700 dark:text-zinc-300">Close Modals</span>
              <kbd class="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold bg-slate-200 text-slate-800 dark:bg-zinc-700/60 dark:text-zinc-200">Esc</kbd>
            </div>
            <div class="flex items-center justify-between rounded-xl p-2.5 border
                        bg-slate-50 border-slate-200/80
                        dark:bg-zinc-800/40 dark:border-white/[0.06]">
              <span class="text-slate-700 dark:text-zinc-300">Quick Search</span>
              <kbd class="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold bg-slate-200 text-slate-800 dark:bg-zinc-700/60 dark:text-zinc-200">/</kbd>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex items-center justify-end border-t px-6 py-3.5 backdrop-blur-xl
                  bg-white/95 border-slate-200/80
                  dark:bg-zinc-900/90 dark:border-white/[0.08]">
        <button
          type="button"
          class="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold !text-white shadow-md transition active:scale-[0.98] hover:bg-indigo-500 cursor-pointer"
          @click="handleClose"
        >
          Done
        </button>
      </div>
    </div>
  </div>
  </Transition>
</template>
