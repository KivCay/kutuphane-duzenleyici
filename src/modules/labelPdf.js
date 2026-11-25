// Etiket PDF'i: A4 sayfalar, etiketler milimetresi milimetresine yerleşir; QR kodlar vektör
// (her boyutta keskin) çizilir. Türkçe harfler için Inter yazı tipi PDF'e gömülür.
// Ağır kütüphaneler yalnızca etiket oluşturulurken yüklenir.
import { PAGE, SHEETS, layoutLabels } from './labelLayout.js';
import { coverUrl, spineCode } from './qrPayload.js';
import { formatNumber } from './books.js';

export const SPINE_QR_MM = 10; // 21×21 kare: her kare ~0,48 mm, telefonla yakından rahat okunur

async function fontBase64(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function loadLibs() {
  const [{ jsPDF }, QR, { default: regularUrl }, { default: boldUrl }] = await Promise.all([
    import('jspdf'),
    import('qrcode'),
    import('../assets/fonts/Inter-400Regular.ttf?url'),
    import('../assets/fonts/Inter-700Bold.ttf?url'),
  ]);
  const [regular, bold] = await Promise.all([fontBase64(regularUrl), fontBase64(boldUrl)]);
  return { jsPDF, QR: QR.default ?? QR, regular, bold };
}

function drawQr(doc, QR, text, x, y, size, level = 'M') {
  const qr = QR.create(text, { errorCorrectionLevel: level });
  const n = qr.modules.size;
  const cell = size / n;
  const data = qr.modules.data;
  doc.setFillColor(0, 0, 0);
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!data[r * n + c]) { c++; continue; }
      let run = 1; // yan yana siyah kareleri tek dikdörtgende birleştir (daha küçük PDF)
      while (c + run < n && data[r * n + c + run]) run++;
      doc.rect(x + c * cell, y + r * cell, run * cell + 0.01, cell + 0.01, 'F');
      c += run;
    }
  }
}

function fitText(doc, text, maxW) {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1);
  return t + '…';
}

/**
 * @param kind 'kapak' | 'sirt'
 * @param books kitap kayıtları
 * @param opts { startAt, owner, outlines, origin }
 * @returns Blob (application/pdf)
 */
export async function buildLabelPdf(kind, books, { startAt = 1, owner = '', outlines = false, origin } = {}) {
  const { jsPDF, QR, regular, bold } = await loadLibs();
  const sheet = SHEETS[kind];
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  doc.addFileToVFS('Inter-Regular.ttf', regular);
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
  doc.addFileToVFS('Inter-Bold.ttf', bold);
  doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');
  doc.setProperties({ title: `Kütüphane etiketleri (${kind === 'kapak' ? 'kapak' : 'sırt'})`, creator: 'Kütüphane Düzenleyici' });

  const slots = layoutLabels(sheet, books, startAt);
  let currentPage = 0;

  for (const { page, x, y, item: book } of slots) {
    while (page > currentPage) { doc.addPage('a4', 'portrait'); currentPage++; }

    if (outlines) {
      doc.setDrawColor(190, 190, 190);
      doc.setLineWidth(0.1);
      doc.roundedRect(x, y, sheet.w, sheet.h, 1.5, 1.5, 'S');
    }

    if (kind === 'kapak') {
      const pad = 4;
      const qrSize = sheet.h - 2 * pad; // 29 mm
      drawQr(doc, QR, coverUrl(origin, book, owner), x + pad, y + pad, qrSize);
      const tx = x + pad + qrSize + 3.5;
      const maxW = x + sheet.w - pad - tx;
      doc.setTextColor(20, 20, 20);
      doc.setFont('Inter', 'bold');
      doc.setFontSize(24);
      doc.text(formatNumber(book.number), tx, y + 17);
      doc.setFont('Inter', 'normal');
      const a = String(book.author ?? '').trim();
      if (a) {
        // Yazarın tam adı: sığmazsa yazı küçülür, yine sığmazsa iki satıra bölünür.
        let size = 9.5;
        doc.setFontSize(size);
        while (size > 7 && doc.getTextWidth(a) > maxW) { size -= 0.5; doc.setFontSize(size); }
        let lines = doc.getTextWidth(a) <= maxW ? [a] : doc.splitTextToSize(a, maxW);
        if (lines.length > 2) lines = [lines[0], fitText(doc, lines[1] + ' ' + lines.slice(2).join(' '), maxW)];
        doc.text(lines, tx, y + 23, { lineHeightFactor: 1.15 });
      }
      if (owner) {
        doc.setFontSize(6.5);
        doc.setTextColor(90, 90, 90);
        doc.text(fitText(doc, owner, maxW), tx, y + sheet.h - pad - 0.5);
      }
    } else {
      // Sırt: küçük QR (yalnızca "KD:numara", en küçük QR boyu) ve altında ortalanmış numara.
      const qrSize = SPINE_QR_MM;
      const numH = 3.2; // ~10 pt yazının yüksekliği
      const gap = 1.2;
      const blockH = qrSize + gap + numH;
      const qx = x + (sheet.w - qrSize) / 2;
      const qy = y + (sheet.h - blockH) / 2;
      drawQr(doc, QR, spineCode(book.number), qx, qy, qrSize);
      doc.setTextColor(20, 20, 20);
      doc.setFont('Inter', 'bold');
      doc.setFontSize(10);
      doc.text(formatNumber(book.number), x + sheet.w / 2, qy + qrSize + gap + numH - 0.5, { align: 'center' });
    }
  }

  if (!slots.length) doc.text('Etiket yok', PAGE.w / 2, PAGE.h / 2, { align: 'center' });
  return doc.output('blob');
}

/** PDF'i telefonda paylaşım menüsüyle, bilgisayarda indirme olarak verir. */
export async function deliverPdf(blob, filename) {
  const file = new File([blob], filename, { type: 'application/pdf' });
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (mobile && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'paylasildi';
    } catch (e) {
      if (e?.name === 'AbortError') return 'iptal';
      // paylaşım olmadıysa indirmeye geç
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'indirildi';
}
