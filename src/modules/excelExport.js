// Kütüphaneyi Excel (.xlsx) dosyasına aktarır. Bir satır = bir kitap.
// Yer bilgisi hem tek sütunda ("Çalışma odası › 2. dolap") hem de satır satır ayrı sütunlarda
// (Yer 1, Yer 2…) yazılır; Excel'de odaya ya da rafa göre süzmek kolay olsun diye.
import { formatNumber } from './books.js';
import { formatLocation } from './location.js';

function asNumber(v) {
  const n = Number(String(v ?? '').trim());
  return String(v ?? '').trim() && Number.isFinite(n) ? n : null;
}

const HEADER_STYLE = { fontWeight: 'bold', backgroundColor: '#E3EEE9', color: '#143D30', borderColor: '#B8CFC5', borderStyle: 'thin' };

/** Saf fonksiyon: kitaplardan tablo verisi ve sütun genişlikleri üretir (test edilebilir). */
export function buildSheet(books, now = new Date()) {
  const sorted = [...(books ?? [])].sort((a, b) => a.number - b.number);
  const depth = sorted.reduce((m, b) => Math.max(m, b.location?.length ?? 0), 0);
  const locCols = Array.from({ length: depth }, (_, i) => `Yer ${i + 1}`);

  const headers = ['No', 'Kitap adı', 'Yazar', 'Çevirmen / diğer adlar', 'Yayınevi', 'Yıl', 'Sayfa', 'ISBN', 'Yer', ...locCols, 'Eklenme tarihi', 'Kapak etiketi basıldı', 'Sırt etiketi basıldı'];
  const widths = [8, 36, 24, 24, 20, 7, 7, 16, 34, ...locCols.map(() => 16), 14, 12, 12];

  const rows = [headers.map((h) => ({ value: h, ...HEADER_STYLE }))];
  for (const b of sorted) {
    const t = b.addedAt ? new Date(b.addedAt) : null;
    // Excel saati UTC sayar; telefonun yerel tarihini koru (gece yarısından sonra eklenen kitap önceki güne kaymasın).
    const added = t && !Number.isNaN(t.getTime()) ? new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())) : null;
    rows.push([
      { value: formatNumber(b.number), type: String, align: 'center' }, // "0006": etiketteki gibi
      { value: b.title || '', type: String },
      { value: b.author || '', type: String },
      { value: b.others || '', type: String },
      { value: b.publisher || '', type: String },
      asNumber(b.year) !== null ? { value: asNumber(b.year), type: Number } : { value: b.year || '', type: String },
      asNumber(b.pages) !== null ? { value: asNumber(b.pages), type: Number } : { value: '', type: String },
      { value: b.isbn || '', type: String }, // metin: Excel uzun numarayı bozmasın (9,79E+12 olmasın)
      { value: formatLocation(b.location), type: String },
      ...locCols.map((_, i) => ({ value: b.location?.[i] ?? '', type: String })),
      added ? { value: added, type: Date, format: 'dd.mm.yyyy' } : { value: '', type: String },
      { value: b.labelPrinted?.cover ? 'Evet' : 'Hayır', type: String },
      { value: b.labelPrinted?.spine ? 'Evet' : 'Hayır', type: String },
    ]);
  }
  const date = now.toISOString().slice(0, 10);
  return { rows, columns: widths.map((width) => ({ width })), filename: `kutuphane-${date}.xlsx` };
}

/** .xlsx dosyasını oluşturur (kütüphane yalnızca gerektiğinde yüklenir). */
export async function buildExcel(books) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const { rows, columns, filename } = buildSheet(books);
  const blob = await writeXlsxFile(rows, {
    sheet: 'Kütüphanem',
    columns,
    stickyRowsCount: 1,
  }, { fontFamily: 'Calibri', fontSize: 11 }).toBlob();
  return { blob, filename };
}
