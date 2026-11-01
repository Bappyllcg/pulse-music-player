<script setup lang="ts">
import { ref } from 'vue'
import { Check, ChevronDown, Moon } from 'lucide-vue-next'
import { SLEEP_MINUTE_OPTIONS } from '../composables/useSleepTimer'

defineProps<{
  open: boolean
  activeSelection: number | 'track' | null
  isActive: boolean
  remainingFormatted?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'close'): void
  (e: 'chooseMinutes', minutes: number): void
  (e: 'chooseEndOfTrack'): void
  (e: 'turnOff'): void
}>()

/* Swipe-to-Dismiss Gesture */
const sleepDragOffset = ref(0)
const isDraggingSleep = ref(false)
let touchStartYSleep = 0

function onSleepTouchStart(e: TouchEvent): void {
  touchStartYSleep = e.touches[0].clientY
  isDraggingSleep.value = true
}

function onSleepTouchMove(e: TouchEvent): void {
  if (!isDraggingSleep.value) return
  const deltaY = e.touches[0].clientY - touchStartYSleep
  sleepDragOffset.value = deltaY > 0 ? deltaY : 0
}

function onSleepTouchEnd(): void {
  if (!isDraggingSleep.value) return
  isDraggingSleep.value = false
  if (sleepDragOffset.value > 80) {
    emit('close')
    emit('update:open', false)
  }
  sleepDragOffset.value = 0
}
</script>

<template>
  <div>
    <!-- Backdrop Overlay -->
    <div
      class="fixed inset-0 z-40 bg-black/75 backdrop-blur-md transition-opacity duration-300"
      :class="open ? 'opacity-100' : 'pointer-events-none opacity-0'"
      aria-hidden="true"
      @click="emit('close'); emit('update:open', false)"
    ></div>

    <!-- Sleep Timer Drawer Sheet -->
    <aside
      class="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[2.5rem] border pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] shadow-2xl backdrop-blur-2xl transition-transform duration-300 ease-out
             bg-white border-slate-200 text-slate-900
             dark:bg-zinc-900/95 dark:border-white/15 dark:text-zinc-100"
      :class="open ? 'translate-y-0' : 'translate-y-full'"
      :style="sleepDragOffset > 0 ? { transform: `translateY(${sleepDragOffset}px)`, transition: 'none' } : {}"
      :inert="open ? undefined : true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sleep-timer-title"
      @touchstart="onSleepTouchStart"
      @touchmove="onSleepTouchMove"
      @touchend="onSleepTouchEnd"
    >
      <!-- Drag Handle -->
      <div class="flex justify-center pt-3 pb-1 cursor-grab">
        <div class="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-zinc-700/80 transition hover:bg-slate-400 dark:hover:bg-zinc-500"></div>
      </div>

      <!-- Header with Icon & Meta -->
      <div class="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.08] px-6 py-3">
        <div class="flex items-center gap-2.5">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-600/20 dark:text-indigo-400 dark:border-indigo-500/30">
            <Moon :size="18" />
          </div>
          <div>
            <h2 id="sleep-timer-title" class="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Sleep Timer
            </h2>
            <p class="text-xs text-slate-500 dark:text-zinc-400">
              <span v-if="isActive && remainingFormatted" class="text-indigo-600 dark:text-indigo-400 font-semibold">
                Stops in {{ remainingFormatted }}
              </span>
              <span v-else>
                Automatically pause playback
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full border transition active:scale-90 cursor-pointer
                 bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-800
                 dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10 dark:hover:bg-zinc-700 dark:hover:text-white"
          aria-label="Close sleep timer"
          @click="emit('close'); emit('update:open', false)"
        >
          <ChevronDown :size="18" />
        </button>
      </div>

      <!-- Preset Options List -->
      <ul class="px-5 pt-3 space-y-1.5" aria-label="Sleep timer options">
        <li v-for="minutes in SLEEP_MINUTE_OPTIONS" :key="minutes">
          <button
            type="button"
            class="flex min-h-12 w-full items-center justify-between rounded-2xl px-4 text-left text-sm font-semibold transition active:scale-[0.99] cursor-pointer border"
            :class="
              activeSelection === minutes
                ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-md ring-2 ring-indigo-500/20 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-500/50 dark:shadow-indigo-950/30 font-bold'
                : 'bg-slate-100/70 border-slate-200/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:bg-zinc-800/30 dark:text-zinc-200 dark:border-white/[0.04] dark:hover:bg-zinc-800/60'
            "
            @click="emit('chooseMinutes', minutes)"
          >
            <span>{{ minutes }} minutes</span>
            <Check v-if="activeSelection === minutes" :size="18" class="text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          </button>
        </li>

        <li>
          <button
            type="button"
            class="flex min-h-12 w-full items-center justify-between rounded-2xl px-4 text-left text-sm font-semibold transition active:scale-[0.99] cursor-pointer border"
            :class="
              activeSelection === 'track'
                ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-md ring-2 ring-indigo-500/20 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-500/50 dark:shadow-indigo-950/30 font-bold'
                : 'bg-slate-100/70 border-slate-200/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:bg-zinc-800/30 dark:text-zinc-200 dark:border-white/[0.04] dark:hover:bg-zinc-800/60'
            "
            @click="emit('chooseEndOfTrack')"
          >
            <span>End of current track</span>
            <Check v-if="activeSelection === 'track'" :size="18" class="text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          </button>
        </li>

        <li v-if="isActive" class="pt-2">
          <button
            type="button"
            class="flex min-h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-bold border shadow-md transition active:scale-95 cursor-pointer
                   bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100
                   dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-500/30 dark:hover:bg-rose-900/50"
            @click="emit('turnOff')"
          >
            Turn Off Timer
          </button>
        </li>
      </ul>
    </aside>
  </div>
</template>
