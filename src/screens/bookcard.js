// 4 · Kitap kartı: yeni kitabı kaydetme (#/yeni) ve kayıtlı kitabı düzenleme (#/kitap/N).
import { state, saveNewBook, editBook } from '../state.js';
import { esc, header, icon, toast } from '../ui.js';
import { formatNumber, nextNumber, getBook, findByIsbn, normalizeIsbn } from '../modules/books.js';
import { formatLocation, cleanLines } from '../modules/location.js';

function cleanFields(data, location) {
  const out = {};
  for (const [k, v] of Object.entries(data)) out[k] = String(v ?? '').replace(/\s+/g, ' ').trim();
  out.isbn = normalizeIsbn(out.isbn);
  out.location = cleanLines(location);
  return out;
}
import { createLocationEditor } from '../components/locationEditor.js';

const FIELDS = [
  { key: 'title', label: 'Kitap adı', wide: true },
  { key: 'author', label: 'Yazar', wide: true },
  { key: 'publisher', label: 'Yayınevi' },
  { key: 'year', label: 'Yıl', numeric: true, max: 4 },
  { key: 'pages', label: 'Sayfa sayısı', numeric: true, max: 5 },
  { key: 'isbn', label: 'ISBN', numeric: true, max: 17 },
];

function field(f, value) {
  return `<div class="field-wrap ${f.wide ? 'wide' : ''}">
    <label class="field-label" for="f-${f.key}">${f.label}</label>
    <input class="field" id="f-${f.key}" name="${f.key}" value="${esc(value)}"
      ${f.numeric ? 'inputmode="numeric"' : ''} maxlength="${f.max ?? 200}" autocomplete="off">
  </div>`;
}

export function render({ params, query }) {
  const editing = params.number != null;
  const book = editing ? getBook(state.books, params.number) : null;
  if (editing && !book) {
    return `<section class="screen">${header('Kitap bulunamadı', '#/')}
      <div class="pad"><p>Bu numarada kayıtlı kitap yok.</p><a class="btn btn-secondary" href="#/">Kütüphaneye dön</a></div></section>`;
  }

  const isbn = editing ? book.isbn : normalizeIsbn(query.get('isbn'));
  const number = editing ? book.number : nextNumber(state.books);
  const values = editing ? book : { isbn };
  const location = editing ? book.location : state.location;
  const dupes = editing ? [] : findByIsbn(state.books, isbn);

  return `
  <section class="screen">
    ${header(editing ? 'Kitap bilgileri' : 'Yeni kitap', editing ? '#/' : '#/okut')}
    <form class="scroll pad stack-14" id="book-form" novalidate>
      <div class="number-card">
        <div>
          <span class="number-label">${editing ? 'Numarası' : 'Verilecek numara'}</span>
          <span class="number-value">${formatNumber(number)}</span>
        </div>
        ${editing ? '' : '<span class="number-note">Kitabın etiketine<br>bu numara basılır</span>'}
      </div>
      ${dupes.length ? `<p class="warn">Bu ISBN'li bir kitap zaten var (No. ${dupes.map((d) => formatNumber(d.number)).join(', ')}). İkinci kopyaysa yine de kaydedebilirsin.</p>` : ''}
      <div class="field-grid">${FIELDS.map((f) => field(f, values[f.key])).join('')}</div>
      <p class="error" id="form-error" hidden></p>
      <div class="loc-card">
        <div class="loc-card-head">
          ${icon.pin}
          <span class="loc-strip-text">
            <span class="loc-strip-label">Yeri</span>
            <span class="loc-strip-value" id="loc-value">${location ? esc(formatLocation(location)) : 'Yer belirtilmedi'}</span>
          </span>
          <button type="button" class="link-btn" data-action="toggle-loc">Değiştir</button>
        </div>
        <div id="loc-editor" hidden></div>
      </div>
    </form>
    <footer class="actions">
      <button type="submit" form="book-form" class="btn btn-primary">${editing ? 'Kaydet' : 'Kaydet ve numarala'}</button>
      <a class="btn btn-ghost" href="${editing ? '#/' : '#/okut'}">${editing ? 'Vazgeç' : 'Vazgeç, başka kitap okut'}</a>
    </footer>
  </section>`;
}

export function mount(root, { params, go }) {
  const form = root.querySelector('#book-form');
  if (!form) return;
  const editing = params.number != null;
  const book = editing ? getBook(state.books, params.number) : null;
  let location = editing ? book.location : state.location;
  let editor = null;
  let saving = false;

  const locBox = root.querySelector('#loc-editor');
  const locValue = root.querySelector('#loc-value');
  root.querySelector('[data-action="toggle-loc"]').addEventListener('click', (e) => {
    if (!editor) {
      editor = createLocationEditor(locBox, location, {
        onChange: (rows) => { locValue.textContent = formatLocation(rows) || 'Yer belirtilmedi'; },
      });
    }
    locBox.hidden = !locBox.hidden;
    e.currentTarget.textContent = locBox.hidden ? 'Değiştir' : 'Tamam';
  });

  form.addEventListener('input', () => { root.querySelector('#form-error').hidden = true; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saving) return; // çift dokunuşta iki kez kaydetme
    const data = Object.fromEntries(new FormData(form).entries());
    const err = root.querySelector('#form-error');
    if (!data.title?.trim()) {
      err.textContent = 'Kitap adını yazmadan kaydedemezsin.';
      err.hidden = false;
      root.querySelector('#f-title').focus();
      return;
    }
    saving = true;
    if (editor) location = editor.getLines();
    if (editing) {
      await editBook(book.number, cleanFields(data, location));
      toast(`${formatNumber(book.number)} güncellendi`);
      go('#/');
    } else {
      const saved = await saveNewBook(data, location);
      toast(`${formatNumber(saved.number)} numarasıyla kaydedildi`);
      go('#/okut');
    }
  });
}
