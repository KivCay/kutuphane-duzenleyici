// Kameradan okunan barkodlar arasından kitap ISBN'ini seçer ve yanlış okumaya karşı teyit eder.
import { isValidIsbn, normalizeIsbn } from './books.js';

/** Kitap barkodu: 978 ya da 979 ile başlayan, kontrol hanesi doğru 13 haneli EAN. */
export function pickIsbn(rawValues) {
  for (const raw of rawValues ?? []) {
    const s = normalizeIsbn(raw);
    if (/^97[89]\d{10}$/.test(s) && isValidIsbn(s)) return s;
  }
  return null;
}

/**
 * Aynı ISBN'i kısa süre içinde art arda `needed` kez görünce kabul eder.
 * Tek bir bulanık karede yanlış okunan bir rakamın kitabı yanlış kaydetmesini önler.
 */
export function createConfirmer({ needed = 2, windowMs = 1500 } = {}) {
  let last = null;
  let count = 0;
  let lastAt = 0;
  return function seen(isbn, now = Date.now()) {
    if (!isbn) return null;
    if (isbn === last && now - lastAt <= windowMs) count += 1;
    else { last = isbn; count = 1; }
    lastAt = now;
    return count >= needed ? isbn : null;
  };
}
