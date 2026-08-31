/**
 * The old sw.js had install and activate but no fetch handler, so it cached
 * files it never served — offline was still a blank page. This one takes over
 * as soon as a new version ships and reloads the page once, so nobody at home
 * has to clear their cache to see an update.
 */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return

  window.addEventListener('load', () => {
    const url = `${import.meta.env.BASE_URL}sw.js`
    navigator.serviceWorker.register(url).catch((err) => {
      console.warn('Service worker registration failed', err)
    })
  })

  // A new worker taking control means a new version — reload once (guarded so it cannot loop)
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  })
}
