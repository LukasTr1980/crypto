import { info } from "./utils/logger";
import { mapKrakenAsset } from "./utils/assetMapper";

export interface AssetValue {
    asset: string;
    balance: number;
    priceInEur: number;
    eurValue: number;
}

function findEurPriceTicker(code: string, marketPrices: Record<string, any>): any | null {
    const base = code.toUpperCase();

    const variants = [
        `${code}EUR`,
        `${code}ZEUR`,
        `X${code}EUR`,
        `X${code}ZEUR`
    ];

    if (base === 'BTC') {
        variants.push('XBTEUR', 'XXBTZEUR', 'XBTZEUR', 'XXBTEUR');
    }

    const pair = variants.find(v => marketPrices[v]);
    return pair ? marketPrices[pair] : null;
}

export function calculateAssetsValue(
    accountBalance: Record<string, { balance: string }>,
    marketPrices: Record<string, any>
): AssetValue[] {

    info('[Calculations] Calculating value for all assets...');

    const assets: AssetValue[] = [];

    for (const [rawCode, data] of Object.entries(accountBalance)) {
        const balance = parseFloat(data.balance);
        const baseCode = mapKrakenAsset(rawCode);

        if (balance === 0 || baseCode === 'EUR') continue;

        const ticker = findEurPriceTicker(baseCode, marketPrices);
        if (!ticker) {
            info(`[Calculations] No EUR price for ${rawCode} (-> ${baseCode})`);
            continue;
        }

        const priceInEur = parseFloat(ticker.c[0]);
        assets.push({
            asset: baseCode,
            balance,
            priceInEur,
            eurValue: balance * priceInEur,
        });
    }

    return assets.sort((a, b) => b.eurValue - a.eurValue);
}