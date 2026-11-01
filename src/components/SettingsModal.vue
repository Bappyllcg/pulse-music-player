<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import {
  Check,
  Monitor,
  Moon,
  Settings,
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
        <!-- Section: Appearance / Theme -->
        <div class="space-y-3">
          <div class="flex items-center justify-between px-1">
            <h3 class="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Appearance
            </h3>
            <span class="text-[10px] font-medium text-zinc-400">
              Current: <strong class="text-indigo-400 capitalize">{{ theme }}</strong>
              <span v-if="theme === 'system'" class="text-zinc-500"> ({{ resolvedTheme }})</span>
            </span>
          </div>

          <!-- 3-Card Visual Theme Selector -->
          <div class="grid grid-cols-3 gap-2.5">
            <!-- System Option Card -->
            <button
              type="button"
              class="relative flex flex-col items-center justify-between rounded-2xl p-3.5 text-center transition active:scale-95 ring-1"
              :class="
                theme === 'system'
                  ? 'bg-indigo-950/40 text-white ring-indigo-500 shadow-lg shadow-indigo-600/20'
                  : 'bg-zinc-800/40 text-zinc-400 ring-white/[0.08] hover:bg-zinc-800/70 hover:text-zinc-200'
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
                :class="theme === 'system' ? 'bg-indigo-600/20 text-indigo-400' : 'bg-zinc-700/50 text-zinc-400'"
              >
                <Monitor :size="20" />
              </div>

              <div class="mt-2.5">
                <div class="text-xs font-bold" :class="theme === 'system' ? 'text-white' : 'text-zinc-300'">
                  System
                </div>
                <div class="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-indigo-400">
                  Default
                </div>
              </div>
            </button>

            <!-- Light Option Card -->
            <button
              type="button"
              class="relative flex flex-col items-center justify-between rounded-2xl p-3.5 text-center transition active:scale-95 ring-1"
              :class="
                theme === 'light'
                  ? 'bg-indigo-950/40 text-white ring-indigo-500 shadow-lg shadow-indigo-600/20'
                  : 'bg-zinc-800/40 text-zinc-400 ring-white/[0.08] hover:bg-zinc-800/70 hover:text-zinc-200'
              "
              @click="selectTheme('light')"
            >
              <span
                v-if="theme === 'light'"
                class="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow"
              >
                <Check :size="12" />
              </span>

              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl transition"
                :class="theme === 'light' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-700/50 text-zinc-400'"
              >
                <Sun :size="20" />
              </div>

              <div class="mt-2.5">
                <div class="text-xs font-bold" :class="theme === 'light' ? 'text-white' : 'text-zinc-300'">
                  Light
                </div>
                <div class="mt-0.5 text-[9px] text-zinc-500">
                  Day mode
                </div>
              </div>
            </button>

            <!-- Dark Option Card -->
            <button
              type="button"
              class="relative flex flex-col items-center justify-between rounded-2xl p-3.5 text-center transition active:scale-95 ring-1"
              :class="
                theme === 'dark'
                  ? 'bg-indigo-950/40 text-white ring-indigo-500 shadow-lg shadow-indigo-600/20'
                  : 'bg-zinc-800/40 text-zinc-400 ring-white/[0.08] hover:bg-zinc-800/70 hover:text-zinc-200'
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
                :class="theme === 'dark' ? 'bg-indigo-600/20 text-indigo-400' : 'bg-zinc-700/50 text-zinc-400'"
              >
                <Moon :size="20" />
              </div>

              <div class="mt-2.5">
                <div class="text-xs font-bold" :class="theme === 'dark' ? 'text-white' : 'text-zinc-300'">
                  Dark
                </div>
                <div class="mt-0.5 text-[9px] text-zinc-500">
                  OLED Night
                </div>
              </div>
            </button>
          </div>

          <!-- Descriptive List Rows (iOS Settings style) -->
          <div class="divide-y divide-white/[0.06] rounded-2xl bg-zinc-800/40 ring-1 ring-white/[0.08] mt-3">
            <!-- System Row -->
            <button
              type="button"
              class="flex w-full items-center justify-between p-3.5 text-left transition active:bg-zinc-800/80"
              @click="selectTheme('system')"
            >
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-700/40 text-zinc-300">
                  <Monitor :size="16" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-white">System</span>
                    <span class="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-300 ring-1 ring-indigo-500/30">
                      Default
                    </span>
                  </div>
                  <p class="text-[11px] text-zinc-400 leading-tight mt-0.5">
                    Automatically match your operating system's light or dark mode
                  </p>
                </div>
              </div>
              <div
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                :class="
                  theme === 'system'
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-zinc-600 bg-transparent'
                "
              >
                <Check v-if="theme === 'system'" :size="12" />
              </div>
            </button>

            <!-- Light Row -->
            <button
              type="button"
              class="flex w-full items-center justify-between p-3.5 text-left transition active:bg-zinc-800/80"
              @click="selectTheme('light')"
            >
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <Sun :size="16" />
                </div>
                <div>
                  <span class="text-xs font-semibold text-white">Light</span>
                  <p class="text-[11px] text-zinc-400 leading-tight mt-0.5">
                    Always use the bright, high-contrast light appearance
                  </p>
                </div>
              </div>
              <div
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                :class="
                  theme === 'light'
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-zinc-600 bg-transparent'
                "
              >
                <Check v-if="theme === 'light'" :size="12" />
              </div>
            </button>

            <!-- Dark Row -->
            <button
              type="button"
              class="flex w-full items-center justify-between p-3.5 text-left transition active:bg-zinc-800/80"
              @click="selectTheme('dark')"
            >
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
                  <Moon :size="16" />
                </div>
                <div>
                  <span class="text-xs font-semibold text-white">Dark</span>
                  <p class="text-[11px] text-zinc-400 leading-tight mt-0.5">
                    Always use the pitch-black OLED appearance
                  </p>
                </div>
              </div>
              <div
                class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                :class="
                  theme === 'dark'
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-zinc-600 bg-transparent'
                "
              >
                <Check v-if="theme === 'dark'" :size="12" />
              </div>
            </button>
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
