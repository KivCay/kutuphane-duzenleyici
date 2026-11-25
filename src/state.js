// Uygulamanın tek durum kaynağı. Ekranlar veriyi buradan okur, değişiklikleri buradaki
// eylemlerle yapar; her eylem veriyi hemen telefona kaydeder.
import * as storage from './modules/storage.js';
import { addBook, updateBook } from './modules/books.js';
import { cleanLines, pushRecent } from './modules/location.js';

export const state = {
  books: [],
  location: null, // aktif yer (satır listesi) ya da null
  recents: [],
  settings: {},
  ready: false,
};

export async function init() {
  const [books, location, recents, settings] = await Promise.all([
    storage.loadBooks(),
    storage.loadActiveLocation(),
    storage.loadRecentLocations(),
    storage.loadSettings(),
  ]);
  state.settings = settings;
  state.books = books;
  state.location = location;
  state.recents = recents;
  state.ready = true;
}

export async function setActiveLocation(lines) {
  const cleaned = cleanLines(lines);
  state.location = cleaned;
  await storage.saveActiveLocation(cleaned);
  if (cleaned) {
    state.recents = pushRecent(state.recents, cleaned);
    await storage.saveRecentLocations(state.recents);
  }
}

export async function saveNewBook(fields, location) {
  const { books, book } = addBook(state.books, fields, location);
  state.books = books;
  await storage.saveBooks(books);
  return book;
}

export async function editBook(number, patch) {
  state.books = updateBook(state.books, number, patch);
  await storage.saveBooks(state.books);
  if (patch.location) {
    state.recents = pushRecent(state.recents, patch.location);
    await storage.saveRecentLocations(state.recents);
  }
}

export async function updateSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  await storage.saveSettings(state.settings);
}

/** kind: 'cover' | 'spine'. Seçilen kitapların o etiketini "basıldı" olarak işaretler. */
export async function markLabelsPrinted(numbers, kind) {
  const set = new Set(numbers);
  state.books = state.books.map((b) => (set.has(b.number)
    ? { ...b, labelPrinted: { cover: false, spine: false, ...b.labelPrinted, [kind]: true } }
    : b));
  await storage.saveBooks(state.books);
}
