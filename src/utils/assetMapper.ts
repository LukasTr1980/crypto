const ALT_MAP: Record<string, string> = {
    XBT: 'BTC',
    XXBT: 'BTC',
    XDG: 'DOGE',
    XXDG: 'DOGE',
    XETH: 'ETH',
    XETC: 'ETC',
};

export function mapKrakenAsset(code: string): string {
    code = code.split('.')[0];
    code = code.replace(/Z?EUR$/i, '');
    if (/^[XZ]/.test(code) && code.length > 3) code = code.slice(1);
    return ALT_MAP[code] ?? code;
}

export function krakenPair(asset: string): string | null {
    switch (asset) {
        case 'BTC': return 'XXBTZEUR';
        case 'DOGE': return 'XDGEUR';
        case 'ETH': return 'XETHZEUR';
        case 'ETC': return 'XETCEUR';
        case 'SOL': return 'SOLEUR';
        case 'PEPE': return 'PEPEEUR';
        case 'USDG': return null;
        default: return `${asset}EUR`;
    }
}

export function getPublicTickerPair(asset: string): string | null {
    switch (asset) {
        case 'BTC': return 'XBTEUR';
        case 'ETH': return 'ETHEUR';
        case 'DOGE': return 'DOGEEUR';
        case 'ETC': return 'ETCEUR';
        case 'SOL': return 'SOLEUR';
        case 'PEPE': return 'PEPEEUR';
        case 'USD': return 'EURUSD';
        case 'EUR': return null;
        case 'USDG': return null;

        default: return `${asset}EUR`;
    }
}

const PUBLIC_PAIR_TO_ASSET_MAP: Record<string, string> = {
    'XBTEUR': 'BTC',
    'ETHEUR': 'ETH',
    'DOGEEUR': 'DOGE',
    'ETCEUR': 'ETC',
    'SOLEUR': 'SOL',
    'PEPEEUR': 'PEPE',
    'USDEUR': 'USD',
};

export function mapPublicPairToAsset(publicPair: string): string {
    return PUBLIC_PAIR_TO_ASSET_MAP[publicPair] ?? publicPair.replace('EUR', '');
}