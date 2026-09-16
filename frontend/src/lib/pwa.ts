/** Registers the generated service worker in production builds only (vite-plugin-pwa injects the file). */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(err => {
      console.warn('Service worker registration failed', err);
    });
  });
}
