// Ekranların ortak parçaları: güvenli metin, simgeler, başlık, bildirim.

export function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const svg = (d, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const icon = {
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
  scan: svg('<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M13 8v8M17 8v8"/>', 22),
  qr: svg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M21 21h-4M21 14v3"/>', 18),
  download: svg('<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>', 18),
  pin: svg('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', 18),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 16),
  trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', 18),
  handoff: svg('<path d="M7 11l5-5 5 5M12 6v12M5 20h14"/>', 18),
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', 18),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>', 18),
};

export function header(title, backHref) {
  return `<header class="bar">
    ${backHref ? `<a class="round-btn" href="${backHref}" aria-label="Geri">${icon.back}</a>` : ''}
    <h1 class="bar-title">${esc(title)}</h1>
  </header>`;
}

let toastTimer;
/** Kısa bildirim. action = { label, onClick } verilirse yanında bir düğme (ör. "Geri al") çıkar. */
export function toast(message, { action, ms } = {}) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.replaceChildren(document.createTextNode(message));
  if (action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = action.label;
    btn.addEventListener('click', () => { el.hidden = true; action.onClick(); }, { once: true });
    el.append(btn);
  }
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms ?? (action ? 7000 : 2600));
}
