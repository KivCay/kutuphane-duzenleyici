// Özet ekranının sayıları (Basic: yalnızca temel sayılar). Ekrandan bağımsız, test edilebilir.
import { isActive } from './books.js';

export function basicStats(books, now = new Date()) {
  const all = books ?? [];
  const active = all.filter(isActive);
  const ym = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${d.getMonth()}`; };
  const thisMonth = `${now.getFullYear()}-${now.getMonth()}`;
  return {
    inLibrary: active.length,
    totalAdded: all.length, // silinenler hariç, çıkarılanlar dahil
    addedThisMonth: all.filter((b) => ym(b.addedAt) === thisMonth).length,
    removed: all.length - active.length,
    onLoan: active.filter((b) => b.loan).length,
    loansTotal: all.reduce((n, b) => n + (b.loanHistory?.length ?? 0) + (b.loan ? 1 : 0), 0),
    coverPending: active.filter((b) => !b.labelPrinted?.cover).length,
    spinePending: active.filter((b) => !b.labelPrinted?.spine).length,
  };
}
