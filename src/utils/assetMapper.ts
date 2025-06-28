const ALT_MAP: Record<string, string> = {
    XBT: 'BTC',
    XXBT: 'BTC',
    XDG: 'DOGE',
    XXDG: 'DOGE',
    XETH: 'ETH',
    XETC: 'ETC',
};

export function mapKrakenAsset(code: string): string {
    code = code.replace(/Z?EUR$/i, '');

    if (/^[XZ]/.test(code) && code.length > 3) code = code.slice(1);
    
    return ALT_MAP[code] ?? code;
}