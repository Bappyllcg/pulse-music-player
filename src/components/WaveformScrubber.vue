<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  trackId: string
  currentTime: number
  duration: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'seek', time: number): void
}>()

const BAR_COUNT = 44

/** Generate a deterministic waveform pattern for the given track ID */
const bars = computed(() => {
  const seedStr = props.trackId || 'pulse'
  let h = 0
  for (let i = 0; i < seedStr.length; i++) {
    h = (Math.imul(31, h) + seedStr.charCodeAt(i)) | 0
  }
  const result: number[] = []
  for (let i = 0; i < BAR_COUNT; i++) {
    // Generate organic soundwave envelope (tapers at edges, higher in middle)
    const normalizedPos = i / (BAR_COUNT - 1)
    const envelope = Math.sin(normalizedPos * Math.PI) * 0.5 + 0.35
    h = (Math.imul(48271, h) + 11) | 0
    const rand = Math.abs(h % 100) / 100
    const heightPercent = Math.max(16, Math.min(95, Math.round((envelope * 0.65 + rand * 0.35) * 100)))
    result.push(heightPercent)
  }
  return result
})

const isDragging = ref(false)
const dragPercent = ref(0)
const containerRef = ref<HTMLElement | null>(null)

const progressPercent = computed(() => {
  if (isDragging.value) return dragPercent.value
  if (!props.duration || props.duration <= 0) return 0
  return Math.min(100, Math.max(0, (props.currentTime / props.duration) * 100))
})

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const whole = Math.floor(seconds)
  const mins = Math.floor(whole / 60)
  const secs = whole % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const displayTime = computed(() => {
  if (isDragging.value && props.duration > 0) {
    return (dragPercent.value / 100) * props.duration
  }
  return props.currentTime
})

function calculatePercent(clientX: number): number {
  if (!containerRef.value) return 0
  const rect = containerRef.value.getBoundingClientRect()
  const x = clientX - rect.left
  return Math.min(100, Math.max(0, (x / rect.width) * 100))
}

function handlePointerDown(e: PointerEvent): void {
  if (props.disabled || props.duration <= 0) return
  isDragging.value = true
  dragPercent.value = calculatePercent(e.clientX)
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function handlePointerMove(e: PointerEvent): void {
  if (!isDragging.value) return
  dragPercent.value = calculatePercent(e.clientX)
}

function handlePointerUp(_e: PointerEvent): void {
  if (!isDragging.value) return
  isDragging.value = false
  if (props.duration > 0) {
    const targetTime = (dragPercent.value / 100) * props.duration
    emit('seek', targetTime)
  }
}

function handleKeyStep(delta: number): void {
  if (props.disabled || props.duration <= 0) return
  const target = Math.min(props.duration, Math.max(0, props.currentTime + delta))
  emit('seek', target)
}

function handleKeySeek(target: number): void {
  if (props.disabled || props.duration <= 0) return
  emit('seek', Math.min(props.duration, Math.max(0, target)))
}
</script>

<template>
  <div class="w-full select-none py-1">
    <!-- Waveform Canvas / Bars Area with full ARIA Slider semantics -->
    <div
      ref="containerRef"
      role="slider"
      :tabindex="disabled ? -1 : 0"
      :aria-valuenow="Math.round(displayTime)"
      aria-valuemin="0"
      :aria-valuemax="Math.round(duration)"
      :aria-valuetext="`${formatTime(displayTime)} of ${formatTime(duration)}`"
      aria-label="Track progress"
      class="relative flex h-14 w-full cursor-pointer items-center justify-between gap-[3px] py-1 touch-none rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      :class="{ 'opacity-40 pointer-events-none': disabled }"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
      @keydown.left.prevent="handleKeyStep(-5)"
      @keydown.right.prevent="handleKeyStep(5)"
      @keydown.page-down.prevent="handleKeyStep(-30)"
      @keydown.page-up.prevent="handleKeyStep(30)"
      @keydown.home.prevent="handleKeySeek(0)"
      @keydown.end.prevent="handleKeySeek(duration)"
    >
      <!-- Background subtle hover bar -->
      <div
        v-for="(barHeight, idx) in bars"
        :key="idx"
        class="relative flex-1 rounded-full transition-all duration-75"
        :style="{ height: `${barHeight}%` }"
        :class="
          (idx / BAR_COUNT) * 100 <= progressPercent
            ? 'bg-gradient-to-t from-indigo-500 via-indigo-400 to-white shadow-[0_0_6px_rgba(99,102,241,0.35)]'
            : 'bg-zinc-800/80'
        "
      ></div>

      <!-- Scrubber needle/cursor line -->
      <div
        v-if="duration > 0"
        class="pointer-events-none absolute top-0 bottom-0 z-10 w-[2px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_8px_#ffffff]"
        :style="{ left: `${progressPercent}%` }"
      >
        <div class="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white shadow-md"></div>
      </div>
    </div>

    <!-- Timestamps below waveform -->
    <div class="mt-1 flex items-center justify-between text-xs font-medium tabular-nums text-zinc-400">
      <span>{{ formatTime(displayTime) }}</span>
      <span>{{ formatTime(duration) }}</span>
    </div>
  </div>
</template>
