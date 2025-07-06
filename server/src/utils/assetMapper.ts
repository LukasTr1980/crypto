const ALT_MAP: Record<string, string> = {
    'XXBT' : 'BTC',
    'XBT' : 'BTC',
    'XDG' : 'DOGE'
};

export function getTickerBase(code: string): string {
    if(/^[XZ]/.test(code) && code.length > 3) {
        return code.slice(1).split('.')[0];
    }
    return code.split('.')[0];
}

export function mapKrakenAsset(code: string): string {
    if (code.toUpperCase().includes('EUR')) return 'EUR';
    const base = getTickerBase(code);
    return ALT_MAP[base] ?? base;
}