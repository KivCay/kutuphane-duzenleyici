// Giriş noktası: veriyi yükler, adres çubuğundaki #/... kısmına göre ekranı gösterir.
import './styles.css';
import { init } from './state.js';
import * as libraryScreen from './screens/library.js';
import * as locationScreen from './screens/location.js';
import * as scannerScreen from './screens/scanner.js';
import * as bookScreen from './screens/bookcard.js';
import * as labelsScreen from './screens/labels.js';
import * as qrScreen from './screens/qrpage.js';
import * as coverScreen from './screens/cover.js';
import * as statsScreen from './screens/stats.js';

const routes = [
  { pattern: /^\/kapak$/, screen: coverScreen },
  { pattern: /^\/ozet$/, screen: statsScreen },
  { pattern: /^\/$/, screen: libraryScreen },
  { pattern: /^\/yer$/, screen: locationScreen },
  { pattern: /^\/okut$/, screen: scannerScreen },
  { pattern: /^\/yeni$/, screen: bookScreen },
  { pattern: /^\/kitap\/(\d+)$/, screen: bookScreen, keys: ['number'] },
  { pattern: /^\/etiketler$/, screen: labelsScreen },
  { pattern: /^\/k\/([A-Za-z0-9_-]+)$/, screen: qrScreen, keys: ['data'], fixed: { kind: 'k' } },
  { pattern: /^\/n\/(\d+)$/, screen: qrScreen, keys: ['number'], fixed: { kind: 'n' } },
];

const root = document.getElementById('app');

function go(hash) {
  if (window.location.hash === hash) route();
  else window.location.hash = hash;
}

let cleanup = null; // önceki ekranın kapanış işi (ör. kamerayı kapatmak)

function route() {
  try { cleanup?.(); } catch (e) { console.error(e); }
  cleanup = null;
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  const query = new URLSearchParams(qs);

  for (const r of routes) {
    const m = path.match(r.pattern);
    if (!m) continue;
    const params = { ...(r.fixed ?? {}) };
    (r.keys ?? []).forEach((k, i) => { params[k] = k === 'number' ? Number(m[i + 1]) : m[i + 1]; });
    const ctx = { params, query, go };
    root.innerHTML = r.screen.render(ctx);
    const result = r.screen.mount(root, ctx);
    if (typeof result === 'function') cleanup = result;
    window.scrollTo(0, 0);
    return;
  }
  window.location.replace('#/'); // bilinmeyen adres: ana ekrana
}

async function start() {
  try {
    await init();
  } catch (e) {
    console.error(e);
    root.innerHTML = '<div class="pad"><p class="error">Veriler yüklenemedi. Tarayıcının gizli (incognito) modundaysan normal pencerede aç.</p></div>';
    return;
  }
  // Uygulama açılışında (adres boşken ya da ana sayfadayken) önce kapak sayfası.
  // QR etiketinden gelen adresler (#/k/…, #/n/…) kapağı atlar.
  const h = window.location.hash;
  if ((h === '' || h === '#' || h === '#/') && !coverScreen.coverSeen()) {
    window.location.replace('#/kapak');
  }
  window.addEventListener('hashchange', route);
  route();
}

start();
