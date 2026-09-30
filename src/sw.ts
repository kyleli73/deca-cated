/**
 * Offline support. The installed app (`npm run app`) registers a service
 * worker that caches everything. `npm run dev` uses the same address, so a
 * previously installed build would otherwise keep serving itself instead of
 * the dev server; when the dev server answers, the old worker is removed.
 */
export async function setupServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  if (import.meta.env.DEV) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    return;
  }

  try {
    const res = await fetch('/@vite/client', { cache: 'no-store' });
    if (res.ok && (res.headers.get('content-type') ?? '').includes('javascript')) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      location.reload();
      return;
    }
  } catch {
    // Offline: keep using the installed app.
  }

  const { registerSW } = await import('virtual:pwa-register');
  registerSW({ immediate: true });
}
