<script setup lang="ts">
import { ref } from 'vue'
import {
  AudioLines,
  ChevronRight,
  Globe,
  Info,
  Music,
  Radio,
  ShieldCheck,
  Tv,
  X,
} from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  activeTab: 'library' | 'player'
  selectedFilter: 'all' | 'liked' | 'recent' | 'online' | 'radio' | 'tv'
  localCount: number
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'close'): void
  (e: 'navigate', filter: 'all' | 'online' | 'radio' | 'tv'): void
  (e: 'openAbout'): void
}>()

/* ------------------------------------------------------------------ */
/* Swipe-to-Dismiss Gesture                                           */
/* ------------------------------------------------------------------ */

const menuDragOffset = ref(0)
const isDraggingMenu = ref(false)
let touchStartXMenu = 0

function onMenuTouchStart(e: TouchEvent): void {
  touchStartXMenu = e.touches[0].clientX
  isDraggingMenu.value = true
}

function onMenuTouchMove(e: TouchEvent): void {
  if (!isDraggingMenu.value) return
  const deltaX = e.touches[0].clientX - touchStartXMenu
  // Only allow dragging to the right (closing direction)
  menuDragOffset.value = deltaX > 0 ? deltaX : 0
}

function onMenuTouchEnd(): void {
  if (!isDraggingMenu.value) return
  isDraggingMenu.value = false
  if (menuDragOffset.value > 70) {
    emit('close')
    emit('update:open', false)
  }
  menuDragOffset.value = 0
}

function onNavigate(filter: 'all' | 'online' | 'radio' | 'tv'): void {
  emit('navigate', filter)
  emit('close')
  emit('update:open', false)
}

function onOpenAbout(): void {
  emit('openAbout')
  emit('close')
  emit('update:open', false)
}
</script>

<template>
  <div>
    <!-- Backdrop Overlay -->
    <div
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300"
      :class="open ? 'opacity-100' : 'pointer-events-none opacity-0'"
      aria-hidden="true"
      @click="emit('close'); emit('update:open', false)"
    ></div>

    <!-- Side Push Drawer -->
    <aside
      class="fixed inset-y-0 right-0 z-50 flex w-80 max-w-[85vw] flex-col justify-between bg-zinc-900/95 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] shadow-2xl ring-1 ring-white/10 backdrop-blur-2xl transition-transform duration-300 ease-out"
      :class="open ? 'translate-x-0' : 'translate-x-full'"
      :style="menuDragOffset > 0 ? { transform: `translateX(${menuDragOffset}px)`, transition: 'none' } : {}"
      :inert="open ? undefined : true"
      role="dialog"
      aria-label="Navigation and about menu"
      @touchstart="onMenuTouchStart"
      @touchmove="onMenuTouchMove"
      @touchend="onMenuTouchEnd"
      @touchcancel="onMenuTouchEnd"
    >
      <!-- Top Scrollable Section -->
      <div class="flex-1 overflow-y-auto px-5 space-y-6">
        <!-- Drawer Header -->
        <div class="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div class="flex items-center gap-2.5">
            <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30">
              <AudioLines :size="16" />
            </div>
            <h2 class="text-base font-bold text-white tracking-tight">Menu</h2>
          </div>
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 ring-1 ring-white/10 transition active:scale-90 hover:text-white"
            aria-label="Close menu"
            @click="emit('close'); emit('update:open', false)"
          >
            <X :size="18" />
          </button>
        </div>

        <!-- Quick Navigation Section -->
        <div class="space-y-1.5">
          <p class="px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Navigation
          </p>
          <div class="space-y-1">
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-2xl p-2.5 text-xs font-semibold transition active:scale-[0.98] hover:bg-zinc-800/80"
              :class="selectedFilter === 'all' && activeTab === 'library' ? 'bg-indigo-950/40 text-indigo-300 ring-1 ring-indigo-500/30' : 'text-zinc-200'"
              @click="onNavigate('all')"
            >
              <div class="flex items-center gap-2.5">
                <Music :size="16" class="text-indigo-400" />
                <span>Offline Music</span>
              </div>
              <span class="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-400 font-medium">
                {{ localCount }}
              </span>
            </button>

            <button
              type="button"
              class="flex w-full items-center justify-between rounded-2xl p-2.5 text-xs font-semibold transition active:scale-[0.98] hover:bg-zinc-800/80"
              :class="selectedFilter === 'online' && activeTab === 'library' ? 'bg-indigo-950/40 text-indigo-300 ring-1 ring-indigo-500/30' : 'text-zinc-200'"
              @click="onNavigate('online')"
            >
              <div class="flex items-center gap-2.5">
                <Globe :size="16" class="text-indigo-400" />
                <span>Online Music</span>
              </div>
              <ChevronRight :size="14" class="text-zinc-500" />
            </button>

            <button
              type="button"
              class="flex w-full items-center justify-between rounded-2xl p-2.5 text-xs font-semibold transition active:scale-[0.98] hover:bg-zinc-800/80"
              :class="selectedFilter === 'radio' && activeTab === 'library' ? 'bg-rose-950/40 text-rose-300 ring-1 ring-rose-500/30' : 'text-zinc-200'"
              @click="onNavigate('radio')"
            >
              <div class="flex items-center gap-2.5">
                <Radio :size="16" class="text-rose-400" />
                <span>Live Radio</span>
              </div>
              <ChevronRight :size="14" class="text-zinc-500" />
            </button>

            <button
              type="button"
              class="flex w-full items-center justify-between rounded-2xl p-2.5 text-xs font-semibold transition active:scale-[0.98] hover:bg-zinc-800/80"
              :class="selectedFilter === 'tv' && activeTab === 'library' ? 'bg-amber-950/40 text-amber-300 ring-1 ring-amber-500/30' : 'text-zinc-200'"
              @click="onNavigate('tv')"
            >
              <div class="flex items-center gap-2.5">
                <Tv :size="16" class="text-amber-400" />
                <span>Live TV</span>
              </div>
              <ChevronRight :size="14" class="text-zinc-500" />
            </button>
          </div>
        </div>

        <!-- About & Information Menu Item Section -->
        <div class="space-y-1.5">
          <p class="px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            About & System
          </p>
          <div class="space-y-1">
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-2xl p-2.5 text-xs font-semibold text-zinc-200 transition active:scale-[0.98] hover:bg-zinc-800/80"
              @click="onOpenAbout"
            >
              <div class="flex items-center gap-2.5">
                <div class="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30">
                  <Info :size="15" />
                </div>
                <div class="text-left">
                  <div class="text-xs font-semibold text-white">About Pulse</div>
                  <div class="text-[10px] font-normal text-zinc-400">Updates, system info & license</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-300 ring-1 ring-indigo-500/30">
                  v1.0.0
                </span>
                <ChevronRight :size="14" class="text-zinc-500" />
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Bottom Drawer Footer -->
      <div class="px-5 pt-3 border-t border-white/[0.08]">
        <div class="flex items-center justify-between text-[11px] text-zinc-500">
          <div class="flex items-center gap-1.5 text-zinc-400">
            <ShieldCheck :size="13" class="text-emerald-400" />
            <span>Zero tracking · 100% private</span>
          </div>
          <span class="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[9px] text-zinc-400">PWA</span>
        </div>
      </div>
    </aside>
  </div>
</template>
