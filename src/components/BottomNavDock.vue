<script setup lang="ts">
import { Compass, Disc3, Radio, Tv } from 'lucide-vue-next'

export type MainNavTab = 'library' | 'discover' | 'radio' | 'tv'

defineProps<{
  activeTab: MainNavTab
  localCount: number
}>()

const emit = defineEmits<{
  (e: 'selectTab', tab: MainNavTab): void
}>()

interface NavItem {
  id: MainNavTab
  label: string
  icon: typeof Disc3
}

const navItems: NavItem[] = [
  { id: 'library', label: 'Library', icon: Disc3 },
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'radio', label: 'Radio', icon: Radio },
  { id: 'tv', label: 'Live TV', icon: Tv },
]
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-30 flex items-center justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.6rem)] pt-2 pointer-events-none"
    role="navigation"
    aria-label="Primary entertainment navigation"
  >
    <!-- Floating Glass Capsule Dock -->
    <div
      class="glass-dock pointer-events-auto flex items-center justify-around gap-1 rounded-full p-1.5 shadow-2xl max-w-md w-full"
    >
      <button
        v-for="item in navItems"
        :key="item.id"
        type="button"
        class="relative flex flex-1 flex-col items-center justify-center py-2 px-3 rounded-full transition-all duration-200 active:scale-95 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        :class="
          activeTab === item.id
            ? 'dock-tab-active font-bold'
            : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium'
        "
        :aria-current="activeTab === item.id ? 'page' : undefined"
        @click="emit('selectTab', item.id)"
      >
        <!-- Active Background Pill Highlight with Glow -->
        <span
          v-if="activeTab === item.id"
          class="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 shadow-md shadow-indigo-600/35 transition-all duration-300 -z-10"
        ></span>

        <!-- Tab Icon with micro-bounce on active -->
        <div class="relative flex items-center justify-center">
          <component
            :is="item.icon"
            :size="19"
            class="transition-transform duration-200"
            :class="
              activeTab === item.id
                ? '!text-white scale-105 stroke-[2.2]'
                : 'group-hover:scale-105 stroke-[1.8]'
            "
          />
          <!-- Local count pill badge on Library -->
          <span
            v-if="item.id === 'library' && localCount > 0 && activeTab !== 'library'"
            class="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-black text-white shadow-sm"
          >
            {{ localCount > 99 ? '99+' : localCount }}
          </span>
        </div>

        <!-- Tab Label -->
        <span
          class="mt-0.5 text-[11px] tracking-tight"
          :class="activeTab === item.id ? '!text-white font-bold' : ''"
        >
          {{ item.label }}
        </span>
      </button>
    </div>
  </nav>
</template>
