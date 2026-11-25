// Satır eklemeli yer düzenleyici. Hem "Yer seç" ekranında hem tek bir kitabın yerini
// değiştirirken kullanılır.
import { esc, icon } from '../ui.js';
import { ROW_HINTS, formatLocation } from '../modules/location.js';

export function createLocationEditor(container, initialLines, { onChange } = {}) {
  let rows = initialLines && initialLines.length ? [...initialLines] : [''];

  function rowHtml(value, i) {
    const hint = ROW_HINTS[i] ?? 'Ek bilgi';
    return `<div class="loc-row">
      <span class="loc-n" aria-hidden="true">${i + 1}</span>
      <input class="field" data-i="${i}" value="${esc(value)}" placeholder="${esc(hint)}"
        aria-label="${i + 1}. satır" maxlength="60" autocomplete="off" enterkeyhint="next">
      <button type="button" class="icon-btn" data-remove="${i}" aria-label="${i + 1}. satırı sil">${icon.close}</button>
    </div>`;
  }

  function render(focusIndex) {
    container.innerHTML = `
      <div class="loc-rows">${rows.map(rowHtml).join('')}</div>
      <button type="button" class="add-row">${icon.plus} Satır ekle</button>`;
    if (focusIndex != null) container.querySelector(`input[data-i="${focusIndex}"]`)?.focus();
    onChange?.(rows);
  }

  container.addEventListener('input', (e) => {
    const i = e.target.dataset?.i;
    if (i == null) return;
    rows[Number(i)] = e.target.value;
    onChange?.(rows);
  });

  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.target.dataset?.i == null) return;
    e.preventDefault();
    const i = Number(e.target.dataset.i);
    if (i === rows.length - 1) { rows.push(''); render(i + 1); }
    else container.querySelector(`input[data-i="${i + 1}"]`)?.focus();
  });

  container.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      const i = Number(rm.dataset.remove);
      rows = rows.length > 1 ? rows.filter((_, j) => j !== i) : [''];
      render();
      return;
    }
    if (e.target.closest('.add-row')) {
      rows.push('');
      render(rows.length - 1);
    }
  });

  render();

  return {
    getLines: () => [...rows],
    setLines: (lines) => { rows = lines && lines.length ? [...lines] : ['']; render(); },
    preview: () => formatLocation(rows),
  };
}
