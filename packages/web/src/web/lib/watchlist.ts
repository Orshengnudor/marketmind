// Watchlist — localStorage-persisted coin IDs

const KEY = "mm_watchlist";

export function getWatchlist(): number[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function toggleWatchlist(id: number): number[] {
  const list = getWatchlist();
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function isWatched(id: number): boolean {
  return getWatchlist().includes(id);
}
