export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) {
    window.addEventListener('load', () => {
      const appScope = new URL(import.meta.env.BASE_URL, window.location.origin).href;
      navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        const appRegistrations = registrations.filter((registration) => registration.scope === appScope);
        const removed = await Promise.all(appRegistrations.map((registration) => registration.unregister()));
        if (removed.some(Boolean) && navigator.serviceWorker.controller) window.location.reload();
      }).catch(() => undefined);
    });
    return;
  }
  if (!import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => undefined);
  });
}
