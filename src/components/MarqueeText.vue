<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ text: string }>()

const container = ref<HTMLElement | null>(null)
const textEl = ref<HTMLElement | null>(null)
const overflowing = ref(false)
const durationSeconds = ref(12)

const GAP_PX = 48
const SPEED_PX_PER_SECOND = 40

function measure(): void {
  if (!container.value || !textEl.value) return
  const textWidth = textEl.value.getBoundingClientRect().width
  overflowing.value = textWidth > container.value.clientWidth + 1
  durationSeconds.value = Math.max(8, (textWidth + GAP_PX) / SPEED_PX_PER_SECOND)
}

let observer: ResizeObserver | null = null

onMounted(() => {
  measure()
  if (container.value && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure)
    observer.observe(container.value)
  }
})

onBeforeUnmount(() => observer?.disconnect())

watch(
  () => props.text,
  async () => {
    await nextTick()
    measure()
  },
)
</script>

<template>
  <div ref="container" class="overflow-hidden whitespace-nowrap">
    <div
      class="inline-flex"
      :class="overflowing ? 'animate-marquee motion-reduce:animate-none' : ''"
      :style="{ '--marquee-duration': `${durationSeconds}s` }"
    >
      <span :class="overflowing ? 'pr-12' : ''"><span ref="textEl">{{ text }}</span></span>
      <span v-if="overflowing" class="pr-12" aria-hidden="true">{{ text }}</span>
    </div>
  </div>
</template>

