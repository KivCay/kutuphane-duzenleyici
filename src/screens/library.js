// 1 · Kütüphanem: numaralı kitap listesi, aktif yer, ana düğmeler.
import { state } from '../state.js';
import { esc, icon, toast } from '../ui.js';
import { formatNumber } from '../modules/books.js';
import { formatLocation } from '../modules/location.js';

export function render() {
  const books = [...state.books].sort((a, b) => b.number - a.number);
  const loc = formatLocation(state.location);

  const list = books.length
    ? `<ul class="book-list">${books.map((b) => `
        <li><a class="book-row" href="#/kitap/${b.number}">
          <span class="book-no">${formatNumber(b.number)}</span>
          <span class="book-text">
            <span class="book-title">${esc(b.title || 'Adsız kitap')}</span>
            ${b.author ? `<span class="book-sub">${esc(b.author)}</span>` : ''}
            <span class="book-loc">${b.location ? esc(formatLocation(b.location)) : 'Yer belirtilmedi'}</span>
          </span>
        </a></li>`).join('')}</ul>`
    : `<div class="empty">
        <p class="empty-title">Henüz kitap yok</p>
        <p>"Kitap okut"a bas, önce kitapların durduğu yeri yaz, sonra barkodları okutmaya başla.</p>
      </div>`;

  return `
  <section class="screen">
    <div class="lib-head">
      <p class="eyebrow">Ev kütüphanesi</p>
      <div class="lib-title-row">
        <h1 class="display">Kütüphanem</h1>
        <p class="muted">${state.books.length} kitap</p>
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
    <div class="scroll">${list}</div>
    <footer class="actions">
      <a class="btn btn-primary" href="#/yer?sonra=okut">${icon.scan} Kitap okut</a>
      <div class="two-col">
        <a class="btn btn-secondary" href="#/etiketler">${icon.qr} Etiketler</a>
        <button type="button" class="btn btn-secondary" data-action="excel">${icon.download} Excel'e aktar</button>
      </div>
    </footer>
  </section>`;
}

export function mount(root) {
  root.querySelector('[data-action="excel"]').addEventListener('click', () => {
    toast("Excel'e aktarma bir sonraki modüllerde geliyor.");
  });
}
