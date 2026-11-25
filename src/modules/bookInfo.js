// Kitap bilgisi kaynaklarından (Google Books, Open Library) gelen yanıtları tek bir biçime çevirir
// ve birleştirir. Hem sunucu fonksiyonu (api/kitap.js) hem testler bunu kullanır.

const FIELDS = ['title', 'subtitle', 'author', 'others', 'publisher', 'year', 'pages', 'genre', 'language'];

/**
 * Kaynaklar çevirmeni, editörü ve ek yazarları aynı "authors" listesine koyuyor; hangisinin
 * çevirmen olduğunu söylemiyor. Bu yüzden ilk ad yazar sayılır, kalanlar "others" alanına gider.
 */
function splitPeople(names) {
  const list = (names ?? []).map(clean).filter(Boolean);
  return { author: list[0] ?? '', others: list.slice(1).join(', ') };
}

function clean(v) {
  return String(v ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

function yearOf(dateText) {
  const m = String(dateText ?? '').match(/\b(1[5-9]\d{2}|20\d{2})\b/);
  return m ? m[1] : '';
}

function pagesOf(n) {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 && v < 20000 ? String(Math.round(v)) : '';
}

/** Alt başlık ayrı gelmemişse "Ana başlık: Alt başlık" biçimindeki adı ikiye böler. */
function titleParts(title, subtitle) {
  const t = clean(title);
  const s = clean(subtitle);
  if (s) return { title: t, subtitle: s };
  const m = t.match(/^(.{2,}?)\s*:\s+(.{2,})$/);
  return m ? { title: m[1], subtitle: m[2] } : { title: t, subtitle: '' };
}

// Kaynakların İngilizce tür/konu etiketleri -> Türkçe tür. Sıra önemli: özelden genele.
const GENRES = [
  [/science fiction/, 'Bilimkurgu'], [/fantasy/, 'Fantastik'],
  [/mystery|detective|thriller|suspense|crime fiction/, 'Polisiye'],
  [/graphic novel|comic/, 'Çizgi Roman'], [/short stor/, 'Öykü'],
  [/biograph|autobiograph|memoir/, 'Biyografi'],
  [/poetry|poems/, 'Şiir'], [/drama|plays/, 'Tiyatro'],
  [/literary criticism/, 'Edebiyat İncelemesi'],
  [/juvenile|children/, 'Çocuk'], [/young adult/, 'Gençlik'],
  [/fiction|novel/, 'Roman'],
  [/business|economic|management|finance|investing|entrepreneur/, 'İş ve Ekonomi'],
  [/self-help|personal development/, 'Kişisel Gelişim'],
  [/psycholog/, 'Psikoloji'], [/philosoph/, 'Felsefe'], [/religio|theolog|islam|christian/, 'Din'],
  [/political|politics|government/, 'Siyaset'], [/history|historical/, 'Tarih'],
  [/social science|sociolog|anthropolog/, 'Sosyal Bilimler'],
  [/law\b|legal/, 'Hukuk'], [/education/, 'Eğitim'],
  [/computer|technology|engineering/, 'Teknoloji'], [/mathemat/, 'Matematik'],
  [/medic|health/, 'Sağlık'], [/nature|environment/, 'Doğa'], [/science/, 'Bilim'],
  [/architecture/, 'Mimarlık'], [/photograph/, 'Fotoğraf'], [/music/, 'Müzik'], [/art\b|arts\b/, 'Sanat'],
  [/cook|food/, 'Yemek'], [/travel/, 'Gezi'], [/sport/, 'Spor'], [/humor/, 'Mizah'],
  [/language|linguistic/, 'Dil'], [/reference|dictionar/, 'Başvuru'],
];

/**
 * Etiketler arasında listede en önce gelen (en özel) türü seçer: ["Businessmen", "Biography"] -> Biyografi.
 * Hiçbiri tanınmazsa boş (yanlış tür yazmaktansa boş bırak).
 */
export function genreOf(labels) {
  const ls = (labels ?? []).map((x) => clean(x).toLowerCase()).filter(Boolean);
  for (const [re, tr] of GENRES) if (ls.some((l) => re.test(l))) return tr;
  return '';
}

const LANGUAGES = {
  tr: 'Türkçe', en: 'İngilizce', de: 'Almanca', fr: 'Fransızca', es: 'İspanyolca', it: 'İtalyanca',
  ru: 'Rusça', ar: 'Arapça', fa: 'Farsça', el: 'Yunanca', ja: 'Japonca', zh: 'Çince', ku: 'Kürtçe',
  az: 'Azerice', nl: 'Felemenkçe', pt: 'Portekizce', la: 'Latince', ota: 'Osmanlıca',
  tur: 'Türkçe', eng: 'İngilizce', ger: 'Almanca', fre: 'Fransızca', spa: 'İspanyolca', ita: 'İtalyanca', rus: 'Rusça', ara: 'Arapça', per: 'Farsça',
};

export function languageOf(code) {
  const c = clean(code).toLowerCase().split(/[-_]/)[0];
  if (!c) return '';
  return LANGUAGES[c] ?? c.toUpperCase();
}

/** Google Books "volumes?q=isbn:" yanıtı -> alanlar (ISBN gerçekten eşleşmiyorsa null). */
export function fromGoogle(json, isbn) {
  const items = json?.items ?? [];
  const match = items.find((it) =>
    (it.volumeInfo?.industryIdentifiers ?? []).some((id) => clean(id.identifier).replace(/-/g, '') === isbn),
  ) ?? (items.length === 1 ? items[0] : null);
  const v = match?.volumeInfo;
  if (!v) return null;
  return {
    ...titleParts(v.title, v.subtitle),
    ...splitPeople(v.authors),
    publisher: clean(v.publisher),
    year: yearOf(v.publishedDate),
    pages: pagesOf(v.pageCount),
    genre: genreOf([...(v.categories ?? []), v.mainCategory].filter(Boolean)),
    language: languageOf(v.language),
  };
}

/** Open Library "api/books?jscmd=data" yanıtı -> alanlar. */
export function fromOpenLibrary(json, isbn) {
  const d = json?.[`ISBN:${isbn}`];
  if (!d) return null;
  return {
    ...titleParts(d.title, d.subtitle),
    ...splitPeople((d.authors ?? []).map((a) => a.name)),
    publisher: clean((d.publishers ?? []).map((p) => p.name).join(', ')),
    year: yearOf(d.publish_date),
    pages: pagesOf(d.number_of_pages),
    genre: genreOf((d.subjects ?? []).map((s) => s.name)),
    language: '',
  };
}

/** Türkiye'nin ISBN grupları (975, 605, 625): kaynaklar dili vermezse Türkçe varsayılır. */
function turkishIsbn(isbn) {
  return /^978(975|605|625)/.test(String(isbn ?? ''));
}

/** Kaynakları öncelik sırasıyla birleştirir: her alan için ilk dolu değer alınır. */
export function mergeSources(sources, isbn) {
  const result = { found: false, fields: {}, sources: [] };
  for (const { name, data } of sources) {
    if (!data) continue;
    let used = false;
    for (const f of FIELDS) {
      if (f === 'others') continue; // yazarla aynı kaynaktan alınır (aşağıda)
      if (!result.fields[f] && data[f]) {
        result.fields[f] = data[f];
        used = true;
        if (f === 'author') result.fields.others = data.others ?? '';
      }
    }
    if (used) result.sources.push(name);
  }
  result.found = Boolean(result.fields.title);
  for (const f of FIELDS) result.fields[f] ??= '';
  if (result.found && !result.fields.language && turkishIsbn(isbn)) result.fields.language = 'Türkçe';
  return result;
}
