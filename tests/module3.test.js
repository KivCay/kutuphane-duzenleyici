import { describe, it, expect } from 'vitest';
import { SHEETS, perPage, slotPosition, layoutLabels, pageCount, authorShort, PAGE } from '../src/modules/labelLayout.js';
import { encodeBook, decodeBook, coverUrl, spineUrl, spineCode, appRouteFromQr } from '../src/modules/qrPayload.js';

describe('etiket yerleşimi', () => {
  it('24\'lü kapak kâğıdı A4 içine sığar', () => {
    const s = SHEETS.kapak;
    expect(perPage(s)).toBe(24);
    const last = slotPosition(s, 23);
    expect(last.x + s.w).toBeCloseTo(210, 5);
    expect(last.y + s.h).toBeLessThanOrEqual(PAGE.h);
  });
  it('65\'li sırt kâğıdı ortalanmış ve A4 içinde', () => {
    const s = SHEETS.sirt;
    expect(perPage(s)).toBe(65);
    const last = slotPosition(s, 64);
    expect(last.x + s.w).toBeCloseTo(210 - s.left, 5);
    expect(last.y + s.h).toBeCloseTo(297 - s.top, 1);
  });
  it('ilk boş etiketten başlar, sayfalara böler', () => {
    const items = Array.from({ length: 30 }, (_, i) => i);
    const out = layoutLabels(SHEETS.kapak, items, 5);
    expect(out[0].index).toBe(4);
    expect(out[0].page).toBe(0);
    expect(out[20].page).toBe(1); // 4 + 20 = 24 -> ikinci sayfanın ilk etiketi
    expect(out[20].x).toBe(0);
    expect(pageCount(SHEETS.kapak, 30, 5)).toBe(2);
    expect(pageCount(SHEETS.kapak, 0, 1)).toBe(0);
    expect(layoutLabels(SHEETS.kapak, [1], 999)[0].index).toBe(23); // aşırı değer sınırlanır
    expect(layoutLabels(SHEETS.kapak, [1], 'abc')[0].index).toBe(0);
  });
  it('yazar kısaltması', () => {
    expect(authorShort('İhsan Oktay Anar')).toBe('İ.O. Anar');
    expect(authorShort('oğuz atay')).toBe('O. atay');
    expect(authorShort('ismet özel')).toBe('İ. özel'); // Türkçe büyük İ
    expect(authorShort('Homeros')).toBe('Homeros');
    expect(authorShort('')).toBe('');
  });
});

describe('QR içeriği', () => {
  const book = { number: 6, title: 'Puslu Kıtalar Atlası', subtitle: 'Bir roman', author: 'İhsan Oktay Anar', others: '', publisher: 'İletişim', year: '1995', pages: '', isbn: '9789754700114' };
  it('Türkçe harflerle gidip gelir, boş alan yazmaz', () => {
    const enc = encodeBook(book, 'Ayşe Yılmaz');
    expect(enc).toMatch(/^[A-Za-z0-9_-]+$/);
    const dec = decodeBook(enc);
    expect(dec).toMatchObject({ number: 6, title: 'Puslu Kıtalar Atlası', subtitle: 'Bir roman', author: 'İhsan Oktay Anar', owner: 'Ayşe Yılmaz', pages: '' });
  });
  it('uzun ad kısaltılır, QR makul boyda kalır', () => {
    const url = coverUrl('https://kutuphane-duzenleyici.vercel.app', { ...book, title: 'x'.repeat(500) }, 'Ayşe');
    expect(decodeBook(url.split('/k/')[1]).title.length).toBe(90);
    expect(url.length).toBeLessThan(400);
  });
  it('bozuk veri çökertmez', () => {
    expect(decodeBook('!!!')).toBeNull();
    expect(decodeBook('e30')).toBeNull(); // {}
  });
  it('kendi etiketlerimizi tanır, başka QR\'ları tanımaz', () => {
    const o = 'https://kutuphane-duzenleyici.vercel.app';
    expect(appRouteFromQr(spineUrl(o, 12), o)).toBe('#/n/12');
    expect(appRouteFromQr(coverUrl(o, book, ''), o)).toMatch(/^#\/k\//);
    expect(appRouteFromQr('https://evil.example/#/n/12', o)).toBeNull();
    expect(appRouteFromQr('WIFI:S:ev;', o)).toBeNull();
    expect(appRouteFromQr(spineCode(42), o)).toBe('#/n/42');
    expect(appRouteFromQr('KD:abc', o)).toBeNull();
  });
});
