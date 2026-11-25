import { describe, it, expect, vi } from 'vitest';
import { pickIsbn, createConfirmer } from '../src/modules/isbnScan.js';
import { fromGoogle, fromOpenLibrary, mergeSources } from '../src/modules/bookInfo.js';
import { lookupIsbn } from '../src/modules/lookup.js';
import handler from '../api/kitap.js';

describe('barkoddan ISBN seçme', () => {
  it('yalnızca 978/979 ile başlayan geçerli EAN-13', () => {
    expect(pickIsbn(['9780306406157'])).toBe('9780306406157');
    expect(pickIsbn(['8690000000002', '9780306406157'])).toBe('9780306406157'); // market barkodu atlanır
    expect(pickIsbn(['9780306406158'])).toBeNull(); // kontrol hanesi yanlış
    expect(pickIsbn(['52499'])).toBeNull(); // fiyat eki
    expect(pickIsbn([])).toBeNull();
  });
  it('aynı ISBN iki kez görülünce kabul eder', () => {
    const seen = createConfirmer();
    expect(seen('9780306406157', 0)).toBeNull();
    expect(seen('9780306406157', 100)).toBe('9780306406157');
  });
  it('farklı okuma ya da uzun ara teyidi sıfırlar', () => {
    const seen = createConfirmer();
    seen('9780306406157', 0);
    expect(seen('9789754700114', 100)).toBeNull();
    expect(seen('9789754700114', 5000)).toBeNull();
    expect(seen(null, 5100)).toBeNull();
  });
});

const GOOGLE = { totalItems: 1, items: [{ volumeInfo: { title: 'Tutunamayanlar', authors: ['Oğuz Atay'], publisher: 'İletişim Yayınları', publishedDate: '2021-03', pageCount: 724, industryIdentifiers: [{ type: 'ISBN_13', identifier: '9789754700114' }] } }] };
const OL = { 'ISBN:9789754700114': { title: 'Tutunamayanlar', authors: [{ name: 'Oguz Atay' }], publishers: [{ name: 'Iletişim' }], publish_date: '1992', number_of_pages: 736 } };

describe('kaynakları birleştirme', () => {
  it('çevirmen yazardan ayrılır: ilk ad yazar, kalanlar diğer adlar', () => {
    const g = { items: [{ volumeInfo: { title: 'Suç ve Ceza', authors: ['Fyodor Dostoyevski', 'Mehmet Özgül'], industryIdentifiers: [{ identifier: '9786053609421' }] } }] };
    const r = fromGoogle(g, '9786053609421');
    expect(r.author).toBe('Fyodor Dostoyevski');
    expect(r.others).toBe('Mehmet Özgül');
    const ol = fromOpenLibrary({ 'ISBN:1': { title: 'T', authors: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] } }, '1');
    expect([ol.author, ol.others]).toEqual(['A', 'B, C']);
  });
  it('Google biçimini okur', () => {
    expect(fromGoogle(GOOGLE, '9789754700114')).toEqual({ title: 'Tutunamayanlar', author: 'Oğuz Atay', others: '', publisher: 'İletişim Yayınları', year: '2021', pages: '724' });
  });
  it('Google başka bir kitabı döndürürse almaz', () => {
    const other = { items: [GOOGLE.items[0], { volumeInfo: { title: 'X', industryIdentifiers: [{ identifier: '111' }] } }] };
    expect(fromGoogle({ items: [{ volumeInfo: { title: 'X', industryIdentifiers: [{ identifier: '111' }] } }, { volumeInfo: { title: 'Y' } }] }, '9789754700114')).toBeNull();
    expect(fromGoogle(other, '9789754700114').title).toBe('Tutunamayanlar');
    expect(fromGoogle({}, '9789754700114')).toBeNull();
  });
  it('Open Library biçimini okur, birleşik harfleri düzeltir', () => {
    const r = fromOpenLibrary(OL, '9789754700114');
    expect(r.publisher).toBe('Iletişim');
    expect(r.year).toBe('1992');
    expect(r.pages).toBe('736');
  });
  it('önce Google, eksikleri Open Library tamamlar', () => {
    const m = mergeSources([
      { name: 'Google Books', data: { title: 'A', author: 'B', others: '', publisher: '', year: '', pages: '' } },
      { name: 'Open Library', data: { title: 'A2', author: 'B2', others: 'Z', publisher: 'P', year: '1990', pages: '100' } },
    ]);
    expect(m).toEqual({ found: true, fields: { title: 'A', author: 'B', others: '', publisher: 'P', year: '1990', pages: '100' }, sources: ['Google Books', 'Open Library'] });
  });
  it('hiçbir kaynak bulamazsa found=false', () => {
    expect(mergeSources([{ name: 'X', data: null }]).found).toBe(false);
  });
});

function fakeRes() {
  const r = { code: 200, headers: {}, body: null };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  return r;
}

describe('sunucu fonksiyonu /api/kitap', () => {
  it('geçersiz ISBN için 400', async () => {
    const res = fakeRes();
    await handler({ query: { isbn: '123' } }, res);
    expect(res.code).toBe(400);
  });
  it('anahtar yoksa yalnızca Open Library', async () => {
    delete process.env.GOOGLE_BOOKS_API_KEY;
    const calls = [];
    vi.stubGlobal('fetch', async (url) => { calls.push(url); return { ok: true, json: async () => OL }; });
    const res = fakeRes();
    await handler({ query: { isbn: '978-975-470-011-4' } }, res);
    vi.unstubAllGlobals();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('openlibrary.org');
    expect(res.body.found).toBe(true);
    expect(res.body.sources).toEqual(['Open Library']);
  });
  it('anahtar varsa ikisine de sorar, Google önceliklidir; bir kaynak çökerse diğeriyle devam', async () => {
    process.env.GOOGLE_BOOKS_API_KEY = 'test-key';
    vi.stubGlobal('fetch', async (url) => {
      if (url.includes('googleapis')) { expect(url).toContain('key=test-key'); return { ok: true, json: async () => GOOGLE }; }
      throw new Error('network');
    });
    const res = fakeRes();
    await handler({ query: { isbn: '9789754700114' } }, res);
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_BOOKS_API_KEY;
    expect(res.body.fields.author).toBe('Oğuz Atay');
    expect(res.body.sources).toEqual(['Google Books']);
    expect(JSON.stringify(res.body)).not.toContain('test-key'); // anahtar telefona sızmaz
  });
});

describe('telefondan arama', () => {
  it('bulundu / bulunamadı / sunucu hatası / ağ yok', async () => {
    const ok = await lookupIsbn('1', { fetchImpl: async () => ({ ok: true, json: async () => ({ found: true, fields: { title: 'A' }, sources: ['X'] }) }) });
    expect(ok.status).toBe('bulundu');
    const miss = await lookupIsbn('1', { fetchImpl: async () => ({ ok: true, json: async () => ({ found: false }) }) });
    expect(miss.status).toBe('bulunamadi');
    const bad = await lookupIsbn('1', { fetchImpl: async () => ({ ok: false }) });
    expect(bad.status).toBe('hata');
    const off = await lookupIsbn('1', { fetchImpl: async () => { throw new TypeError('Failed to fetch'); } });
    expect(off.status).toBe('cevrimdisi');
  });
});
