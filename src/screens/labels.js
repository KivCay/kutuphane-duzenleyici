// 5 · Etiketler: kapak (24'lü) ve sırt (65'li) QR etiketleri için PDF.
import { state, updateSettings, markLabelsPrinted } from '../state.js';
import { header, esc, icon, toast } from '../ui.js';
import { SHEETS, perPage, pageCount, layoutLabels } from '../modules/labelLayout.js';
import { formatNumber, isActive } from '../modules/books.js';

const KIND_KEY = { kapak: 'cover', sirt: 'spine' };

// Ekrandaki seçimler (uygulama açık kaldıkça hatırlanır).
const ui = { kind: 'kapak', scope: 'yeni', startAt: 1, outlines: false };

function selectedBooks() {
  const key = KIND_KEY[ui.kind];
  const sorted = state.books.filter(isActive).sort((a, b) => a.number - b.number); // çıkarılanlara etiket basılmaz
  return ui.scope === 'yeni' ? sorted.filter((b) => !b.labelPrinted?.[key]) : sorted;
}

function counts() {
  const key = KIND_KEY[ui.kind];
  const active = state.books.filter(isActive);
  return { yeni: active.filter((b) => !b.labelPrinted?.[key]).length, tumu: active.length };
}

function previewHtml() {
  const sheet = SHEETS[ui.kind];
  const books = selectedBooks();
  const slots = layoutLabels(sheet, books, ui.startAt).filter((s) => s.page === 0);
  const byIndex = new Map(slots.map((s) => [s.index, s.item]));
  const cells = [];
  for (let i = 0; i < perPage(sheet); i++) {
    const b = byIndex.get(i);
    const used = i < ui.startAt - 1;
    cells.push(b
      ? `<div class="pv-label filled"><span class="pv-qr" aria-hidden="true"></span><span class="pv-text"><b>${formatNumber(b.number)}</b>${ui.kind === 'kapak' && b.author ? `<small>${esc(b.author)}</small>` : ''}</span></div>`
      : `<div class="pv-label ${used ? 'used' : ''}"></div>`);
  }
  return `<div class="pv-sheet pv-${ui.kind}" role="img" aria-label="İlk sayfanın önizlemesi">${cells.join('')}</div>`;
}

export function render() {
  if (!state.books.some(isActive)) {
    return `<section class="screen">${header('Etiketler', '#/')}
      <div class="pad"><div class="empty"><p class="empty-title">Henüz kitap yok</p><p>Önce birkaç kitap okut; etiketleri sonra buradan basarsın.</p></div></div></section>`;
  }
  return `
  <section class="screen">
    ${header('Etiketler', '#/')}
    <div class="scroll pad stack-14" id="labels-body"></div>
    <footer class="actions">
      <button type="button" class="btn btn-primary" data-action="pdf">${icon.download} PDF oluştur</button>
    </footer>
  </section>`;
}

function bodyHtml() {
  const sheet = SHEETS[ui.kind];
  const c = counts();
  const books = selectedBooks();
  const pages = pageCount(sheet, books.length, ui.startAt);
  const max = perPage(sheet);
  return `
    <div class="segmented" role="group" aria-label="Etiket türü">
      <button type="button" data-kind="kapak" aria-pressed="${ui.kind === 'kapak'}">Kapak etiketi</button>
      <button type="button" data-kind="sirt" aria-pressed="${ui.kind === 'sirt'}">Sırt etiketi</button>
    </div>
    <p class="muted small">${ui.kind === 'kapak'
      ? `${sheet.name} kâğıt (70 × 37 mm). QR kod, numara ve yazarın adı. QR okutulunca kitabın bilgi sayfası açılır.`
      : `${sheet.name} kâğıt (38 × 21 mm). 1 cm'lik QR ve altında numara. Bu QR'ı yalnızca uygulamadaki "Kitap okut" ekranı okur; kitap listende açılır.`}</p>

    <div class="segmented soft" role="group" aria-label="Hangi kitaplar">
      <button type="button" data-scope="yeni" aria-pressed="${ui.scope === 'yeni'}">Basılmamışlar (${c.yeni})</button>
      <button type="button" data-scope="tumu" aria-pressed="${ui.scope === 'tumu'}">Tümü (${c.tumu})</button>
    </div>

    <div class="field-grid">
      <div class="field-wrap">
        <label class="field-label" for="start-at">Kâğıttaki ilk boş etiket</label>
        <input class="field" id="start-at" type="number" inputmode="numeric" min="1" max="${max}" value="${ui.startAt}">
      </div>
      <label class="check">
        <input type="checkbox" id="outlines" ${ui.outlines ? 'checked' : ''}>
        <span>Etiket sınırlarını çiz <small>(düz kâğıda deneme baskısı için)</small></span>
      </label>
      ${ui.kind === 'kapak' ? `
      <div class="field-wrap wide">
        <label class="field-label" for="owner">Kitapların sahibi (isteğe bağlı, etikette ve QR sayfasında görünür)</label>
        <input class="field" id="owner" maxlength="40" placeholder="ör. Ayşe Yılmaz" value="${esc(state.settings.owner ?? '')}">
      </div>` : ''}
    </div>

    ${books.length
      ? `<p class="summary"><b>${books.length}</b> etiket · <b>${pages}</b> sayfa${ui.startAt > 1 ? ` · ilk sayfada ${ui.startAt - 1} etiket atlanıyor` : ''}</p>${previewHtml()}`
      : `<div class="empty"><p class="empty-title">Basılacak etiket yok</p><p>Tüm kitapların ${ui.kind === 'kapak' ? 'kapak' : 'sırt'} etiketi basılmış görünüyor. Yeniden basmak için "Tümü"nü seç.</p></div>`}

    <div class="tip">${icon.info}<span>Yazdırırken ölçeği <b>%100 / Gerçek boyut</b> seç ("Sayfaya sığdır" değil). İlk seferde düz kâğıda basıp etiket kâğıdının üstüne tutarak hizayı kontrol et.</span></div>
    <div id="after-print" hidden></div>`;
}

export function mount(root) {
  const body = root.querySelector('#labels-body');
  if (!body) return;
  const pdfBtn = root.querySelector('[data-action="pdf"]');
  let lastPrinted = null;

  function refresh() {
    body.innerHTML = bodyHtml();
    pdfBtn.disabled = selectedBooks().length === 0;
  }

  body.addEventListener('click', (e) => {
    const k = e.target.closest('[data-kind]');
    if (k) { ui.kind = k.dataset.kind; ui.startAt = 1; refresh(); return; }
    const s = e.target.closest('[data-scope]');
    if (s) { ui.scope = s.dataset.scope; refresh(); return; }
    if (e.target.closest('[data-action="mark"]') && lastPrinted) {
      markLabelsPrinted(lastPrinted.numbers, lastPrinted.key).then(() => {
        toast(`${lastPrinted.numbers.length} etiket basıldı olarak işaretlendi`);
        lastPrinted = null;
        refresh();
      });
    }
  });

  body.addEventListener('change', (e) => {
    if (e.target.id === 'start-at') {
      const max = perPage(SHEETS[ui.kind]);
      ui.startAt = Math.min(Math.max(Math.floor(Number(e.target.value) || 1), 1), max);
      refresh();
    } else if (e.target.id === 'outlines') {
      ui.outlines = e.target.checked;
    } else if (e.target.id === 'owner') {
      updateSettings({ owner: e.target.value.replace(/\s+/g, ' ').trim() });
    }
  });

  pdfBtn.addEventListener('click', async () => {
    const books = selectedBooks();
    if (!books.length || pdfBtn.disabled) return;
    const ownerInput = body.querySelector('#owner');
    if (ownerInput) await updateSettings({ owner: ownerInput.value.replace(/\s+/g, ' ').trim() });
    pdfBtn.disabled = true;
    const label = pdfBtn.innerHTML;
    pdfBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span> PDF hazırlanıyor…';
    try {
      const { buildLabelPdf, deliverPdf } = await import('../modules/labelPdf.js');
      const blob = await buildLabelPdf(ui.kind, books, {
        startAt: ui.startAt, owner: state.settings.owner ?? '', outlines: ui.outlines, origin: window.location.origin,
      });
      const date = new Date().toISOString().slice(0, 10);
      const result = await deliverPdf(blob, `etiketler-${ui.kind}-${date}.pdf`);
      if (result !== 'iptal') {
        lastPrinted = { numbers: books.map((b) => b.number), key: KIND_KEY[ui.kind] };
        const box = body.querySelector('#after-print');
        box.innerHTML = `<div class="after-print">
          <p><b>PDF hazır.</b> Bastıktan sonra bu ${books.length} etiketi "basıldı" olarak işaretle; bir dahaki sefere yalnızca yeni kitaplar gelsin.</p>
          <button type="button" class="btn btn-secondary" data-action="mark">Basıldı olarak işaretle</button>
        </div>`;
        box.hidden = false;
        box.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    } catch (e) {
      console.error(e);
      toast('PDF oluşturulamadı. İnternet bağlantını kontrol edip tekrar dene.');
    } finally {
      pdfBtn.innerHTML = label;
      pdfBtn.disabled = selectedBooks().length === 0;
    }
  });

  refresh();
}
