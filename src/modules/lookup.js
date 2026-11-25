// Telefondan kendi sunucu fonksiyonumuza (/api/kitap) sorar. İnternet yoksa ya da yanıt
// gecikirse anlaşılır bir durum kodu döner; ekran buna göre "elle yaz" der.

const TIMEOUT_MS = 10000;

export async function lookupIsbn(isbn, { fetchImpl = fetch } = {}) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { status: 'cevrimdisi' };
  try {
    const res = await fetchImpl(`/api/kitap?isbn=${encodeURIComponent(isbn)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { status: 'hata' };
    const data = await res.json();
    return data.found ? { status: 'bulundu', ...data } : { status: 'bulunamadi', ...data };
  } catch (e) {
    return { status: e?.name === 'TimeoutError' ? 'zaman-asimi' : 'cevrimdisi' };
  }
}
