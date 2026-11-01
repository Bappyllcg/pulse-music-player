import { ref } from 'vue'

export type ThemeMode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'pulse:theme'

const theme = ref<ThemeMode>('system')
const resolvedTheme = ref<'light' | 'dark'>('dark')
let isInitialized = false

function getStoredTheme(): ThemeMode {
  try {
    const val = localStorage.getItem(STORAGE_KEY)
    if (val === 'light' || val === 'dark' || val === 'system') {
      return val
    }
  } catch {
    // Ignore localStorage errors
  }
  return 'system'
}

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

function updateMetaTags(effective: 'light' | 'dark', mode: ThemeMode): void {
  if (typeof document === 'undefined') return

  // Update <meta name="color-scheme">
  let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]')
  if (!colorSchemeMeta) {
    colorSchemeMeta = document.createElement('meta')
    colorSchemeMeta.setAttribute('name', 'color-scheme')
    document.head.appendChild(colorSchemeMeta)
  }
  colorSchemeMeta.setAttribute('content', mode === 'system' ? 'light dark' : effective)

  // Update <meta name="theme-color">
  const themeColorMeta = document.querySelector('meta[name="theme-color"]')
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', effective === 'light' ? '#f4f4f5' : '#09090b')
  }
}

function applyTheme(newTheme: ThemeMode): void {
  theme.value = newTheme

  try {
    localStorage.setItem(STORAGE_KEY, newTheme)
  } catch {
    // Ignore storage quota
  }

  const effective = newTheme === 'system' ? getSystemPreference() : newTheme
  resolvedTheme.value = effective

  if (typeof document !== 'undefined') {
    const root = document.documentElement
    if (effective === 'light') {
      root.classList.add('light')
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
      root.style.colorScheme = 'light'
    } else {
      root.classList.add('dark')
      root.classList.remove('light')
      root.setAttribute('data-theme', 'dark')
      root.style.colorScheme = 'dark'
    }
    updateMetaTags(effective, newTheme)
  }
}

export function useTheme() {
  function initTheme(): void {
    if (isInitialized) return
    isInitialized = true

    theme.value = getStoredTheme()
    applyTheme(theme.value)

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)')
      const onChange = () => {
        if (theme.value === 'system') {
          applyTheme('system')
        }
      }
      if (mql.addEventListener) {
        mql.addEventListener('change', onChange)
      } else {
        mql.addListener(onChange)
      }

      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          if (e.newValue === 'system' || e.newValue === 'light' || e.newValue === 'dark') {
            applyTheme(e.newValue as ThemeMode)
          }
        }
      })
    }
  }

  return {
    theme,
    resolvedTheme,
    setTheme: applyTheme,
    initTheme,
  }
}

