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
    class="w-full border-t border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#0c0c14]/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)] select-none shrink-0"
    role="tablist"
    aria-label="Main entertainment navigation"
  >
    <div
      class="max-w-md mx-auto flex items-center justify-around gap-1 px-3 pt-1.5"
      style="padding-bottom: max(env(safe-area-inset-bottom, 0px), 12px);"
    >
      <button
        v-for="item in navItems"
        :key="item.id"
        type="button"
        role="tab"
        :aria-selected="activeTab === item.id"
        class="relative flex flex-1 flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all duration-150 active:scale-95 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        :class="
          activeTab === item.id
            ? 'dock-tab-active bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 !text-white font-bold shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.05] font-medium'
        "
        @click="emit('selectTab', item.id)"
      >
        <div class="relative flex items-center justify-center">
          <component
            :is="item.icon"
            :size="19"
            class="transition-transform duration-150"
            :class="
              activeTab === item.id
                ? '!text-white scale-105 stroke-[2.2]'
                : 'group-hover:scale-105 stroke-[1.8]'
            "
          />

          <!-- Local count badge on Library -->
          <span
            v-if="item.id === 'library' && localCount > 0"
            class="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] font-black shrink-0 transition"
            :class="
              activeTab === item.id
                ? 'bg-white/25 !text-white'
                : 'bg-indigo-600 !text-white shadow-xs'
            "
          >
            {{ localCount > 99 ? '99+' : localCount }}
          </span>
        </div>

        <span
          class="mt-0.5 text-[10px] tracking-tight whitespace-nowrap"
          :class="activeTab === item.id ? '!text-white font-bold' : ''"
        >
          {{ item.label }}
        </span>
      </button>
    </div>
  </nav>
</template>
