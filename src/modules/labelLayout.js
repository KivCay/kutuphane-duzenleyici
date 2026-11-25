// Etiket kâğıtlarının ölçüleri (mm) ve etiketlerin sayfalara yerleşimi.
// Ölçüler piyasadaki standart A4 yapışkanlı etiket kâğıtlarına göre:
//  - Kapak: 24'lü, 70 × 37 mm, 3 sütun × 8 satır, kenar boşluğu yok (ör. Tanex/Avery 3474 tipi)
//  - Sırt: 65'li, 38,1 × 21,2 mm, 5 sütun × 13 satır (ör. Avery L7651 tipi)

export const PAGE = { w: 210, h: 297 };

export const SHEETS = {
  kapak: { id: 'kapak', name: "A4 24'lü", cols: 3, rows: 8, w: 70, h: 37, left: 0, top: 0.5, gapX: 0, gapY: 0 },
  sirt: { id: 'sirt', name: "A4 65'li", cols: 5, rows: 13, w: 38.1, h: 21.2, left: 4.75, top: 10.7, gapX: 2.5, gapY: 0 },
};

export function perPage(sheet) {
  return sheet.cols * sheet.rows;
}

/** n. etiketin (0'dan) sayfadaki sol üst köşesi, mm. Soldan sağa, yukarıdan aşağı. */
export function slotPosition(sheet, index) {
  const i = index % perPage(sheet);
  const col = i % sheet.cols;
  const row = Math.floor(i / sheet.cols);
  return {
    x: sheet.left + col * (sheet.w + sheet.gapX),
    y: sheet.top + row * (sheet.h + sheet.gapY),
  };
}

/**
 * Kitapları sayfalara dağıtır. startAt: ilk sayfada ilk boş etiketin sırası (1'den başlar);
 * yarım kalmış bir kâğıdı yeniden kullanmak için.
 * Dönen: [{ index, page, x, y, item }]
 */
export function layoutLabels(sheet, items, startAt = 1) {
  const n = perPage(sheet);
  const skip = Math.min(Math.max(Math.floor(Number(startAt) || 1), 1), n) - 1;
  return items.map((item, k) => {
    const index = skip + k;
    return { index, page: Math.floor(index / n), ...slotPosition(sheet, index), item };
  });
}

export function pageCount(sheet, itemCount, startAt = 1) {
  if (!itemCount) return 0;
  const skip = Math.min(Math.max(Math.floor(Number(startAt) || 1), 1), perPage(sheet)) - 1;
  return Math.ceil((skip + itemCount) / perPage(sheet));
}

/** Etiketteki yazar: adların baş harfleri + soyadı. "İhsan Oktay Anar" -> "İ.O. Anar" */
export function authorShort(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? '';
  const last = parts.pop();
  return parts.map((p) => p.charAt(0).toLocaleUpperCase('tr') + '.').join('') + ' ' + last;
}
