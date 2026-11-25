// 4 · Kitap kartı: yeni kitabı kaydetme (#/yeni) ve kayıtlı kitabı düzenleme (#/kitap/N).
import { state, saveNewBook, editBook } from '../state.js';
import { esc, header, icon, toast } from '../ui.js';
import { formatNumber, nextNumber, getBook, findByIsbn, normalizeIsbn, isValidIsbn } from '../modules/books.js';
import { formatLocation, cleanLines } from '../modules/location.js';
import { createLocationEditor } from '../components/locationEditor.js';
import { lookupIsbn } from '../modules/lookup.js';

const LOOKUP_FIELDS = ['title', 'subtitle', 'author', 'others', 'publisher', 'year', 'pages', 'genre', 'language'];
const OPTIONAL = new Set(['others', 'subtitle']); // bulunamazsa turuncu yapılmaz

function cleanFields(data, location) {
  const out = {};
  for (const [k, v] of Object.entries(data)) out[k] = String(v ?? '').replace(/\s+/g, ' ').trim();
  out.isbn = normalizeIsbn(out.isbn);
  out.location = cleanLines(location);
  return out;
}

const FIELDS = [
  { key: 'title', label: 'Kitap adı', wide: true },
  { key: 'subtitle', label: 'Alt başlık', wide: true },
  { key: 'author', label: 'Yazar', wide: true },
  { key: 'others', label: 'Çevirmen / diğer adlar', wide: true, hint: 'İnternetten gelen bilgilerde çevirmen ve yazar ayrılmıyor: ilk ad yazar kabul edildi, kalanlar buraya yazıldı. Yanlışsa düzelt.' },
  { key: 'publisher', label: 'Yayınevi' },
  { key: 'year', label: 'Yıl', numeric: true, max: 4 },
  { key: 'pages', label: 'Sayfa sayısı', numeric: true, max: 5 },
  { key: 'isbn', label: 'ISBN', numeric: true, max: 17 },
  { key: 'genre', label: 'Tür', max: 40 },
  { key: 'language', label: 'Dil', max: 30 },
];

function field(f, value) {
  return `<div class="field-wrap ${f.wide ? 'wide' : ''}">
    <label class="field-label" for="f-${f.key}">${f.label}</label>
    <input class="field" id="f-${f.key}" name="${f.key}" value="${esc(value)}"
      ${f.numeric ? 'inputmode="numeric"' : ''} maxlength="${f.max ?? 200}" autocomplete="off"
      aria-describedby="err-${f.key}">
    ${f.hint ? `<p class="field-hint" id="hint-${f.key}" hidden>${esc(f.hint)}</p>` : ''}
    <p class="field-error" id="err-${f.key}" role="alert" hidden></p>
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
      ${dupes.length ? `<p class="note">${icon.info}<span><strong>Bilgi:</strong> Bu kitap listende zaten var (No. ${dupes.map((d) => formatNumber(d.number)).join(', ')}). İkinci kopyaysa kaydetmeye devam edebilirsin.</span></p>` : ''}
      ${!editing && isValidIsbn(isbn) ? `<p class="lookup" id="lookup" role="status"><span class="spinner" aria-hidden="true"></span><span id="lookup-text">Kitap bilgileri internette aranıyor…</span></p>` : ''}
      <div class="field-grid">${FIELDS.map((f) => field(f, values[f.key])).join('')}</div>
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

export function mount(root, { params, query, go }) {
  const form = root.querySelector('#book-form');
  if (!form) return;
  const editing = params.number != null;
  const book = editing ? getBook(state.books, params.number) : null;
  let location = editing ? book.location : state.location;
  let editor = null;
  let saving = false;

  if (!editing && root.querySelector('#lookup')) fillFromInternet(root, normalizeIsbn(query.get('isbn')));

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

  // Hata mesajı, sorunlu kutunun hemen altında görünür; o kutuya yazmaya başlayınca kaybolur.
  function showFieldError(key, message) {
    const input = root.querySelector(`#f-${key}`);
    const msg = root.querySelector(`#err-${key}`);
    msg.textContent = message;
    msg.hidden = false;
    input.classList.add('invalid');
    input.setAttribute('aria-invalid', 'true');
    input.scrollIntoView({ block: 'center', behavior: 'smooth' });
    input.focus({ preventScroll: true });
  }

  form.addEventListener('input', (e) => {
    const key = e.target.name;
    if (!key) return;
    const msg = root.querySelector(`#err-${key}`);
    if (msg) msg.hidden = true;
    e.target.classList.remove('invalid', 'missing', 'loading');
    e.target.removeAttribute('aria-invalid');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saving) return; // çift dokunuşta iki kez kaydetme
    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.title?.trim()) {
      showFieldError('title', 'Kitap adını yazmadan kaydedemezsin.');
      return;
    }
    if (data.isbn?.trim() && !isValidIsbn(data.isbn)) {
      showFieldError('isbn', 'Bu ISBN geçerli görünmüyor. Rakamları kontrol et ya da kutuyu boşalt.');
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
      go(saved.isbn ? `#/okut?son=${saved.isbn}` : '#/okut');
    }
  });
}

// İnternetten bilgileri bulur ve yalnızca kullanıcının henüz doldurmadığı kutulara yazar.
async function fillFromInternet(root, isbn) {
  const inputs = Object.fromEntries(LOOKUP_FIELDS.map((k) => [k, root.querySelector(`#f-${k}`)]));
  const box = root.querySelector('#lookup');
  const text = root.querySelector('#lookup-text');
  LOOKUP_FIELDS.forEach((k) => { if (!inputs[k].value && !OPTIONAL.has(k)) inputs[k].classList.add('loading'); });

  const result = await lookupIsbn(isbn);
  if (!root.isConnected || !box.isConnected) return; // kullanıcı bu arada başka ekrana geçti

  LOOKUP_FIELDS.forEach((k) => inputs[k].classList.remove('loading'));
  box.querySelector('.spinner')?.remove();

  if (result.status === 'bulundu') {
    const missing = [];
    for (const k of LOOKUP_FIELDS) {
      const el = inputs[k];
      const v = result.fields?.[k] ?? '';
      if (!el.value && v) {
        el.value = v;
        if (k === 'others') root.querySelector('#hint-others').hidden = false;
      }
      if (!el.value && !OPTIONAL.has(k)) { el.classList.add('missing'); el.placeholder = 'Bulunamadı'; missing.push(k); }
    }
    box.classList.add('ok');
    text.textContent = missing.length
      ? `Bilgiler bulundu (${result.sources.join(', ')}). Turuncu kutular bulunamadı; istersen elle yaz.`
      : `Bilgiler bulundu (${result.sources.join(', ')}). Kontrol edip kaydet.`;
    return;
  }

  box.classList.add('miss');
  LOOKUP_FIELDS.forEach((k) => { if (!inputs[k].value && !OPTIONAL.has(k)) inputs[k].classList.add('missing'); });
  text.textContent = {
    bulunamadi: 'Bu kitap internette bulunamadı. Bilgileri elle yaz.',
    cevrimdisi: 'İnternet bağlantısı yok. Bilgileri elle yaz; kitap yine kaydedilir.',
    'zaman-asimi': 'Arama çok uzun sürdü. Bilgileri elle yaz ya da geri dönüp tekrar okut.',
  }[result.status] ?? 'Bilgiler şu an getirilemedi. Elle yazabilirsin.';
}
