// Etiketlerdeki QR kodların içeriği.
//  - Kapak QR'ı: kitabın bilgilerini adresin # kısmında taşır (#/k/...). Bu kısım internete
//    gönderilmez; sayfa bilgiyi doğrudan QR'dan okur. Böylece hesap ya da sunucu gerekmez.
//  - Sırt QR'ı: yalnızca "KD:6" yazar; en küçük QR boyunda kalsın diye adres içermez.
//    Bu yüzden yalnızca bu uygulamanın "Kitap okut" ekranı anlamlandırır.

const MAX_TEXT = 90; // çok uzun adlar QR'ı gereksiz büyütmesin

function cut(v) {
  const s = String(v ?? '').trim();
  return s.length > MAX_TEXT ? s.slice(0, MAX_TEXT - 1) + '…' : s;
}

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Kapak QR'ına konacak kısa veri. Boş alanlar hiç yazılmaz. */
export function encodeBook(book, owner = '') {
  const d = { v: 1, n: book.number };
  const map = { t: book.title, a: book.author, c: book.others, p: book.publisher, y: book.year, s: book.pages, i: book.isbn, w: owner };
  for (const [k, v] of Object.entries(map)) { const c = cut(v); if (c) d[k] = c; }
  return toBase64Url(JSON.stringify(d));
}

export function decodeBook(encoded) {
  try {
    const d = JSON.parse(fromBase64Url(String(encoded)));
    if (!d || typeof d.n !== 'number') return null;
    return {
      number: d.n, title: d.t ?? '', author: d.a ?? '', others: d.c ?? '', publisher: d.p ?? '',
      year: d.y ?? '', pages: d.s ?? '', isbn: d.i ?? '', owner: d.w ?? '',
    };
  } catch {
    return null;
  }
}

export function coverUrl(origin, book, owner) {
  return `${origin}/#/k/${encodeBook(book, owner)}`;
}

export function spineUrl(origin, number) {
  return `${origin}/#/n/${number}`;
}

export function spineCode(number) {
  return `KD:${number}`;
}

/** Kameranın okuduğu bir QR bizim etiketimiz mi? Öyleyse uygulama içi adresini döner. */
export function appRouteFromQr(text, origin) {
  const s = String(text ?? '').trim();
  const short = s.match(/^KD:(\d{1,6})$/);
  if (short) return `#/n/${Number(short[1])}`;
  if (!s.startsWith(origin + '/')) return null;
  const m = s.match(/#\/(n\/\d+|k\/[A-Za-z0-9_-]+)$/);
  return m ? `#/${m[1]}` : null;
}
