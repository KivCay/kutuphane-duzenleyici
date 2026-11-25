import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { formatNumber, nextNumber, isValidIsbn, normalizeIsbn, addBook, findByIsbn, updateBook } from '../src/modules/books.js';
import { cleanLines, formatLocation, pushRecent } from '../src/modules/location.js';
import * as storage from '../src/modules/storage.js';

describe('numaralama', () => {
  it('4 haneli numara', () => {
    expect(formatNumber(6)).toBe('0006');
    expect(formatNumber(12345)).toBe('12345');
  });
  it('sıradaki numara en büyüğün bir fazlası, silinenler tekrar kullanılmaz', () => {
    expect(nextNumber([])).toBe(1);
    expect(nextNumber([{ number: 1 }, { number: 5 }])).toBe(6);
  });
});

describe('ISBN', () => {
  it('ISBN-13 kontrol hanesi', () => {
    expect(isValidIsbn('978-0-306-40615-7')).toBe(true);
    expect(isValidIsbn('9780306406158')).toBe(false);
  });
  it('ISBN-10, X dahil', () => {
    expect(isValidIsbn('0-306-40615-2')).toBe(true);
    expect(isValidIsbn('080442957X')).toBe(true);
    expect(isValidIsbn('0306406153')).toBe(false);
  });
  it('saçma girişler', () => {
    expect(isValidIsbn('')).toBe(false);
    expect(isValidIsbn('abc')).toBe(false);
    expect(isValidIsbn('12345')).toBe(false);
    expect(normalizeIsbn(' 978-0 306 ')).toBe('9780306');
  });
});

describe('yer', () => {
  it('boş satırları atar', () => {
    expect(cleanLines(['  Salon ', '', '  ', '2.  raf'])).toEqual(['Salon', '2. raf']);
    expect(cleanLines(['', ' '])).toBeNull();
    expect(cleanLines(null)).toBeNull();
  });
  it('birleştirir', () => {
    expect(formatLocation(['Çalışma odası', '2. dolap', '4. raf'])).toBe('Çalışma odası › 2. dolap › 4. raf');
    expect(formatLocation(null)).toBe('');
  });
  it('son yerler: başa ekler, tekrar etmez (büyük/küçük harf farkı önemsiz), en fazla 5', () => {
    let r = [];
    r = pushRecent(r, ['Salon']);
    r = pushRecent(r, ['Yatak odası']);
    r = pushRecent(r, ['salon']);
    expect(r.map(formatLocation)).toEqual(['salon', 'Yatak odası']);
    for (let i = 0; i < 10; i++) r = pushRecent(r, [`Oda ${i}`]);
    expect(r).toHaveLength(5);
    expect(pushRecent(r, ['', ''])).toBe(r);
  });
});

describe('kitap ekleme', () => {
  it('numara ve yer verir, metni temizler', () => {
    const { books, book } = addBook([], { title: '  Beyaz   Kale ', author: 'Orhan Pamuk', isbn: '978-0-306-40615-7' }, ['Salon', ''], new Date('2026-11-25T10:00:00Z'));
    expect(book.number).toBe(1);
    expect(book.title).toBe('Beyaz Kale');
    expect(book.isbn).toBe('9780306406157');
    expect(book.location).toEqual(['Salon']);
    expect(books).toHaveLength(1);
    const second = addBook(books, { title: 'X' }, null);
    expect(second.book.number).toBe(2);
    expect(second.book.location).toBeNull();
    expect(findByIsbn(second.books, '9780306406157')).toHaveLength(1);
  });
  it('güncelleme yalnızca o kitabı değiştirir', () => {
    const books = [{ number: 1, title: 'A' }, { number: 2, title: 'B' }];
    expect(updateBook(books, 2, { title: 'C' })).toEqual([{ number: 1, title: 'A' }, { number: 2, title: 'C' }]);
  });
});

describe('saklama', () => {
  it('kitapları ve yeri yazar, geri okur', async () => {
    expect(await storage.loadBooks()).toEqual([]);
    await storage.saveBooks([{ number: 1, title: 'A' }]);
    expect(await storage.loadBooks()).toEqual([{ number: 1, title: 'A' }]);
    await storage.saveActiveLocation(['Salon']);
    expect(await storage.loadActiveLocation()).toEqual(['Salon']);
    await storage.saveActiveLocation(null);
    expect(await storage.loadActiveLocation()).toBeNull();
  });
});
