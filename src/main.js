// Giriş noktası: veriyi yükler, adres çubuğundaki #/... kısmına göre ekranı gösterir.
import './styles.css';
import { init } from './state.js';
import * as libraryScreen from './screens/library.js';
import * as locationScreen from './screens/location.js';
import * as scannerScreen from './screens/scanner.js';
import * as bookScreen from './screens/bookcard.js';
import * as labelsScreen from './screens/labels.js';

const routes = [
  { pattern: /^\/$/, screen: libraryScreen },
  { pattern: /^\/yer$/, screen: locationScreen },
  { pattern: /^\/okut$/, screen: scannerScreen },
  { pattern: /^\/yeni$/, screen: bookScreen },
  { pattern: /^\/kitap\/(\d+)$/, screen: bookScreen, keys: ['number'] },
  { pattern: /^\/etiketler$/, screen: labelsScreen },
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
    const params = {};
    (r.keys ?? []).forEach((k, i) => { params[k] = Number(m[i + 1]); });
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
  window.addEventListener('hashchange', route);
  route();
}

start();
