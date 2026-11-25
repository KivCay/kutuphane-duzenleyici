// 0 · Kapak sayfası: logo, ad, sürüm, "Başla". Uygulama her açılışta bir kez gösterir.
/* global __APP_VERSION__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
export const APP_TIER = 'Basic';

const SEEN_KEY = 'kd-kapak-goruldu';

/** Bu oturumda kapak gösterildi mi? (Uygulama kapatılıp açılınca yeniden gösterilir.) */
export function coverSeen() {
  try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return true; }
}

function markSeen() {
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* gizli mod: sorun değil */ }
}

export function render() {
  return `
  <section class="screen cover">
    <div class="cover-body">
      <img class="cover-logo" src="/logo.png" width="168" height="168" alt="">
      <h1 class="cover-title">Kütüphane Düzenleyici</h1>
      <p class="cover-subtitle" lang="en">Library Organizer</p>
    </div>
    <footer class="cover-foot">
      <a class="btn cover-start" href="#/" data-action="start">Başla</a>
      <p class="cover-version">Sürüm ${APP_VERSION} · ${APP_TIER}</p>
    </footer>
  </section>`;
}

export function mount() {
  markSeen();
}
