const ALT_MAP: Record<string, string> = {
    'XXBTZEUR': 'BTC/EUR',
    'XBTEUR': 'BTC/EUR',
};

export function mapKrakenAsset(code: string): string {
    if (code.toUpperCase().includes('EUR')) return 'EUR';
    if (/^[XZ]/.test(code) && code.length > 3) code = code.slice(1);
    return ALT_MAP[code.split('.')[0]] ?? code.split('.')[0];
}