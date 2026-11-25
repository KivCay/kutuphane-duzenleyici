// Kitap bilgisi kaynaklarından (Google Books, Open Library) gelen yanıtları tek bir biçime çevirir
// ve birleştirir. Hem sunucu fonksiyonu (api/kitap.js) hem testler bunu kullanır.

const FIELDS = ['title', 'author', 'others', 'publisher', 'year', 'pages'];

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

/** Google Books "volumes?q=isbn:" yanıtı -> alanlar (ISBN gerçekten eşleşmiyorsa null). */
export function fromGoogle(json, isbn) {
  const items = json?.items ?? [];
  const match = items.find((it) =>
    (it.volumeInfo?.industryIdentifiers ?? []).some((id) => clean(id.identifier).replace(/-/g, '') === isbn),
  ) ?? (items.length === 1 ? items[0] : null);
  const v = match?.volumeInfo;
  if (!v) return null;
  return {
    title: clean(v.title),
    ...splitPeople(v.authors),
    publisher: clean(v.publisher),
    year: yearOf(v.publishedDate),
    pages: pagesOf(v.pageCount),
  };
}

/** Open Library "api/books?jscmd=data" yanıtı -> alanlar. */
export function fromOpenLibrary(json, isbn) {
  const d = json?.[`ISBN:${isbn}`];
  if (!d) return null;
  return {
    title: clean(d.title),
    ...splitPeople((d.authors ?? []).map((a) => a.name)),
    publisher: clean((d.publishers ?? []).map((p) => p.name).join(', ')),
    year: yearOf(d.publish_date),
    pages: pagesOf(d.number_of_pages),
  };
}

/** Kaynakları öncelik sırasıyla birleştirir: her alan için ilk dolu değer alınır. */
export function mergeSources(sources) {
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
  return result;
}
