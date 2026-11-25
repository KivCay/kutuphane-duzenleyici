// Onay penceresi. Silme, çıkarma ve "Baştan başla" gibi geri dönüşü zor işlerden önce açılır.
import { esc } from '../ui.js';

/**
 * @param {{title:string, body?:string, confirmLabel:string, danger?:boolean, formHtml?:string, validate?:(fd:FormData)=>string|null}} opts
 * @returns {Promise<FormData|null>} onaylanırsa formdaki değerler (form yoksa boş FormData), vazgeçilirse null
 */
export function confirmDialog({ title, body = '', confirmLabel, danger = false, formHtml = '', validate }) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'dialog';
    dlg.innerHTML = `
      <form method="dialog" class="dialog-form" novalidate>
        <h2 class="dialog-title">${esc(title)}</h2>
        ${body ? `<p class="dialog-body">${body}</p>` : ''}
        ${formHtml}
        <p class="error" data-err hidden></p>
        <div class="dialog-actions">
          <button type="button" class="btn btn-secondary" data-cancel>Vazgeç</button>
          <button type="submit" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(confirmLabel)}</button>
        </div>
      </form>`;
    document.body.append(dlg);
    const form = dlg.querySelector('form');
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      dlg.close();
      dlg.remove();
      resolve(value);
    };
    dlg.querySelector('[data-cancel]').addEventListener('click', () => finish(null));
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); finish(null); }); // Esc / geri hareketi
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const msg = validate?.(fd);
      if (msg) {
        const err = form.querySelector('[data-err]');
        err.textContent = msg;
        err.hidden = false;
        return;
      }
      finish(fd);
    });
    dlg.showModal();
    (form.querySelector('input:not([type=radio]), textarea') ?? form.querySelector('[data-cancel]')).focus();
  });
}
