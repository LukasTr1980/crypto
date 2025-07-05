const PAIR_MAP: Record<string, string> = {
    'XXBTZEUR': 'BTC/EUR',
    'XBTEUR': 'BTC/EUR',
    'XETHZEUR': 'ETH/EUR',
    'ETHEUR': 'ETH/EUR'
};

export function mapPair(rawPair: string): string {
    return PAIR_MAP[rawPair] ?? rawPair;
}