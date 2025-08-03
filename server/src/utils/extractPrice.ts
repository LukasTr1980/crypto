import type { KrakenTicker } from "../types";

export function extractPrice(ticker?: KrakenTicker | null): number | null {
    if (!ticker) return null;

    const toNum = (tuple?: [string, string]): number =>
        parseFloat(tuple?.[0] ?? '0');

    const last = toNum(ticker.c);
    if (last > 0) return last;

    const ask = toNum(ticker.a);
    const bid = toNum(ticker.b);

    if (ask > 0 && bid > 0) return (ask + bid) /2;
    if (ask > 0) return ask;
    if (bid > 0) return bid;

    return null;
}