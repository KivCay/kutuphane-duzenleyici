import { describe, it, expect } from 'vitest';
import { buildSheet } from '../src/modules/excelExport.js';

const books = [
  { number: 2, title: 'Puslu Kıtalar Atlası', author: 'İhsan Oktay Anar', others: '', publisher: 'İletişim', year: '1995', pages: '', isbn: '9789754700114', location: ['Çalışma odası', '2. dolap', '4. raf'], addedAt: '2026-11-25T10:00:00.000Z', labelPrinted: { cover: true, spine: false } },
  { number: 1, title: 'Suç ve Ceza', author: 'Fyodor Dostoyevski', others: 'Mehmet Özgül', publisher: '', year: '', pages: '687', isbn: '', location: null, addedAt: 'bozuk', labelPrinted: { cover: false, spine: false } },
];

describe('Excel tablosu', () => {
  const { rows, columns, filename } = buildSheet(books, new Date('2026-11-25T12:00:00Z'));
  const header = rows[0].map((c) => c.value);
  const col = (name) => header.indexOf(name);

  it('başlıklar ve yer derinliği kadar Yer sütunu', () => {
    expect(header).toEqual(['No', 'Kitap adı', 'Yazar', 'Çevirmen / diğer adlar', 'Yayınevi', 'Yıl', 'Sayfa', 'ISBN', 'Yer', 'Yer 1', 'Yer 2', 'Yer 3', 'Eklenme tarihi', 'Kapak etiketi basıldı', 'Sırt etiketi basıldı']);
    expect(columns).toHaveLength(header.length);
    expect(filename).toBe('kutuphane-2026-11-25.xlsx');
  });
  it('numara sırasıyla, numara etiketteki gibi 0001', () => {
    expect(rows[1][0].value).toBe('0001');
    expect(rows[2][0].value).toBe('0002');
  });
  it('ISBN metin, yıl/sayfa sayı; boşlar boş', () => {
    const r = rows[2];
    expect(r[col('ISBN')]).toMatchObject({ value: '9789754700114', type: String });
    expect(r[col('Yıl')]).toMatchObject({ value: 1995, type: Number });
    expect(r[col('Sayfa')].value).toBe('');
    expect(rows[1][col('Sayfa')]).toMatchObject({ value: 687, type: Number });
    expect(rows[1][col('Yıl')].value).toBe('');
  });
  it('yer birleşik ve ayrı sütunlarda; yeri olmayan boş', () => {
    const r = rows[2];
    expect(r[col('Yer')].value).toBe('Çalışma odası › 2. dolap › 4. raf');
    expect([r[col('Yer 1')].value, r[col('Yer 2')].value, r[col('Yer 3')].value]).toEqual(['Çalışma odası', '2. dolap', '4. raf']);
    expect(rows[1][col('Yer')].value).toBe('');
    expect(rows[1][col('Yer 1')].value).toBe('');
  });
  it('çevirmen, tarih ve etiket durumları', () => {
    expect(rows[1][col('Çevirmen / diğer adlar')].value).toBe('Mehmet Özgül');
    const d = rows[2][col('Eklenme tarihi')].value;
    expect(d).toBeInstanceOf(Date);
    const local = new Date('2026-11-25T10:00:00.000Z');
    expect([d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours()]).toEqual([local.getFullYear(), local.getMonth(), local.getDate(), 0]);
    expect(rows[1][col('Eklenme tarihi')].value).toBe(''); // bozuk tarih çökertmez
    expect(rows[2][col('Kapak etiketi basıldı')].value).toBe('Evet');
    expect(rows[2][col('Sırt etiketi basıldı')].value).toBe('Hayır');
  });
  it('boş kütüphane: yalnızca başlık', () => {
    const empty = buildSheet([]);
    expect(empty.rows).toHaveLength(1);
    expect(empty.rows[0].map((c) => c.value)).not.toContain('Yer 1');
  });
});
