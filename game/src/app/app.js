// What makes the games behave like an iPhone app, shared by the menu and both games:
// offline support (service worker), vibration feedback, and knowing whether we run as an app.

export const isNative = !!window.Capacitor?.isNativePlatform?.();
export const isStandalone = isNative || window.navigator.standalone === true
  || window.matchMedia?.('(display-mode: standalone)').matches || window.matchMedia?.('(display-mode: fullscreen)').matches;
export const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Offline: only on a real web address (not inside the native app, an iframe or a file).
export function registerOffline() {
  const web = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!web || isNative || window.top !== window || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch(() => { /* still playable online */ });
}

// Vibration: the native app's Haptics plugin when present, else the web vibration API (Android).
// iPhone Safari has no web vibration, so on a Home Screen web app this does nothing.
let lastBuzz = 0;
export function buzz(kind = 'light') {
  const now = performance.now();
  if (kind === 'light' && now - lastBuzz < 70) return; // fast guns would buzz non-stop
  lastBuzz = now;
  try {
    const h = window.Capacitor?.Plugins?.Haptics;
    if (h) {
      if (kind === 'success') h.notification({ type: 'SUCCESS' });
      else if (kind === 'error') h.notification({ type: 'ERROR' });
      else h.impact({ style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' });
    } else if (navigator.userActivation?.hasBeenActive) { // browsers refuse vibration before the first tap
      navigator.vibrate?.(kind === 'heavy' ? 40 : kind === 'medium' ? 22 : 8);
    }
  } catch { /* no vibration here */ }
}

registerOffline();
