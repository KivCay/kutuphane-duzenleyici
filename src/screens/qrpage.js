// 6 · QR sayfası. Kapak etiketi (#/k/...) herkese kitabın bilgilerini gösterir; bilgiler QR'ın
// içinden gelir. Sırt etiketi (#/n/6) yalnızca numara taşır: bu telefonda kayıtlıysa kitabı açar.
import { state } from '../state.js';
import { esc } from '../ui.js';
import { decodeBook } from '../modules/qrPayload.js';
import { formatNumber, getBook, normalizeIsbn, isActive } from '../modules/books.js';
import { formatLocation } from '../modules/location.js';

const brand = `<header class="qr-brand">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM8 7h7"/></svg>
  <span>Kütüphane Düzenleyici</span></header>`;

function row(label, value) {
  return value ? `<div class="qr-row"><dt>${label}</dt><dd>${esc(value)}</dd></div>` : '';
}

function ownBook(info) {
  const local = getBook(state.books, info.number);
  if (!local) return null;
  // Aynı numara başka birinin kütüphanesinde de olabilir: ISBN ya da ad da uymalı.
  if (info.isbn && normalizeIsbn(local.isbn) === normalizeIsbn(info.isbn)) return local;
  if (!info.isbn && info.title && local.title === info.title) return local;
  return null;
}

export function render({ params }) {
  if (params.kind === 'n') {
    const book = getBook(state.books, params.number);
    if (book) return ''; // mount() kitap kartına yönlendirir
    return `<section class="screen qr-page">${brand}
      <div class="pad stack-16">
        <span class="qr-no">No. ${formatNumber(params.number)}</span>
        <p class="lead">Bu, bir kitabın sırt etiketi. Kitabın bilgileri sahibinin telefonundaki Kütüphane Düzenleyici'de kayıtlı.</p>
        <p class="muted small">Kitabın kapağındaki büyük QR etiketi okutursan bilgilerini görebilirsin.</p>
        <a class="btn btn-secondary" href="#/">Uygulamayı aç</a>
      </div></section>`;
  }

  const info = decodeBook(params.data);
  if (!info) {
    return `<section class="screen qr-page">${brand}<div class="pad stack-16">
      <p class="lead">Bu QR kod okunamadı ya da bozulmuş.</p><a class="btn btn-secondary" href="#/">Uygulamayı aç</a></div></section>`;
  }
  const mine = ownBook(info);
  return `
  <section class="screen qr-page">
    ${brand}
    <div class="pad stack-16">
      <div class="stack-8">
        <span class="qr-no">No. ${formatNumber(info.number)}</span>
        <h1 class="qr-title">${esc(info.title || 'Adsız kitap')}</h1>
        ${info.subtitle ? `<p class="qr-subtitle">${esc(info.subtitle)}</p>` : ''}
        ${info.author ? `<p class="qr-author">${esc(info.author)}</p>` : ''}
        ${info.others ? `<p class="muted small">${esc(info.others)}</p>` : ''}
      </div>
      <dl class="qr-table">
        ${row('Yayınevi', info.publisher)}${row('Yıl', info.year)}${row('Sayfa', info.pages)}${row('ISBN', info.isbn)}
      </dl>
      ${mine ? `<a class="loc-strip" href="#/kitap/${mine.number}" style="margin:0">
          <span class="loc-strip-text"><span class="loc-strip-label">Senin kütüphanende · ${!isActive(mine) ? 'durum' : mine.loan ? 'ödünçte' : 'yeri'}</span>
          <span class="loc-strip-value">${!isActive(mine)
            ? `Kütüphaneden çıkarıldı · ${esc(mine.removed?.reason ?? '')}`
            : mine.loan ? `${esc(mine.loan.to)} kişisinde` : mine.location ? esc(formatLocation(mine.location)) : 'Yer belirtilmedi'}</span></span>
          <span class="link-text">Aç</span></a>`
        : info.owner ? `<div class="qr-owner"><span class="loc-strip-label">Bu kitabın sahibi</span><b>${esc(info.owner)}</b><span>Ödünç aldıysan okuduktan sonra geri vermeyi unutma.</span></div>` : ''}
    </div>
    <p class="qr-foot muted small">Bu sayfa kitabın etiketindeki QR koddan açıldı. Uygulama kurmak ya da hesap açmak gerekmez.</p>
  </section>`;
}

export function mount(root, { params }) {
  if (params.kind === 'n' && getBook(state.books, params.number)) {
    window.location.replace(`#/kitap/${params.number}`);
  }
}
