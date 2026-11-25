// Telefonda kalıcı saklama. Tarayıcının IndexedDB'sini kullanır (idb-keyval sarmalayıcısı).
// Bu modülün dışındaki hiçbir kod veriyi nasıl sakladığımızı bilmez; ileride hesap/bulut
// eklenirse yalnızca bu dosya değişir.
import { get, set, createStore } from 'idb-keyval';

const store = createStore('kutuphane-duzenleyici', 'veri');

const KEYS = {
  books: 'kitaplar',
  location: 'aktif-yer',
  recents: 'son-yerler',
  settings: 'ayarlar',
};

export async function loadBooks() {
  return (await get(KEYS.books, store)) ?? [];
}

export async function saveBooks(books) {
  await set(KEYS.books, books, store);
}

// Aktif yer: satır listesi (["Çalışma odası", "2. dolap"]) ya da null (yer belirtilmedi).
export async function loadActiveLocation() {
  return (await get(KEYS.location, store)) ?? null;
}

export async function saveActiveLocation(lines) {
  await set(KEYS.location, lines, store);
}

export async function loadRecentLocations() {
  return (await get(KEYS.recents, store)) ?? [];
}

export async function saveRecentLocations(list) {
  await set(KEYS.recents, list, store);
}

// Küçük ayarlar (ör. etikette görünecek kütüphane adı).
export async function loadSettings() {
  return (await get(KEYS.settings, store)) ?? {};
}

export async function saveSettings(settings) {
  await set(KEYS.settings, settings, store);
}
