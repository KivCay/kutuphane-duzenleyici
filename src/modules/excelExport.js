// Kütüphaneyi Excel (.xlsx) dosyasına aktarır. Bir satır = bir kitap.
// Yer bilgisi hem tek sütunda ("Çalışma odası › 2. dolap") hem de satır satır ayrı sütunlarda
// (Yer 1, Yer 2…) yazılır; Excel'de odaya ya da rafa göre süzmek kolay olsun diye.
import { formatNumber, isActive } from './books.js';
import { formatLocation } from './location.js';

function asNumber(v) {
  const n = Number(String(v ?? '').trim());
  return String(v ?? '').trim() && Number.isFinite(n) ? n : null;
}

// Excel saati UTC sayar; telefonun yerel gününü koru (gece yarısından sonraki kayıt önceki güne kaymasın).
function localDate(iso) {
  const t = iso ? new Date(iso) : null;
  if (!t || Number.isNaN(t.getTime())) return { value: '', type: String };
  return { value: new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())), type: Date, format: 'dd.mm.yyyy' };
}

const HEADER_STYLE = { fontWeight: 'bold', backgroundColor: '#E6ECF7', color: '#0F2557', borderColor: '#B9C6E3', borderStyle: 'thin' };

/** Saf fonksiyon: kitaplardan tablo verisi ve sütun genişlikleri üretir (test edilebilir). */
export function buildSheet(books, now = new Date()) {
  const sorted = (books ?? []).filter(isActive).sort((a, b) => a.number - b.number);
  const depth = sorted.reduce((m, b) => Math.max(m, b.location?.length ?? 0), 0);
  const locCols = Array.from({ length: depth }, (_, i) => `Yer ${i + 1}`);

  const headers = ['No', 'Kitap adı', 'Alt başlık', 'Yazar', 'Çevirmen / diğer adlar', 'Yayınevi', 'Yıl', 'Sayfa', 'Tür', 'Dil', 'ISBN', 'Yer', ...locCols, 'Eklenme tarihi', 'Ödünçte', 'Kimde', 'Ödünç tarihi', 'Kapak etiketi basıldı', 'Sırt etiketi basıldı'];
  const widths = [8, 32, 30, 24, 24, 20, 7, 7, 16, 12, 16, 34, ...locCols.map(() => 16), 14, 10, 20, 14, 12, 12];

  const rows = [headers.map((h) => ({ value: h, ...HEADER_STYLE }))];
  for (const b of sorted) {
    rows.push([
      { value: formatNumber(b.number), type: String, align: 'center' }, // "0006": etiketteki gibi
      { value: b.title || '', type: String },
      { value: b.subtitle || '', type: String },
      { value: b.author || '', type: String },
      { value: b.others || '', type: String },
      { value: b.publisher || '', type: String },
      asNumber(b.year) !== null ? { value: asNumber(b.year), type: Number } : { value: b.year || '', type: String },
      asNumber(b.pages) !== null ? { value: asNumber(b.pages), type: Number } : { value: '', type: String },
      { value: b.genre || '', type: String },
      { value: b.language || '', type: String },
      { value: b.isbn || '', type: String }, // metin: Excel uzun numarayı bozmasın (9,79E+12 olmasın)
      { value: formatLocation(b.location), type: String },
      ...locCols.map((_, i) => ({ value: b.location?.[i] ?? '', type: String })),
      localDate(b.addedAt),
      { value: b.loan ? 'Evet' : 'Hayır', type: String },
      { value: b.loan?.to ?? '', type: String },
      localDate(b.loan?.date),
      { value: b.labelPrinted?.cover ? 'Evet' : 'Hayır', type: String },
      { value: b.labelPrinted?.spine ? 'Evet' : 'Hayır', type: String },
    ]);
  }
  // İkinci sayfa: kütüphaneden çıkarılanlar
  const gone = (books ?? []).filter((b) => !isActive(b)).sort((a, b) => a.number - b.number);
  const removedHeaders = ['No', 'Kitap adı', 'Yazar', 'ISBN', 'Neden', 'Not', 'Çıkarılma tarihi'];
  const removedRows = [removedHeaders.map((h) => ({ value: h, ...HEADER_STYLE }))];
  for (const b of gone) {
    removedRows.push([
      { value: formatNumber(b.number), type: String, align: 'center' },
      { value: b.title || '', type: String },
      { value: b.author || '', type: String },
      { value: b.isbn || '', type: String },
      { value: b.removed?.reason || '', type: String },
      { value: b.removed?.note || '', type: String },
      localDate(b.removed?.date),
    ]);
  }
  const date = now.toISOString().slice(0, 10);
  return {
    rows, columns: widths.map((width) => ({ width })), filename: `kutuphane-${date}.xlsx`,
    removedRows, removedColumns: [8, 32, 24, 16, 16, 30, 16].map((width) => ({ width })),
  };
}

/** .xlsx dosyasını oluşturur (kütüphane yalnızca gerektiğinde yüklenir). */
export async function buildExcel(books) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const { rows, columns, filename, removedRows, removedColumns } = buildSheet(books);
  const sheets = [{ data: rows, sheet: 'Kütüphanem', columns, stickyRowsCount: 1 }];
  if (removedRows.length > 1) sheets.push({ data: removedRows, sheet: 'Çıkarılanlar', columns: removedColumns, stickyRowsCount: 1 });
  const blob = await writeXlsxFile(sheets, { fontFamily: 'Calibri', fontSize: 11 }).toBlob();
  return { blob, filename };
}
