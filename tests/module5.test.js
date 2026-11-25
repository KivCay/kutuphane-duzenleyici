import { describe, it, expect } from 'vitest';
import { addBook, nextNumber, deleteBook, undeleteBook, removeFromLibrary, restoreToLibrary, lendBook, returnBook, isActive, daysSince } from '../src/modules/books.js';
import { buildSheet } from '../src/modules/excelExport.js';

function lib(n) {
  let books = [];
  let last = 0;
  for (let i = 0; i < n; i++) {
    const r = addBook(books, { title: `K${i + 1}` }, null, new Date('2026-11-01T10:00:00Z'), last);
    books = r.books; last = r.book.number;
  }
  return { books, last };
}

describe('numara bir daha verilmez', () => {
  it('en sondaki kitap silinse bile numarası boş kalır', () => {
    const { books, last } = lib(3);
    const { books: after } = deleteBook(books, 3);
    expect(nextNumber(after)).toBe(3); // eski kural numarayı tekrar verirdi
    expect(nextNumber(after, last)).toBe(4); // yeni kural: vermez
    const r = addBook(after, { title: 'Yeni' }, null, new Date(), last);
    expect(r.book.number).toBe(4);
  });
  it('baştan başla: sayaç 0 olunca 0001', () => {
    expect(nextNumber([], 0)).toBe(1);
  });
});

describe('silme ve geri alma', () => {
  it('silinen kitap geri alınınca numara sırasına döner', () => {
    const { books } = lib(3);
    const { books: after, removed } = deleteBook(books, 2);
    expect(after.map((b) => b.number)).toEqual([1, 3]);
    expect(undeleteBook(after, removed).map((b) => b.number)).toEqual([1, 2, 3]);
    expect(undeleteBook(books, removed)).toBe(books); // zaten varsa iki kez eklenmez
  });
});

describe('kütüphaneden çıkarma', () => {
  it('nedenle çıkarır, geri koyar; ödünçteyse ödünç kapanır', () => {
    let { books } = lib(2);
    books = lendBook(books, 1, { to: 'Ali' }, new Date('2026-11-02T10:00:00Z'));
    books = removeFromLibrary(books, 1, { reason: 'Kayboldu', note: 'tatilde' }, new Date('2026-11-10T10:00:00Z'));
    const b = books[0];
    expect(isActive(b)).toBe(false);
    expect(b.removed).toMatchObject({ reason: 'Kayboldu', note: 'tatilde' });
    expect(b.loan).toBeNull();
    expect(b.loanHistory[0]).toMatchObject({ to: 'Ali', closedBy: 'cikarildi' });
    books = restoreToLibrary(books, 1);
    expect(isActive(books[0])).toBe(true);
    expect(books[0].removed).toBeNull();
  });
  it('neden boşsa Diğer', () => {
    const { books } = lib(1);
    expect(removeFromLibrary(books, 1, { reason: '  ' })[0].removed.reason).toBe('Diğer');
  });
});

describe('ödünç', () => {
  it('ver, geri al, geçmiş tutulur', () => {
    let { books } = lib(1);
    books = lendBook(books, 1, { to: '  Ayşe  Yılmaz ', note: '0555' }, new Date('2026-11-01T10:00:00Z'));
    expect(books[0].loan).toMatchObject({ to: 'Ayşe Yılmaz', note: '0555' });
    books = returnBook(books, 1, new Date('2026-11-20T10:00:00Z'));
    expect(books[0].loan).toBeNull();
    expect(books[0].loanHistory).toHaveLength(1);
    expect(books[0].loanHistory[0].returnedAt).toBe('2026-11-20T10:00:00.000Z');
    expect(returnBook(books, 1)).toEqual(books); // ödünçte değilken bir şey olmaz
  });
  it('kime boşsa reddedilir', () => {
    const { books } = lib(1);
    expect(() => lendBook(books, 1, { to: ' ' })).toThrow();
  });
  it('gün sayısı', () => {
    expect(daysSince('2026-11-01T10:00:00Z', new Date('2026-11-04T09:00:00Z'))).toBe(2);
    expect(daysSince('bozuk')).toBe(0);
  });
});

describe('Excel: ödünç sütunları ve çıkarılanlar sayfası', () => {
  it('çıkarılan ana sayfada değil, ikinci sayfada', () => {
    let { books } = lib(3);
    books = lendBook(books, 1, { to: 'Ali' });
    books = removeFromLibrary(books, 2, { reason: 'Satıldı' });
    const { rows, removedRows } = buildSheet(books);
    const header = rows[0].map((c) => c.value);
    expect(rows.slice(1).map((r) => r[0].value)).toEqual(['0001', '0003']);
    expect(rows[1][header.indexOf('Ödünçte')].value).toBe('Evet');
    expect(rows[1][header.indexOf('Kimde')].value).toBe('Ali');
    expect(rows[2][header.indexOf('Ödünçte')].value).toBe('Hayır');
    expect(removedRows).toHaveLength(2);
    expect(removedRows[1][0].value).toBe('0002');
    expect(removedRows[1][4].value).toBe('Satıldı');
  });
});
