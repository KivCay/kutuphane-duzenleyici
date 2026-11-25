// Kitap kayıtları: numaralama, ekleme, güncelleme. Saklama işini storage.js'e bırakır.
import { cleanLines } from './location.js';

export const NUMBER_WIDTH = 4;

export function formatNumber(n) {
  return String(n).padStart(NUMBER_WIDTH, '0');
}

/**
 * Sıradaki numara. Bir kez verilen numara bir daha verilmez: silinen kitabın numarası boş kalır.
 * lastIssued = şimdiye kadar verilmiş en büyük numara (telefonda ayrıca saklanır; yalnızca
 * "Baştan başla" sıfırlar).
 */
export function nextNumber(books, lastIssued = 0) {
  const max = (books ?? []).reduce((m, b) => Math.max(m, Number(b.number) || 0), 0);
  return Math.max(max, Number(lastIssued) || 0) + 1;
}

export const REMOVE_REASONS = ['Satıldı', 'Kayboldu', 'Hediye edildi', 'Bağışlandı', 'Diğer'];

/** Kütüphanede duran (çıkarılmamış) kitap mı? */
export function isActive(book) {
  return book?.status !== 'removed';
}

/** İki tarih arasındaki tam gün sayısı. */
export function daysSince(iso, now = new Date()) {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : Math.max(0, Math.floor((now.getTime() - t) / 86_400_000));
}

/** Kalıcı silme (deneme kayıtları için). Numara boş kalır. Geri almak için silinen kitap döner. */
export function deleteBook(books, number) {
  const removed = (books ?? []).find((b) => b.number === number) ?? null;
  return { books: (books ?? []).filter((b) => b.number !== number), removed };
}

/** Silinen kitabı eski yerine (numara sırasına) geri koyar. */
export function undeleteBook(books, book) {
  if (!book || (books ?? []).some((b) => b.number === book.number)) return books;
  return [...books, book].sort((a, b) => a.number - b.number);
}

/** Kütüphaneden çıkarma (satıldı, kayboldu…): kayıt ve numara kalır, listeden ayrılır. */
export function removeFromLibrary(books, number, { reason, note = '' }, now = new Date()) {
  return (books ?? []).map((b) => {
    if (b.number !== number) return b;
    const out = { ...b, status: 'removed', removed: { reason: cleanText(reason) || 'Diğer', note: cleanText(note), date: now.toISOString() } };
    if (b.loan) { // ödünçteyken çıkarıldıysa ödünç kapanır, geçmişe yazılır
      out.loanHistory = [...(b.loanHistory ?? []), { ...b.loan, returnedAt: now.toISOString(), closedBy: 'cikarildi' }];
      out.loan = null;
    }
    return out;
  });
}

/** Çıkarılan kitabı kütüphaneye geri koyar. */
export function restoreToLibrary(books, number) {
  return (books ?? []).map((b) => (b.number === number ? { ...b, status: 'active', removed: null } : b));
}

/** Ödünç ver: kime (zorunlu), not (isteğe bağlı), tarih. */
export function lendBook(books, number, { to, note = '' }, now = new Date()) {
  const who = cleanText(to);
  if (!who) throw new Error('kime-bos');
  return (books ?? []).map((b) => (b.number === number ? { ...b, loan: { to: who, note: cleanText(note), date: now.toISOString() } } : b));
}

/** Ödünçten geri geldi: ödünç kaydı geçmişe yazılır. */
export function returnBook(books, number, now = new Date()) {
  return (books ?? []).map((b) => {
    if (b.number !== number || !b.loan) return b;
    return { ...b, loan: null, loanHistory: [...(b.loanHistory ?? []), { ...b.loan, returnedAt: now.toISOString() }] };
  });
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
export function addBook(books, fields, location, now = new Date(), lastIssued = 0) {
  const number = nextNumber(books, lastIssued);
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
    status: 'active',
    loan: null,
  };
  return { books: [...(books ?? []), book], book };
}

export function updateBook(books, number, patch) {
  return (books ?? []).map((b) => (b.number === number ? { ...b, ...patch } : b));
}

export function getBook(books, number) {
  return (books ?? []).find((b) => b.number === Number(number)) ?? null;
}
