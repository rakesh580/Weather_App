/** localStorage that never throws (private mode, quota, disabled storage). */
export const safeStorage = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* ignore quota / disabled storage */ }
  },
  remove(key: string): void {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
  getJSON<T>(key: string, fallback: T): T {
    const raw = safeStorage.get(key);
    if (raw == null) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  },
  setJSON(key: string, value: unknown): void {
    safeStorage.set(key, JSON.stringify(value));
  },
};
