import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')

if (import.meta.env.DEV) {
  void import('./devHook')
}
