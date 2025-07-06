export function extractPrice(t: any): number | null {
    if (!t) return null;

    const last = parseFloat(t.c?.[0] ?? '0');
    if (last > 0) return last;

    const ask = parseFloat(t.a?.[0] ?? '0');
    const bid = parseFloat(t.b?.[0] ?? '0');

    if (ask > 0 && bid > 0) return (ask + bid) /2;
    if (ask > 0) return ask;
    if (bid > 0) return bid;

    return null;
}