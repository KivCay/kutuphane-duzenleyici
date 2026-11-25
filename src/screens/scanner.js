// 3 · Tarayıcı. Modül 1'de yalnızca elle ISBN girişi var; kamera Modül 2'de eklenecek.
import { state } from '../state.js';
import { esc, icon } from '../ui.js';
import { formatLocation } from '../modules/location.js';
import { isValidIsbn, normalizeIsbn } from '../modules/books.js';

export function render() {
  const loc = formatLocation(state.location);
  return `
  <section class="screen dark">
    <header class="bar">
      <a class="round-btn" href="#/" aria-label="Bitir, kütüphaneye dön">${icon.back}</a>
      <h1 class="bar-title">Kitap okut</h1>
    </header>
    <div class="scroll pad center stack-16">
      <div class="camera-placeholder">
        <p>Kamera ile barkod okuma bir sonraki modülde geliyor.</p>
      </div>
      <form class="stack-8" id="isbn-form" novalidate>
        <label class="section-label on-dark" for="isbn">ISBN'i elle yaz</label>
        <input class="field" id="isbn" aria-describedby="isbn-error" inputmode="numeric" autocomplete="off" placeholder="978…" maxlength="20" enterkeyhint="go">
        <p class="error" id="isbn-error" role="alert" hidden></p>
        <button class="btn btn-primary" type="submit">Devam</button>
        <button class="btn btn-ghost on-dark" type="button" data-action="no-isbn">ISBN'i olmayan kitap ekle</button>
      </form>
    </div>
    <footer class="actions">
      <a class="loc-strip on-dark" href="#/yer?sonra=okut">
        ${icon.pin}
        <span class="loc-strip-text"><span class="loc-strip-value">${loc ? esc(loc) : 'Yer belirtilmedi'}</span></span>
        <span class="link-text">Değiştir</span>
      </a>
    </footer>
  </section>`;
}

export function mount(root, { go }) {
  const form = root.querySelector('#isbn-form');
  const input = root.querySelector('#isbn');
  const err = root.querySelector('#isbn-error');

  // Yazmaya başlayınca eski hata mesajı kaybolur.
  input.addEventListener('input', () => {
    err.hidden = true;
    input.classList.remove('invalid');
    input.removeAttribute('aria-invalid');
  });
  const fail = (message) => {
    err.textContent = message;
    err.hidden = false;
    input.classList.add('invalid');
    input.setAttribute('aria-invalid', 'true');
    input.focus();
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = input.value;
    if (!normalizeIsbn(raw)) {
      fail('Önce ISBN numarasını yaz.');
      return;
    }
    if (!isValidIsbn(raw)) {
      fail('Bu ISBN geçerli görünmüyor. Rakamları kontrol et (10 ya da 13 hane).');
      return;
    }
    go(`#/yeni?isbn=${normalizeIsbn(raw)}`);
  });

  root.querySelector('[data-action="no-isbn"]').addEventListener('click', () => go('#/yeni'));
}
