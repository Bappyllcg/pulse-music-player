<script setup lang="ts">
import { Check, MinusCircle } from 'lucide-vue-next'

defineProps<{
  track: { id: string; title: string } | null
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="track"
      class="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-dialog-title"
      @click.self="emit('cancel')"
    >
      <div
        class="relative w-full max-w-xs overflow-hidden rounded-[2rem] bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 text-center shadow-2xl ring-1 ring-white/15"
      >
        <!-- Header Icon -->
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30">
          <MinusCircle :size="26" />
        </div>

        <!-- Title & Track Name -->
        <h3 id="remove-dialog-title" class="text-base font-bold text-white">
          Remove from Playlist?
        </h3>
        <p class="mt-2 text-xs leading-relaxed text-zinc-400">
          <span class="font-semibold text-zinc-200">“{{ track.title }}”</span> will be removed from your active playlist.
        </p>

        <!-- Reassurance Note Badge -->
        <div class="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-zinc-800/80 px-3 py-1 text-[11px] font-medium text-zinc-400 ring-1 ring-white/5">
          <Check :size="12" class="text-emerald-400" />
          <span>Your original file stays safe on device</span>
        </div>

        <!-- Actions Row -->
        <div class="mt-6 flex flex-col gap-2">
          <button
            type="button"
            class="w-full rounded-2xl bg-white py-3 text-xs font-bold text-zinc-950 shadow-lg shadow-white/10 transition active:scale-[0.98] hover:bg-zinc-100"
            @click="emit('confirm')"
          >
            Remove from Playlist
          </button>
          <button
            type="button"
            class="w-full rounded-2xl bg-zinc-800/70 py-3 text-xs font-semibold text-zinc-300 ring-1 ring-white/10 transition active:scale-[0.98] hover:text-white hover:bg-zinc-800"
            @click="emit('cancel')"
          >
            Keep Song
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

