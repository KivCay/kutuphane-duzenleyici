// Vercel sunucu fonksiyonu: /api/kitap?isbn=978...
// Google Books anahtarı yalnızca sunucuda durur (Vercel ortam değişkeni GOOGLE_BOOKS_API_KEY),
// telefona hiç gönderilmez. Anahtar yoksa yalnızca Open Library'ye bakılır.
import { fromGoogle, fromOpenLibrary, mergeSources } from '../src/modules/bookInfo.js';
import { isValidIsbn, normalizeIsbn } from '../src/modules/books.js';

const TIMEOUT_MS = 6000;

async function getJson(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': 'KutuphaneDuzenleyici/1.0 (kutuphane-duzenleyici.vercel.app)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function google(isbn) {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (!key) return { name: 'Google Books', data: null, skipped: 'anahtar-yok' };
  try {
    const json = await getJson(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${encodeURIComponent(key)}`);
    return { name: 'Google Books', data: fromGoogle(json, isbn) };
  } catch (e) {
    return { name: 'Google Books', data: null, error: String(e.message || e) };
  }
}

async function openLibrary(isbn) {
  try {
    const json = await getJson(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    return { name: 'Open Library', data: fromOpenLibrary(json, isbn) };
  } catch (e) {
    return { name: 'Open Library', data: null, error: String(e.message || e) };
  }
}

export default async function handler(req, res) {
  const isbn = normalizeIsbn(req.query?.isbn);
  if (!isValidIsbn(isbn)) {
    res.status(400).json({ error: 'gecersiz-isbn' });
    return;
  }
  // Sıra önemli: Türkçe adlar Google'da genellikle doğru harflerle (ş, ğ, İ) gelir.
  const results = await Promise.all([google(isbn), openLibrary(isbn)]);
  const merged = mergeSources(results);
  const diagnostics = results.map(({ name, data, error, skipped }) => ({ name, found: Boolean(data), error, skipped }));

  // Bulunan sonuçlar bir gün önbellekte tutulur; bulunamayanlar kısa süre (sonradan eklenebilir).
  res.setHeader('Cache-Control', merged.found ? 's-maxage=86400, stale-while-revalidate=604800' : 's-maxage=600');
  res.status(200).json({ isbn, ...merged, diagnostics });
}
