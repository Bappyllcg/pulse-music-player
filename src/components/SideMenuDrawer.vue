<script setup lang="ts">
import { ref } from 'vue'
import {
  AudioLines,
  ChevronRight,
  Compass,
  Disc3,
  Info,
  Radio,
  Settings,
  ShieldCheck,
  Tv,
  X,
} from 'lucide-vue-next'
import type { MainNavTab } from './BottomNavDock.vue'

defineProps<{
  open: boolean
  activeMainTab: MainNavTab
  localCount: number
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'close'): void
  (e: 'navigate', tab: MainNavTab): void
  (e: 'openAbout'): void
  (e: 'openSettings'): void
}>()

/* Swipe-to-Dismiss Gesture */
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

function onNavigate(tab: MainNavTab): void {
  emit('navigate', tab)
  emit('close')
  emit('update:open', false)
}

function onOpenAbout(): void {
  emit('openAbout')
  emit('close')
  emit('update:open', false)
}

function onOpenSettings(): void {
  emit('openSettings')
  emit('close')
  emit('update:open', false)
}
</script>

<template>
  <div>
    <!-- Backdrop Overlay -->
    <div
      class="fixed inset-0 z-50 bg-black/75 backdrop-blur-md transition-opacity duration-300"
      :class="open ? 'opacity-100' : 'pointer-events-none opacity-0'"
      aria-hidden="true"
      @click="emit('close'); emit('update:open', false)"
    ></div>

    <!-- Side Push Drawer -->
    <aside
      class="fixed inset-y-0 right-0 z-50 flex w-80 max-w-[85vw] flex-col justify-between pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] shadow-2xl backdrop-blur-2xl transition-transform duration-300 ease-out border-l
             bg-white border-slate-200 text-slate-900
             dark:bg-zinc-900/95 dark:border-white/10 dark:text-zinc-100"
      :class="open ? 'translate-x-0' : 'translate-x-full'"
      :style="menuDragOffset > 0 ? { transform: `translateX(${menuDragOffset}px)`, transition: 'none' } : {}"
      :inert="open ? undefined : true"
      role="dialog"
      aria-label="Navigation and options menu"
      @touchstart="onMenuTouchStart"
      @touchmove="onMenuTouchMove"
      @touchend="onMenuTouchEnd"
    >
      <!-- Top Header -->
      <div class="px-6">
        <div class="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.08] pb-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 shadow-md shadow-indigo-600/30 ring-1 ring-white/20">
              <AudioLines :size="20" class="text-white" />
            </div>
            <div>
              <h2 class="text-base font-bold text-slate-900 dark:text-white tracking-tight">Pulse Hub</h2>
              <span class="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">v2.0.0 • PWA</span>
            </div>
          </div>

          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full border transition active:scale-90 cursor-pointer
                   bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-800
                   dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10 dark:hover:bg-zinc-700 dark:hover:text-white"
            aria-label="Close menu"
            @click="emit('close'); emit('update:open', false)"
          >
            <X :size="16" />
          </button>
        </div>

        <!-- Navigation Sections -->
        <nav class="mt-6 space-y-1.5" aria-label="Entertainment sections">
          <div class="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
            Entertainment Pillars
          </div>

          <button
            type="button"
            class="flex w-full items-center justify-between rounded-2xl p-3 text-left transition active:scale-[0.98] border cursor-pointer"
            :class="
              activeMainTab === 'library'
                ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-sm ring-1 ring-indigo-500/20 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-500/40 dark:shadow-indigo-950/20'
                : 'bg-slate-100/70 border-slate-200/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:bg-zinc-800/30 dark:text-zinc-300 dark:border-white/[0.04] dark:hover:bg-zinc-800/60 dark:hover:text-white'
            "
            @click="onNavigate('library')"
          >
            <div class="flex items-center gap-3">
              <Disc3 :size="18" class="text-indigo-600 dark:text-indigo-400" />
              <div>
                <div class="text-xs font-bold text-slate-900 dark:text-white">Personal Library</div>
                <div class="text-[10px] text-slate-500 dark:text-zinc-400">{{ localCount }} offline tracks</div>
              </div>
            </div>
            <ChevronRight :size="16" class="text-slate-400 dark:text-zinc-500" />
          </button>

          <button
            type="button"
            class="flex w-full items-center justify-between rounded-2xl p-3 text-left transition active:scale-[0.98] border cursor-pointer"
            :class="
              activeMainTab === 'discover'
                ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-sm ring-1 ring-indigo-500/20 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-500/40 dark:shadow-indigo-950/20'
                : 'bg-slate-100/70 border-slate-200/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:bg-zinc-800/30 dark:text-zinc-300 dark:border-white/[0.04] dark:hover:bg-zinc-800/60 dark:hover:text-white'
            "
            @click="onNavigate('discover')"
          >
            <div class="flex items-center gap-3">
              <Compass :size="18" class="text-purple-600 dark:text-indigo-400" />
              <div>
                <div class="text-xs font-bold text-slate-900 dark:text-white">Online Discover</div>
                <div class="text-[10px] text-slate-500 dark:text-zinc-400">Jamendo royalty-free streams</div>
              </div>
            </div>
            <ChevronRight :size="16" class="text-slate-400 dark:text-zinc-500" />
          </button>

          <button
            type="button"
            class="flex w-full items-center justify-between rounded-2xl p-3 text-left transition active:scale-[0.98] border cursor-pointer"
            :class="
              activeMainTab === 'radio'
                ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-sm ring-1 ring-rose-500/20 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/40 dark:shadow-rose-950/20'
                : 'bg-slate-100/70 border-slate-200/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:bg-zinc-800/30 dark:text-zinc-300 dark:border-white/[0.04] dark:hover:bg-zinc-800/60 dark:hover:text-white'
            "
            @click="onNavigate('radio')"
          >
            <div class="flex items-center gap-3">
              <Radio :size="18" class="text-rose-600 dark:text-rose-400" />
              <div>
                <div class="text-xs font-bold text-slate-900 dark:text-white">Live Radio</div>
                <div class="text-[10px] text-slate-500 dark:text-zinc-400">Worldwide & regional streams</div>
              </div>
            </div>
            <ChevronRight :size="16" class="text-slate-400 dark:text-zinc-500" />
          </button>

          <button
            type="button"
            class="flex w-full items-center justify-between rounded-2xl p-3 text-left transition active:scale-[0.98] border cursor-pointer"
            :class="
              activeMainTab === 'tv'
                ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm ring-1 ring-amber-500/20 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/40 dark:shadow-amber-950/20'
                : 'bg-slate-100/70 border-slate-200/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:bg-zinc-800/30 dark:text-zinc-300 dark:border-white/[0.04] dark:hover:bg-zinc-800/60 dark:hover:text-white'
            "
            @click="onNavigate('tv')"
          >
            <div class="flex items-center gap-3">
              <Tv :size="18" class="text-amber-600 dark:text-amber-400" />
              <div>
                <div class="text-xs font-bold text-slate-900 dark:text-white">Live Cinema TV</div>
                <div class="text-[10px] text-slate-500 dark:text-zinc-400">HLS video & IPTV channels</div>
              </div>
            </div>
            <ChevronRight :size="16" class="text-slate-400 dark:text-zinc-500" />
          </button>
        </nav>

        <!-- Tools & Options Section -->
        <div class="mt-6 space-y-1.5">
          <div class="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
            Preferences & Information
          </div>

          <button
            type="button"
            class="flex w-full items-center justify-between rounded-2xl border p-3 text-left transition active:scale-[0.98] cursor-pointer
                   bg-slate-100/70 border-slate-200/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900
                   dark:bg-zinc-800/30 dark:border-white/[0.04] dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-white"
            @click="onOpenSettings"
          >
            <div class="flex items-center gap-3">
              <Settings :size="18" class="text-slate-500 dark:text-zinc-400" />
              <div class="text-xs font-bold text-slate-900 dark:text-white">Settings & Appearance</div>
            </div>
            <ChevronRight :size="16" class="text-slate-400 dark:text-zinc-500" />
          </button>

          <button
            type="button"
            class="flex w-full items-center justify-between rounded-2xl border p-3 text-left transition active:scale-[0.98] cursor-pointer
                   bg-slate-100/70 border-slate-200/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900
                   dark:bg-zinc-800/30 dark:border-white/[0.04] dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-white"
            @click="onOpenAbout"
          >
            <div class="flex items-center gap-3">
              <Info :size="18" class="text-slate-500 dark:text-zinc-400" />
              <div class="text-xs font-bold text-slate-900 dark:text-white">About Pulse Player</div>
            </div>
            <ChevronRight :size="16" class="text-slate-400 dark:text-zinc-500" />
          </button>
        </div>
      </div>

      <!-- Footer Info -->
      <div class="px-6 pt-4 border-t border-slate-200/80 dark:border-white/[0.08]">
        <div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
          <ShieldCheck :size="15" />
          <span>Zero remote tracking • Private</span>
        </div>
        <p class="mt-1 text-[11px] text-slate-500 dark:text-zinc-500">
          Crafted with Vue 3, TypeScript, and HLS.js
        </p>
      </div>
    </aside>
  </div>
</template>
