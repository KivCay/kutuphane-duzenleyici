// 2 · Yer seç: okutmaya başlamadan önce kitapların durduğu yer.
import { state, setActiveLocation } from '../state.js';
import { esc, header, icon } from '../ui.js';
import { formatLocation } from '../modules/location.js';
import { createLocationEditor } from '../components/locationEditor.js';

export function render({ query }) {
  const scanFlow = query.get('sonra') === 'okut';
  const recents = state.recents.length
    ? `<div class="stack-8">
        <p class="section-label">Son kullanılan yerler</p>
        ${state.recents.map((r, i) => `<button type="button" class="recent" data-recent="${i}">${icon.pin}<span>${esc(formatLocation(r))}</span></button>`).join('')}
      </div>`
    : '';

  return `
  <section class="screen">
    ${header('Kitaplar nerede duruyor?', '#/')}
    <div class="scroll pad stack-16">
      <p class="muted lead">${scanFlow
        ? 'Şimdi okutacağın kitaplar bu yere kaydedilir. Geçen seferki yer hazır geliyor; aynı yerdeysen doğrudan başla.'
        : 'Bundan sonra okutacağın kitaplar bu yere kaydedilir.'}</p>
      <div id="loc-editor"></div>
      <div class="preview-box">
        <span class="section-label">Kitaplara şöyle yazılacak</span>
        <span class="preview-value" id="loc-preview"></span>
      </div>
      ${recents}
    </div>
    <footer class="actions">
      <button type="button" class="btn btn-primary" data-action="use">${scanFlow ? 'Bu yerle okutmaya başla' : 'Bu yeri kaydet'}</button>
      ${scanFlow ? '<button type="button" class="btn btn-ghost" data-action="skip">Yer belirtmeden geç</button>' : ''}
    </footer>
  </section>`;
}

export function mount(root, { query, go }) {
  const scanFlow = query.get('sonra') === 'okut';
  const previewEl = root.querySelector('#loc-preview');
  const editor = createLocationEditor(root.querySelector('#loc-editor'), state.location, {
    onChange: (rows) => {
      const text = formatLocation(rows);
      previewEl.textContent = text || 'Yer belirtilmedi';
    },
  });

  root.querySelectorAll('[data-recent]').forEach((btn) => {
    btn.addEventListener('click', () => editor.setLines(state.recents[Number(btn.dataset.recent)]));
  });

  root.querySelector('[data-action="use"]').addEventListener('click', async () => {
    await setActiveLocation(editor.getLines());
    go(scanFlow ? '#/okut' : '#/');
  });

  root.querySelector('[data-action="skip"]')?.addEventListener('click', async () => {
    await setActiveLocation(null);
    go('#/okut');
  });
}
