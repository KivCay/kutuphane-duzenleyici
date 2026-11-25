// 1 · Kütüphanem: numaralı kitap listesi, aktif yer, ana düğmeler; altta çıkarılanlar ve "Baştan başla".
import { state, resetLibrary } from '../state.js';
import { esc, icon, toast } from '../ui.js';
import { formatNumber, isActive, daysSince } from '../modules/books.js';
import { formatLocation } from '../modules/location.js';
import { confirmDialog } from '../components/dialog.js';

function row(b) {
  const loan = b.loan ? `<span class="badge loan">${icon.handoff} ${esc(b.loan.to)} · ${daysSince(b.loan.date) ? `${daysSince(b.loan.date)} gün` : 'bugün'}</span>` : '';
  const removed = !isActive(b) ? `<span class="badge removed">${esc(b.removed?.reason ?? 'Çıkarıldı')}</span>` : '';
  return `<li><a class="book-row ${isActive(b) ? '' : 'is-removed'}" href="#/kitap/${b.number}">
    <span class="book-no">${formatNumber(b.number)}</span>
    <span class="book-text">
      <span class="book-title">${esc(b.title || 'Adsız kitap')}${b.subtitle ? `<span class="book-subtitle">: ${esc(b.subtitle)}</span>` : ''}</span>
      ${b.author ? `<span class="book-sub">${esc(b.author)}</span>` : ''}
      ${isActive(b) ? `<span class="book-loc">${b.location ? esc(formatLocation(b.location)) : 'Yer belirtilmedi'}</span>` : ''}
      ${loan}${removed}
    </span>
  </a></li>`;
}

export function render() {
  const active = state.books.filter(isActive).sort((a, b) => b.number - a.number);
  const removed = state.books.filter((b) => !isActive(b)).sort((a, b) => b.number - a.number);
  const onLoan = active.filter((b) => b.loan).length;
  const loc = formatLocation(state.location);

  const list = active.length
    ? `<ul class="book-list">${active.map(row).join('')}</ul>`
    : `<div class="empty">
        <p class="empty-title">${removed.length ? 'Kütüphanede kitap kalmadı' : 'Henüz kitap yok'}</p>
        <p>"Kitap okut"a bas, önce kitapların durduğu yeri yaz, sonra barkodları okutmaya başla.</p>
      </div>`;

  const removedSection = removed.length
    ? `<details class="removed-list"><summary>Kütüphaneden çıkarılanlar (${removed.length})</summary>
        <ul class="book-list">${removed.map(row).join('')}</ul></details>`
    : '';

  const reset = state.books.length
    ? `<div class="reset-area"><button type="button" class="link-danger" data-action="reset">${icon.trash} Tüm kitapları sil ve baştan başla</button></div>`
    : '';

  return `
  <section class="screen">
    <div class="lib-head">
      <p class="eyebrow">Ev kütüphanesi</p>
      <div class="lib-title-row">
        <h1 class="display">Kütüphanem</h1>
        <p class="muted">${active.length} kitap${onLoan ? ` · ${onLoan} ödünçte` : ''}</p>
      </div>
    </div>
    <a class="loc-strip" href="#/yer">
      ${icon.pin}
      <span class="loc-strip-text">
        <span class="loc-strip-label">Okutulanlar buraya kaydedilir</span>
        <span class="loc-strip-value">${loc ? esc(loc) : 'Yer belirtilmedi'}</span>
      </span>
      <span class="link-text">Değiştir</span>
    </a>
    <div class="scroll">${list}${removedSection}${reset}</div>
    <footer class="actions">
      <a class="btn btn-primary" href="#/yer?sonra=okut">${icon.scan} Kitap okut</a>
      <div class="two-col">
        <a class="btn btn-secondary" href="#/etiketler">${icon.qr} Etiketler</a>
        <button type="button" class="btn btn-secondary" data-action="excel">${icon.download} Excel'e aktar</button>
      </div>
    </footer>
  </section>`;
}

async function exportExcel(btn) {
  if (!state.books.length) { toast('Henüz kitap yok. Önce birkaç kitap okut.'); return false; }
  if (btn?.disabled) return false;
  const label = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Hazırlanıyor…'; }
  try {
    const [{ buildExcel }, { deliverFile }] = await Promise.all([
      import('../modules/excelExport.js'),
      import('../modules/deliverFile.js'),
    ]);
    const { blob, filename } = await buildExcel(state.books);
    const result = await deliverFile(blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    if (result !== 'iptal') toast(`${state.books.filter(isActive).length} kitap Excel'e aktarıldı`);
    return result !== 'iptal';
  } catch (e) {
    console.error(e);
    toast('Excel dosyası oluşturulamadı. İnternet bağlantını kontrol edip tekrar dene.');
    return false;
  } finally {
    if (btn) { btn.innerHTML = label; btn.disabled = false; }
  }
}

export function mount(root, { go }) {
  const btn = root.querySelector('[data-action="excel"]');
  btn.addEventListener('click', () => exportExcel(btn));

  root.querySelector('[data-action="reset"]')?.addEventListener('click', async () => {
    const n = state.books.length;
    const first = await confirmDialog({
      title: 'Baştan başlansın mı?',
      body: `Kütüphanendeki <b>${n} kitabın tamamı</b> (çıkarılanlar dahil) silinir ve numaralama <b>0001</b>'den yeniden başlar. Bu geri alınamaz.<br><br>Önce Excel'e yedek almanı öneririz.`,
      confirmLabel: 'Devam',
      danger: true,
      formHtml: `<label class="check"><input type="checkbox" name="backup" checked><span>Silmeden önce Excel yedeği indir</span></label>`,
    });
    if (!first) return;
    if (first.get('backup')) {
      const ok = await exportExcel(null);
      if (!ok) { toast('Yedek alınamadığı için silme durduruldu.'); return; }
    }
    const second = await confirmDialog({
      title: 'Emin misin?',
      body: `Yazının altına <b>SİL</b> yaz ve onayla. ${n} kitap kalıcı olarak silinecek.`,
      confirmLabel: 'Hepsini sil',
      danger: true,
      formHtml: '<input class="field" name="word" autocomplete="off" autocapitalize="characters" aria-label="Onay kelimesi">',
      validate: (f) => (['SİL', 'SIL'].includes(String(f.get('word') ?? '').trim().toLocaleUpperCase('tr')) ? null : 'Onaylamak için SİL yaz.'),
    });
    if (!second) return;
    await resetLibrary();
    go('#/');
    toast('Kütüphane sıfırlandı. Numaralama 0001\'den başlıyor.');
  });
}
