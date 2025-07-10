import { info } from "./logger";

type Entry<T> = { value: T; ts: number };

export function withCache<T>(ttlMs: number, fn: () => Promise<T>) {
    let entry: Entry<T> | null = null;

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