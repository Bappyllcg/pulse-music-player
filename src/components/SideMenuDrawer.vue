<script setup lang="ts">
import { ref } from 'vue'
import {
  AudioLines,
  Check,
  ChevronRight,
  Globe,
  Info,
  Music,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
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

/* ------------------------------------------------------------------ */
/* App Update Checker (PWA & Service Worker)                          */
/* ------------------------------------------------------------------ */

const isCheckingUpdate = ref(false)
const updateStatus = ref<'latest' | 'update_available' | 'error' | null>(null)
const lastUpdateChecked = ref<string | null>(null)

async function checkForUpdate(): Promise<void> {
  if (isCheckingUpdate.value) return
  isCheckingUpdate.value = true
  updateStatus.value = null

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await Promise.all([
          registration.update(),
          new Promise((resolve) => setTimeout(resolve, 800)),
        ])
        if (registration.waiting || registration.installing) {
          updateStatus.value = 'update_available'
        } else {
          updateStatus.value = 'latest'
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800))
        updateStatus.value = 'latest'
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 600))
      updateStatus.value = 'latest'
    }
    const now = new Date()
    lastUpdateChecked.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch (err) {
    console.error('[Pulse] Update check failed:', err)
    updateStatus.value = 'error'
  } finally {
    isCheckingUpdate.value = false
  }
}

function applyUpdate(): void {
  window.location.reload()
}

function onNavigate(filter: 'all' | 'online' | 'radio' | 'tv'): void {
  emit('navigate', filter)
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

        <!-- About Section -->
        <div class="space-y-2">
          <div class="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            <Info :size="12" />
            <span>About</span>
          </div>

          <!-- About Card -->
          <div class="rounded-2xl bg-zinc-800/40 p-4 ring-1 ring-white/[0.08] space-y-3.5">
            <div class="flex items-start gap-3">
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 shadow-md shadow-indigo-600/30 ring-1 ring-white/20">
                <AudioLines :size="20" class="text-white" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-bold text-white">Pulse Player</h3>
                  <span class="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-300 ring-1 ring-indigo-500/30">
                    v1.0.0
                  </span>
                </div>
                <p class="text-[11px] text-zinc-400 leading-tight mt-0.5">
                  Private, offline-first media hub for music, radio, and television.
                </p>
              </div>
            </div>

            <!-- Check for Update Button & Status -->
            <div class="space-y-2 pt-1 border-t border-white/[0.06]">
              <button
                type="button"
                class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 ring-1 ring-white/20 transition active:scale-[0.98] hover:bg-indigo-500 disabled:opacity-60"
                :disabled="isCheckingUpdate"
                @click="checkForUpdate"
              >
                <RefreshCw
                  :size="14"
                  :class="{ 'animate-spin': isCheckingUpdate }"
                />
                <span>{{ isCheckingUpdate ? 'Checking for updates...' : 'Check for update' }}</span>
              </button>

              <!-- Update Status Alert -->
              <transition
                enter-active-class="transition duration-150 ease-out"
                enter-from-class="-translate-y-1 opacity-0"
                enter-to-class="translate-y-0 opacity-100"
              >
                <div
                  v-if="updateStatus === 'latest'"
                  class="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-2.5 text-[11px] font-medium text-emerald-400 ring-1 ring-emerald-500/20"
                >
                  <Check :size="13" class="shrink-0" />
                  <span>Pulse is up to date (checked {{ lastUpdateChecked }})</span>
                </div>

                <div
                  v-else-if="updateStatus === 'update_available'"
                  class="flex flex-col gap-2 rounded-xl bg-amber-500/15 p-2.5 text-[11px] text-amber-200 ring-1 ring-amber-500/30"
                >
                  <div class="flex items-center gap-1.5 font-semibold text-amber-300">
                    <Sparkles :size="13" />
                    <span>New version available!</span>
                  </div>
                  <button
                    type="button"
                    class="rounded-lg bg-amber-500 py-1.5 px-3 text-[11px] font-bold text-zinc-950 transition active:scale-95 hover:bg-amber-400"
                    @click="applyUpdate"
                  >
                    Reload to Update
                  </button>
                </div>

                <div
                  v-else-if="updateStatus === 'error'"
                  class="rounded-xl bg-rose-500/10 p-2.5 text-[11px] text-rose-400 ring-1 ring-rose-500/20"
                >
                  Unable to check for updates. Check internet connection.
                </div>
              </transition>
            </div>
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

