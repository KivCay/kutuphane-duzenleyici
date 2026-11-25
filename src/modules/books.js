// Kitap kayıtları: numaralama, ekleme, güncelleme. Saklama işini storage.js'e bırakır.
import { cleanLines } from './location.js';

export const NUMBER_WIDTH = 4;

export function formatNumber(n) {
  return String(n).padStart(NUMBER_WIDTH, '0');
}

/** Sıradaki numara: şimdiye kadarki en büyük numaranın bir fazlası (silinen numaralar tekrar kullanılmaz). */
export function nextNumber(books) {
  const max = (books ?? []).reduce((m, b) => Math.max(m, Number(b.number) || 0), 0);
  return max + 1;
}

/** ISBN'den rakam ve X dışındaki her şeyi atar. */
export function normalizeIsbn(raw) {
  return String(raw ?? '').toUpperCase().replace(/[^0-9X]/g, '');
}

/** ISBN-10 ya da ISBN-13 kontrol hanesi doğru mu? */
export function isValidIsbn(raw) {
  const s = normalizeIsbn(raw);
  if (/^\d{13}$/.test(s)) {
    const sum = [...s.slice(0, 12)].reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10 === Number(s[12]);
  }
  if (/^\d{9}[\dX]$/.test(s)) {
    const sum = [...s].reduce((acc, d, i) => acc + (d === 'X' ? 10 : Number(d)) * (10 - i), 0);
    return sum % 11 === 0;
  }
  return false;
}

/** Aynı ISBN'li kitap zaten var mı? (Aynı kitaptan iki kopya olabilir; sadece uyarmak için.) */
export function findByIsbn(books, isbn) {
  const s = normalizeIsbn(isbn);
  if (!s) return [];
  return (books ?? []).filter((b) => normalizeIsbn(b.isbn) === s);
}

function cleanText(v) {
  return String(v ?? '').replace(/\s+/g, ' ').trim();
}

/** Yeni kitap kaydı oluşturur ve listeye ekler. Yeni listeyi ve eklenen kitabı döner. */
export function addBook(books, fields, location, now = new Date()) {
  const number = nextNumber(books);
  const book = {
    number,
    isbn: normalizeIsbn(fields.isbn),
    title: cleanText(fields.title),
    subtitle: cleanText(fields.subtitle),
    author: cleanText(fields.author),
    others: cleanText(fields.others),
    publisher: cleanText(fields.publisher),
    year: cleanText(fields.year),
    pages: cleanText(fields.pages),
    genre: cleanText(fields.genre),
    language: cleanText(fields.language),
    location: cleanLines(location),
    addedAt: now.toISOString(),
    labelPrinted: { cover: false, spine: false },
  };
  return { books: [...(books ?? []), book], book };
}

export function updateBook(books, number, patch) {
  return (books ?? []).map((b) => (b.number === number ? { ...b, ...patch } : b));
}

export function getBook(books, number) {
  return (books ?? []).find((b) => b.number === Number(number)) ?? null;
}
