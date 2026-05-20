const TTL_MS = 60_000;

interface Entry {
  slots: string[];
  expiresAt: number;
}

const store = new Map<string, Entry>();

export const slotCache = {
  get(key: string): string[] | undefined {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return undefined;
    }
    return entry.slots;
  },
  set(key: string, slots: string[]): void {
    store.set(key, { slots, expiresAt: Date.now() + TTL_MS });
  },
  clear(): void {
    store.clear();
  },
};
