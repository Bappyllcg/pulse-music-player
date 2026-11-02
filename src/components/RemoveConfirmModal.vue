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
  <Transition name="modal-spring">
    <div
      v-if="track"
      class="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-dialog-title"
      @click.self="emit('cancel')"
    >
      <div
        class="modal-dialog-sheet relative w-full max-w-xs overflow-hidden rounded-[2rem] border p-6 text-center shadow-2xl
               bg-white border-slate-200 text-slate-900
               dark:bg-gradient-to-b dark:from-zinc-900 dark:to-zinc-950 dark:border-white/15 dark:text-zinc-100"
      >
        <!-- Header Icon -->
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30">
          <MinusCircle :size="26" />
        </div>

        <!-- Title & Track Name -->
        <h3 id="remove-dialog-title" class="text-base font-bold text-slate-900 dark:text-white">
          Remove from Playlist?
        </h3>
        <p class="mt-2 text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
          <span class="font-semibold text-slate-800 dark:text-zinc-200">“{{ track.title }}”</span> will be removed from your active playlist.
        </p>

        <!-- Reassurance Note Badge -->
        <div class="mt-3.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium border
                    bg-slate-100 text-slate-600 border-slate-200
                    dark:bg-zinc-800/80 dark:text-zinc-400 dark:border-white/5">
          <Check :size="12" class="text-emerald-600 dark:text-emerald-400" />
          <span>Your original file stays safe on device</span>
        </div>

        <!-- Actions Row -->
        <div class="mt-6 flex flex-col gap-2">
          <button
            type="button"
            class="w-full rounded-2xl py-3 text-xs font-bold transition active:scale-[0.98] cursor-pointer shadow-md
                   bg-rose-600 text-white hover:bg-rose-500
                   dark:bg-rose-600 dark:text-white dark:hover:bg-rose-500"
            @click="emit('confirm')"
          >
            Remove from Playlist
          </button>
          <button
            type="button"
            class="w-full rounded-2xl border py-3 text-xs font-semibold transition active:scale-[0.98] cursor-pointer
                   bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200
                   dark:bg-zinc-800/70 dark:text-zinc-300 dark:border-white/10 dark:hover:bg-zinc-800 dark:hover:text-white"
            @click="emit('cancel')"
          >
            Keep Song
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
