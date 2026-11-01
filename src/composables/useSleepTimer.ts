import { computed, ref, watch } from 'vue'
import { onPlayerTimeUpdate, usePlayer } from './usePlayer'

export const SLEEP_MINUTE_OPTIONS = [5, 10, 15, 30, 45, 60] as const

export type SleepSelection = number | 'track' | null

// Module-level singleton so the timer outlives any component.
const endsAt = ref<number | null>(null)
const remainingSeconds = ref(0)
const selection = ref<SleepSelection>(null)
/** Incremented whenever the timer stops playback. */
const firedCount = ref(0)

let interval: number | undefined
let initialized = false

export function useSleepTimer() {
  const player = usePlayer()

  const isActive = computed(() => selection.value !== null)

  function clearTick(): void {
    window.clearInterval(interval)
    interval = undefined
  }

  /** Uses a wall-clock deadline (not a countdown counter) so throttled timers can't drift. */
  function tick(): void {
    if (endsAt.value === null) return
    const left = Math.ceil((endsAt.value - Date.now()) / 1000)
    if (left > 0) {
      remainingSeconds.value = left
      return
    }
    player.pause()
    firedCount.value += 1
    cancel()
  }

  function cancel(): void {
    clearTick()
    endsAt.value = null
    remainingSeconds.value = 0
    selection.value = null
    player.stopAfterCurrent.value = false
  }

  function startMinutes(minutes: number): void {
    cancel()
    selection.value = minutes
    endsAt.value = Date.now() + minutes * 60_000
    remainingSeconds.value = minutes * 60
    interval = window.setInterval(tick, 1000)
  }

  function startEndOfTrack(): void {
    cancel()
    selection.value = 'track'
    player.stopAfterCurrent.value = true
  }

  if (!initialized) {
    initialized = true
    // When the player halts at the end of a track, the "End of track" timer is spent.
    watch(player.stopAfterCurrentFired, () => {
      selection.value = null
      firedCount.value += 1
    })
    // A suspended page can miss its interval; re-check as soon as it is visible again.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') tick()
    })
    // iOS Safari lock-screen continuity:
    // When the screen is locked, WebKit freezes setInterval, but <audio> timeupdate
    // continues firing on the media thread. We check the wall-clock deadline on each audio tick.
    onPlayerTimeUpdate(tick)
  }

  return {
    selection,
    remainingSeconds,
    isActive,
    firedCount,
    startMinutes,
    startEndOfTrack,
    cancel,
  }
}
