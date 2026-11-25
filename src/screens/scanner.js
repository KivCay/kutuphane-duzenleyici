// 3 · Tarayıcı: kamerayla ISBN barkodu okuma; kamera kullanılamazsa elle giriş.
import { state } from '../state.js';
import { esc, icon } from '../ui.js';
import { formatLocation } from '../modules/location.js';
import { isValidIsbn, normalizeIsbn } from '../modules/books.js';
import { startScanner, cameraErrorCode } from '../modules/camera.js';

const CAMERA_HELP = {
  'izin-yok': 'Kameraya izin verilmedi. Adres çubuğundaki kilit ya da “aA” simgesine dokunup kamera iznini aç, sonra “Tekrar dene”ye bas. Ya da ISBN\'i elle yaz.',
  'kamera-yok': 'Bu cihazda kamera bulunamadı. ISBN\'i elle yazabilirsin.',
  mesgul: 'Kamera başka bir uygulama tarafından kullanılıyor. O uygulamayı kapatıp “Tekrar dene”ye bas.',
  'guvenli-degil': 'Kamera yalnızca güvenli (https) adreste çalışır. ISBN\'i elle yazabilirsin.',
  desteklenmiyor: 'Bu tarayıcı kamerayı desteklemiyor. Telefonda Safari ya da Chrome ile aç, ya da ISBN\'i elle yaz.',
  bilinmiyor: 'Kamera açılamadı. “Tekrar dene”ye bas ya da ISBN\'i elle yaz.',
};
const NO_RETRY = new Set(['kamera-yok', 'guvenli-degil', 'desteklenmiyor']);

export function render() {
  const loc = formatLocation(state.location);
  return `
  <section class="screen dark">
    <header class="bar">
      <a class="round-btn" href="#/" aria-label="Bitir, kütüphaneye dön">${icon.back}</a>
      <h1 class="bar-title">Kitap okut</h1>
    </header>
    <div class="scroll pad stack-16">
      <div class="viewfinder" id="viewfinder">
        <video id="cam" playsinline muted aria-label="Kamera görüntüsü"></video>
        <span class="vf-corner tl"></span><span class="vf-corner tr"></span>
        <span class="vf-corner bl"></span><span class="vf-corner br"></span>
        <span class="vf-line" aria-hidden="true"></span>
        <p class="vf-status" id="cam-status">Kamera açılıyor…</p>
      </div>
      <p class="scan-hint">Kitabın arka kapağındaki barkodu çerçevenin içine getir. Okununca bilgiler otomatik bulunur. Etiketli bir kitabın QR'ını okutursan kitap listende açılır.</p>
      <div class="cam-error" id="cam-error" role="alert" hidden>
        <p id="cam-error-text"></p>
        <button type="button" class="btn btn-secondary" data-action="retry">Tekrar dene</button>
      </div>

      <details class="manual" id="manual">
        <summary class="btn btn-ghost on-dark">ISBN'i elle yaz</summary>
        <form class="stack-8" id="isbn-form" novalidate>
          <label class="section-label on-dark" for="isbn">ISBN (barkodun üstündeki 978… numarası)</label>
          <input class="field" id="isbn" aria-describedby="isbn-error" inputmode="numeric" autocomplete="off" placeholder="978…" maxlength="20" enterkeyhint="go">
          <p class="error" id="isbn-error" role="alert" hidden></p>
          <button class="btn btn-primary" type="submit">Devam</button>
          <button class="btn btn-ghost on-dark" type="button" data-action="no-isbn">ISBN'i olmayan kitap ekle</button>
        </form>
      </details>
    </div>
    <footer class="actions">
      <a class="loc-strip on-dark" href="#/yer?sonra=okut">
        ${icon.pin}
        <span class="loc-strip-text"><span class="loc-strip-value">${loc ? esc(loc) : 'Yer belirtilmedi'}</span></span>
        <span class="link-text">Değiştir</span>
      </a>
    </footer>
  </section>`;
}

export function mount(root, { go, query }) {
  const justSaved = query.get('son');
  const video = root.querySelector('#cam');
  const status = root.querySelector('#cam-status');
  const errBox = root.querySelector('#cam-error');
  const errText = root.querySelector('#cam-error-text');
  const retryBtn = root.querySelector('[data-action="retry"]');
  const viewfinder = root.querySelector('#viewfinder');
  const manual = root.querySelector('#manual');
  let scanner = null;
  let starting = false;
  let leaving = false;

  async function startCamera() {
    if (scanner || starting || leaving) return;
    starting = true;
    errBox.hidden = true;
    status.textContent = 'Kamera açılıyor…';
    viewfinder.classList.remove('live', 'failed');
    try {
      const s = await startScanner(video, {
        ignoreIsbn: justSaved,
        onAppQr: (route) => {
          scanner = null;
          navigator.vibrate?.(60);
          go(route);
        },
        onIsbn: (isbn) => {
          scanner = null;
          navigator.vibrate?.(60);
          go(`#/yeni?isbn=${isbn}`);
        },
      });
      if (leaving) { s.stop(); return; }
      scanner = s;
      viewfinder.classList.add('live');
      status.textContent = '';
    } catch (e) {
      const code = cameraErrorCode(e);
      viewfinder.classList.add('failed');
      status.textContent = 'Kamera kapalı';
      errText.textContent = CAMERA_HELP[code] ?? CAMERA_HELP.bilinmiyor;
      retryBtn.hidden = NO_RETRY.has(code);
      errBox.hidden = false;
      manual.open = true;
    } finally {
      starting = false;
    }
  }

  function stopCamera() {
    scanner?.stop();
    scanner = null;
  }

  // Uygulama arka plana geçince kamerayı kapat, geri gelince aç (pil ve gizlilik için).
  function onVisibility() {
    if (document.hidden) stopCamera();
    else startCamera();
  }
  document.addEventListener('visibilitychange', onVisibility);
  retryBtn.addEventListener('click', startCamera);

  // --- Elle giriş ---
  const form = root.querySelector('#isbn-form');
  const input = root.querySelector('#isbn');
  const err = root.querySelector('#isbn-error');

  input.addEventListener('input', () => {
    err.hidden = true;
    input.classList.remove('invalid');
    input.removeAttribute('aria-invalid');
  });
  const fail = (message) => {
    err.textContent = message;
    err.hidden = false;
    input.classList.add('invalid');
    input.setAttribute('aria-invalid', 'true');
    input.focus();
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = input.value;
    if (!normalizeIsbn(raw)) return fail('Önce ISBN numarasını yaz.');
    if (!isValidIsbn(raw)) return fail('Bu ISBN geçerli görünmüyor. Rakamları kontrol et (10 ya da 13 hane).');
    go(`#/yeni?isbn=${normalizeIsbn(raw)}`);
  });
  root.querySelector('[data-action="no-isbn"]').addEventListener('click', () => go('#/yeni'));

  startCamera();

  return () => {
    leaving = true;
    document.removeEventListener('visibilitychange', onVisibility);
    stopCamera();
  };
}
