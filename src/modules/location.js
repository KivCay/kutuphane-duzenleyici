// Yer bilgisi: kullanıcının istediği kadar satırdan oluşur (oda › dolap › raf › bölüm …).

export const SEPARATOR = ' › ';
const MAX_RECENTS = 5;

/** Boş satırları atar, kenar boşluklarını temizler. Hiç satır kalmazsa null döner. */
export function cleanLines(lines) {
  if (!Array.isArray(lines)) return null;
  const cleaned = lines.map((l) => String(l ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  return cleaned.length ? cleaned : null;
}

/** ["Çalışma odası", "2. dolap"] -> "Çalışma odası › 2. dolap" */
export function formatLocation(lines) {
  const c = cleanLines(lines);
  return c ? c.join(SEPARATOR) : '';
}

/** Son kullanılan yerler listesinin başına ekler; aynısı varsa tekrar etmez. */
export function pushRecent(recents, lines) {
  const c = cleanLines(lines);
  if (!c) return recents ?? [];
  const key = formatLocation(c).toLocaleLowerCase('tr');
  const rest = (recents ?? []).filter((r) => formatLocation(r).toLocaleLowerCase('tr') !== key);
  return [c, ...rest].slice(0, MAX_RECENTS);
}

export const ROW_HINTS = ['Oda (ör. Salon)', 'Dolap / kitaplık', 'Raf', 'Bölüm (ör. Tarih)'];
