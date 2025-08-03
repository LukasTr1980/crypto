import { info } from "./logger";
import { type CacheEntry } from "../types";

export function withCache<T>(ttlMs: number, fn: () => Promise<T>) {
    let entry: CacheEntry<T> | null = null;

    return async (): Promise<T & { cached: boolean }> => {
        const now = Date.now();

        if (entry && now - entry.ts < ttlMs) {
            info('[Cache] HIT');
            return { ...entry.value, cached: true }
        }

        info('[Cache] MISS');
        const fresh = await fn();
        entry = { value: fresh, ts: now };
        return { ...fresh, cached: false };
    };
}