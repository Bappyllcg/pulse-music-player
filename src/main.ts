import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import './style.css'
import App from './App.vue'

// `autoUpdate`: the new service worker activates and claims clients on its own.
registerSW({ immediate: true })

/**
 * iOS standalone (Home Screen) WebKit bug: with `viewport-fit=cover` and a
 * `black-translucent` status bar, the layout viewport is reported shorter than
 * the physical screen by the status-bar height, leaving a blank strip under the
 * bottom navigation. We measure the real height and expose it as `--app-height`.
 */
function syncAppHeight(): void {
  let height = window.innerHeight
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const isStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches

  if (isIOS && isStandalone) {
    const portrait = window.matchMedia('(orientation: portrait)').matches
    const screenHeight = portrait
      ? Math.max(window.screen.width, window.screen.height)
      : Math.min(window.screen.width, window.screen.height)
    height = Math.max(height, screenHeight)
  }

  document.documentElement.style.setProperty('--app-height', `${height}px`)
}

syncAppHeight()
window.addEventListener('resize', syncAppHeight)
window.addEventListener('orientationchange', () => window.setTimeout(syncAppHeight, 300))
window.addEventListener('pageshow', syncAppHeight)

createApp(App).mount('#app')
