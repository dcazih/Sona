import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import 'react-lazy-load-image-component/src/effects/opacity.css'
import 'react-toastify/dist/ReactToastify.css'

import '@/fonts.css'
import '@/themes.css'
import '@/index.css'
import '@/sona-mobile.css'
import '@/sona-search-categories.css'
import '@/sona-login.css'
import '@/sona-web.css'
import '@/sona-sections.css'
import '@/sona-toast.css'

import '@/i18n'

import App from '@/App'

import { queryClient } from '@/lib/queryClient'
import { useAppStore } from '@/store/app.store'
import { useSonaWebSettings } from '@/store/sona-web-settings.store'
import { blockFeatures } from '@/utils/browser'
import { installSonaDeviceHint } from '@/utils/sona-device'

blockFeatures()
installSonaDeviceHint()

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then((registration) => {
    const sendCachePreferences = () => {
      const cache = useSonaWebSettings.getState()
      const enabled = useAppStore.getState().pages.mediaCacheEnabled
      ;(registration.active || registration.waiting || registration.installing)?.postMessage({
        type: 'sona-media-cache-preferences',
        enabled,
        maxTracks: cache.cacheTracks,
        allowCellular: cache.cellularCache,
      })
    }
    sendCachePreferences()
    navigator.serviceWorker.addEventListener('controllerchange', sendCachePreferences)
    useSonaWebSettings.subscribe(sendCachePreferences)
    useAppStore.subscribe(sendCachePreferences)
  }).catch(() => {
    // Playback remains available when a browser blocks service workers.
  })
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)

// Lazy-load CJK fonts off the critical path from Google Fonts.
const cjkFontLink = document.createElement('link')
cjkFontLink.rel = 'stylesheet'
cjkFontLink.href =
  'https://fonts.googleapis.com/css2' +
  '?family=Noto+Sans+HK:wght@400;600' +
  '&family=Noto+Sans+JP:wght@400;600' +
  '&family=Noto+Sans+KR:wght@400;600' +
  '&family=Noto+Sans+SC:wght@400;600' +
  '&display=swap'
document.head.appendChild(cjkFontLink)
