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

  const themeHex = effective === 'light' ? '#f4f4f8' : '#08080c'

  // Update <meta name="color-scheme">
  let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]')
  if (!colorSchemeMeta) {
    colorSchemeMeta = document.createElement('meta')
    colorSchemeMeta.setAttribute('name', 'color-scheme')
    document.head.appendChild(colorSchemeMeta)
  }
  colorSchemeMeta.setAttribute('content', mode === 'system' ? 'light dark' : effective)

  // Update all <meta name="theme-color"> elements to keep Android status bar contrast in sync
  const themeColorMetas = document.querySelectorAll('meta[name="theme-color"]')
  if (themeColorMetas.length > 0) {
    themeColorMetas.forEach((meta) => {
      if (meta.hasAttribute('media')) {
        meta.removeAttribute('media')
      }
      meta.setAttribute('content', themeHex)
    })
  } else {
    const newMeta = document.createElement('meta')
    newMeta.setAttribute('name', 'theme-color')
    newMeta.setAttribute('content', themeHex)
    document.head.appendChild(newMeta)
  }

  // Update <meta name="apple-mobile-web-app-status-bar-style"> for iOS Safari status bar icons
  const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
  if (statusBarMeta) {
    statusBarMeta.setAttribute('content', effective === 'light' ? 'default' : 'black-translucent')
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

