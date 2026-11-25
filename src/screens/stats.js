// Özet: kütüphanenin temel sayıları.
import { state } from '../state.js';
import { header } from '../ui.js';
import { basicStats } from '../modules/stats.js';

function tile(value, label, href) {
  const inner = `<span class="tile-value">${value}</span><span class="tile-label">${label}</span>`;
  return href ? `<a class="tile" href="${href}">${inner}</a>` : `<div class="tile">${inner}</div>`;
}

export function render() {
  const s = basicStats(state.books);
  return `
  <section class="screen">
    ${header('Özet', '#/')}
    <div class="scroll pad stack-16">
      <div class="stack-8">
        <p class="section-label">Kütüphane</p>
        <div class="tiles">
          ${tile(s.inLibrary, 'kütüphanede', '#/')}
          ${tile(s.totalAdded, 'toplam eklenen')}
          ${tile(s.addedThisMonth, 'bu ay eklenen')}
          ${tile(s.removed, 'kütüphaneden çıkarılan', s.removed ? '#/' : '')}
        </div>
      </div>
      <div class="stack-8">
        <p class="section-label">Ödünç</p>
        <div class="tiles">
          ${tile(s.onLoan, 'şu an ödünçte', s.onLoan ? '#/' : '')}
          ${tile(s.loansTotal, 'toplam ödünç verme')}
        </div>
      </div>
      <div class="stack-8">
        <p class="section-label">Etiketler</p>
        <div class="tiles">
          ${tile(s.coverPending, 'kapak etiketi bekliyor', s.coverPending ? '#/etiketler' : '')}
          ${tile(s.spinePending, 'sırt etiketi bekliyor', s.spinePending ? '#/etiketler' : '')}
        </div>
      </div>
      <p class="muted small">"Toplam eklenen" kalıcı olarak silinen kayıtları saymaz; kütüphaneden çıkarılanlar dahildir.</p>
    </div>
  </section>`;
}

export function mount() {}
