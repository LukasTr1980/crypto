import { info } from "./utils/logger";
import { mapKrakenAsset } from "./utils/assetMapper";
import { extractPrice } from "./utils/extractPrice";

export interface AssetValue {
    asset: string;
    balance: number;
    priceInEur: number;
    eurValue: number;
}

export interface CalculatedPortfolio {
    assets: AssetValue[];
    totalValueEur: number;
}

function usdToEur(prices: Record<string, any>): number | null {
    const pairs = ['EURUSD', 'USDEUR', 'USDZEUR'];
    for (const p of pairs) {
        if (prices[p]) return p === 'EURUSD'
        ? 1 / parseFloat(prices[p].c[0])
        : parseFloat(prices[p].c[0]);
    }
    return null;
}

function findPriceTicker(base: string, quote: 'EUR' | 'USD', prices: Record<string, any>): any | null {
    const variants = [
        `${base}${quote}`,
        `${base}Z${quote}`,
        `X${base}${quote}`,
        `X${base}Z${quote}`
    ];

    if (base === 'BTC') {
        if (quote === 'EUR') variants.push('XBTEUR', 'XXBTZEUR');
        else variants.push('XBTUSD', 'XXBTZUSD');
    }

    return variants.find(v => prices[v]) ?? null;
}

export function calculateAssetsValue(
    account: Record<string, { balance: string }>,
    prices: Record<string, any>
): CalculatedPortfolio {

    info('[Calculations] Calculating value for all assets...');

    const usd2eur = usdToEur(prices);
    if (!usd2eur) info('[Calculations] Could not determine USD->EUR rate');

    const cryptoAssetsWithValue: AssetValue[] = [];

    for (const [raw, data] of Object.entries(account)) {
        const balance = parseFloat(data.balance);
        const base = mapKrakenAsset(raw).toUpperCase();
        if (balance === 0 || base === 'EUR') continue;

        let priceEur: number | null = null;
        let source = "";

        let tickerKey = findPriceTicker(base, 'EUR', prices);
        if (tickerKey) {
            priceEur = extractPrice(prices[tickerKey]);
            if (priceEur != null) source = tickerKey;
        }

        if (priceEur == null && usd2eur) {
            tickerKey = findPriceTicker(base, 'USD', prices);
            if (tickerKey) {
                const usdPrice = extractPrice(prices[tickerKey]);
                if (usdPrice != null) {
                    priceEur = usdPrice * usd2eur;
                    source = `${tickerKey} x EUR->USD ${usd2eur.toFixed(4)}`;
                }
            }
        }

        if (priceEur == null) {
            info(`[Calcualtions] No price for ${raw} (${base})`);
            continue;
        }

        info(`[Price] ${base}: € ${priceEur.toFixed(6)}  (via ${source || 'EUR direct'})`);
        cryptoAssetsWithValue.push({
            asset: base,
            balance,
            priceInEur: priceEur,
            eurValue: balance * priceEur,
        });
    }

    const sortedCryptoAssets = cryptoAssetsWithValue.sort((a, b) => b.eurValue - a.eurValue);
    const totalCryptoValueInEur = sortedCryptoAssets.reduce((sum, asset) => sum + asset.eurValue, 0);
    const eurBalance = parseFloat(account.ZEUR?.balance ?? account.EUR?.balance ?? '0');
    const totalPortfolioValueInEur = totalCryptoValueInEur + eurBalance;

    info(`[Calculations] Total portfolio value: € ${totalPortfolioValueInEur.toFixed(2)}`);

    return {
        assets: sortedCryptoAssets,
        totalValueEur: totalPortfolioValueInEur
    }
}