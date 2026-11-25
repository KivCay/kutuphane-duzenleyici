// Uygulamanın tek durum kaynağı. Ekranlar veriyi buradan okur, değişiklikleri buradaki
// eylemlerle yapar; her eylem veriyi hemen telefona kaydeder.
import * as storage from './modules/storage.js';
import { addBook, updateBook, deleteBook, undeleteBook, removeFromLibrary, restoreToLibrary, lendBook, returnBook } from './modules/books.js';
import { cleanLines, pushRecent } from './modules/location.js';

export const state = {
  books: [],
  location: null, // aktif yer (satır listesi) ya da null
  recents: [],
  settings: {},
  lastNumber: 0, // verilmiş en büyük numara
  ready: false,
};

export async function init() {
  const [books, location, recents, settings, lastNumber] = await Promise.all([
    storage.loadBooks(),
    storage.loadActiveLocation(),
    storage.loadRecentLocations(),
    storage.loadSettings(),
    storage.loadLastNumber(),
  ]);
  state.lastNumber = Math.max(lastNumber, ...books.map((b) => b.number || 0), 0);
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
  const { books, book } = addBook(state.books, fields, location, new Date(), state.lastNumber);
  state.books = books;
  state.lastNumber = book.number;
  await storage.saveBooks(books);
  await storage.saveLastNumber(state.lastNumber);
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

async function commit(books) {
  state.books = books;
  await storage.saveBooks(books);
}

/** Kalıcı sil. Geri almak için silinen kitabı döner. Numara boş kalır. */
export async function deleteForever(number) {
  const { books, removed } = deleteBook(state.books, number);
  await commit(books);
  return removed;
}

export async function undoDelete(book) {
  await commit(undeleteBook(state.books, book));
}

export async function removeBook(number, reason, note) {
  await commit(removeFromLibrary(state.books, number, { reason, note }));
}

export async function restoreBook(number) {
  await commit(restoreToLibrary(state.books, number));
}

export async function lend(number, to, note) {
  await commit(lendBook(state.books, number, { to, note }));
}

export async function giveBack(number) {
  await commit(returnBook(state.books, number));
}

/** "Baştan başla": bütün kitapları siler, numaralamayı 0001'e döndürür. Yer ve ayarlar kalır. */
export async function resetLibrary() {
  state.books = [];
  state.lastNumber = 0;
  await storage.saveBooks([]);
  await storage.saveLastNumber(0);
}
