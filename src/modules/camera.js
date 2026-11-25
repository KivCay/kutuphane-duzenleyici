// Telefon kamerasını açar ve görüntüde kitap barkodu arar.
// Tarayıcının kendi barkod okuyucusu varsa onu, yoksa (ör. iPhone) uygulamayla gelen okuyucuyu kullanır.
import { pickIsbn, createConfirmer } from './isbnScan.js';
import { appRouteFromQr } from './qrPayload.js';

const FORMATS = ['ean_13', 'qr_code']; // kitap barkodu + kendi etiketlerimiz
const SCAN_EVERY_MS = 120;

let detectorPromise = null;

async function getDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      if ('BarcodeDetector' in window) {
        try {
          const supported = await window.BarcodeDetector.getSupportedFormats();
          if (supported.includes('ean_13')) {
            return new window.BarcodeDetector({ formats: FORMATS.filter((f) => supported.includes(f)) });
          }
        } catch { /* yedeğe geç */ }
      }
      // Yedek okuyucu: okuyucu dosyasını (WASM) kendi sitemizden yükler, dış bir CDN'e bağımlı değil.
      const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
        import('barcode-detector/ponyfill'),
        import('zxing-wasm/reader/zxing_reader.wasm?url'),
      ]);
      prepareZXingModule({
        overrides: { locateFile: (path, prefix) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) },
      });
      return new BarcodeDetector({ formats: FORMATS });
    })().catch((e) => { detectorPromise = null; throw e; });
  }
  return detectorPromise;
}

/** Kamera hatalarını kullanıcıya gösterilecek sade bir koda çevirir. */
export function cameraErrorCode(err) {
  if (!window.isSecureContext) return 'guvenli-degil';
  if (!navigator.mediaDevices?.getUserMedia) return 'desteklenmiyor';
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'izin-yok';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'kamera-yok';
    case 'NotReadableError':
    case 'AbortError':
      return 'mesgul';
    default:
      return 'bilinmiyor';
  }
}

/**
 * Kamerayı <video> içinde başlatır; teyit edilmiş bir ISBN bulununca onIsbn(isbn) çağrılır.
 * Dönen nesnenin stop() metodu kamerayı kapatır (ekrandan çıkınca mutlaka çağrılmalı).
 */
export async function startScanner(video, { onIsbn, onAppQr, ignoreIsbn = null, ignoreMs = 3000 }) {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    const e = new Error('camera unavailable'); e.name = 'Unsupported'; throw e;
  }
  const [stream, detector] = await Promise.all([
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    }),
    getDetector(),
  ]);

  let stopped = false;
  let timer = null;
  const confirm = createConfirmer();
  const ignoreUntil = Date.now() + ignoreMs; // az önce kaydedilen kitap hâlâ kameranın önündeyse tekrar okuma

  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  video.muted = true;
  await video.play().catch(() => {});

  async function tick() {
    if (stopped) return;
    try {
      if (video.readyState >= 2) {
        const codes = await detector.detect(video);
        const raws = codes.map((c) => c.rawValue);
        const route = onAppQr && raws.map((r) => appRouteFromQr(r, window.location.origin)).find(Boolean);
        if (route && !stopped) { // kendi etiketimiz: QR'ın hata düzeltmesi var, teyide gerek yok
          stop();
          onAppQr(route);
          return;
        }
        let found = pickIsbn(raws);
        if (found && found === ignoreIsbn && Date.now() < ignoreUntil) found = null;
        const isbn = confirm(found);
        if (isbn && !stopped) {
          stop();
          onIsbn(isbn);
          return;
        }
      }
    } catch { /* tek karelik hata: devam */ }
    timer = setTimeout(tick, SCAN_EVERY_MS);
  }

  function stop() {
    stopped = true;
    clearTimeout(timer);
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  }

  tick();
  return { stop };
}
