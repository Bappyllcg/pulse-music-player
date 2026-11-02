import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import './style.css'
import App from './App.vue'

// `autoUpdate`: the new service worker activates and claims clients on its own.
registerSW({ immediate: true })

createApp(App).mount('#app')
