<script setup lang="ts">
import { ref } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'
import { SLEEP_MINUTE_OPTIONS } from '../composables/useSleepTimer'

defineProps<{
  open: boolean
  activeSelection: number | 'track' | null
  isActive: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'close'): void
  (e: 'chooseMinutes', minutes: number): void
  (e: 'chooseEndOfTrack'): void
  (e: 'turnOff'): void
}>()

/* ------------------------------------------------------------------ */
/* Swipe-to-Dismiss Gesture                                           */
/* ------------------------------------------------------------------ */

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
      class="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
      :class="open ? 'opacity-100' : 'pointer-events-none opacity-0'"
      aria-hidden="true"
      @click="emit('close'); emit('update:open', false)"
    ></div>

    <!-- Sleep Timer Drawer -->
    <aside
      class="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[2.5rem] bg-zinc-900 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] shadow-2xl ring-1 ring-white/15 transition-transform duration-300 ease-out"
      :class="open ? 'translate-y-0' : 'translate-y-full'"
      :style="sleepDragOffset > 0 ? { transform: `translateY(${sleepDragOffset}px)`, transition: 'none' } : {}"
      :inert="open ? undefined : true"
      role="dialog"
      aria-label="Sleep timer"
    >
      <div
        class="flex items-center justify-between px-6 pt-4 pb-2 cursor-grab active:cursor-grabbing"
        @touchstart="onSleepTouchStart"
        @touchmove="onSleepTouchMove"
        @touchend="onSleepTouchEnd"
        @touchcancel="onSleepTouchEnd"
      >
        <div>
          <div class="mx-auto mb-2 h-1 w-10 rounded-full bg-zinc-700"></div>
          <h2 class="text-xl font-bold text-white">Sleep Timer</h2>
        </div>
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 ring-1 ring-white/10 transition active:scale-90 hover:text-white"
          aria-label="Close sleep timer"
          @click="emit('close'); emit('update:open', false)"
        >
          <ChevronDown :size="20" aria-hidden="true" />
        </button>
      </div>

      <ul class="px-4 pt-2 space-y-1" aria-label="Sleep timer options">
        <li v-for="minutes in SLEEP_MINUTE_OPTIONS" :key="minutes">
          <button
            type="button"
            class="flex min-h-12 w-full items-center justify-between rounded-2xl px-4 text-left text-sm font-semibold transition active:bg-zinc-800"
            :class="activeSelection === minutes ? 'bg-indigo-950/60 text-indigo-300 ring-1 ring-indigo-500/40' : 'text-zinc-200'"
            @click="emit('chooseMinutes', minutes)"
          >
            <span>{{ minutes }} minutes</span>
            <Check v-if="activeSelection === minutes" :size="18" class="text-indigo-400" aria-hidden="true" />
          </button>
        </li>
        <li>
          <button
            type="button"
            class="flex min-h-12 w-full items-center justify-between rounded-2xl px-4 text-left text-sm font-semibold transition active:bg-zinc-800"
            :class="activeSelection === 'track' ? 'bg-indigo-950/60 text-indigo-300 ring-1 ring-indigo-500/40' : 'text-zinc-200'"
            @click="emit('chooseEndOfTrack')"
          >
            <span>End of current track</span>
            <Check v-if="activeSelection === 'track'" :size="18" class="text-indigo-400" aria-hidden="true" />
          </button>
        </li>
        <li v-if="isActive">
          <button
            type="button"
            class="mt-2 flex min-h-12 w-full items-center justify-center rounded-2xl bg-red-950/40 px-4 text-sm font-semibold text-red-400 ring-1 ring-red-500/30 transition active:bg-red-900/50"
            @click="emit('turnOff')"
          >
            Turn off timer
          </button>
        </li>
      </ul>
    </aside>
  </div>
</template>

