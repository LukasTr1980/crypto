import { info } from "./utils/logger";
import { mapKrakenAsset, getTickerBase } from "./utils/assetMapper";
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

export interface AverageBuyPriceStats {
    totalVolume: number;
    totalCostEur: number;
    averagePriceEur: number;
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

        const displayName = mapKrakenAsset(raw);
        if (balance === 0 || displayName === 'EUR') continue;

        const tickerBase = getTickerBase(raw);

        let priceEur: number | null = null;
        let source = "";

        let tickerKey = findPriceTicker(tickerBase, 'EUR', prices);
        if (tickerKey) {
            priceEur = extractPrice(prices[tickerKey]);
            if (priceEur != null) source = tickerKey;
        }

        if (priceEur == null && usd2eur) {
            tickerKey = findPriceTicker(tickerBase, 'USD', prices);
            if (tickerKey) {
                const usdPrice = extractPrice(prices[tickerKey]);
                if (usdPrice != null) {
                    priceEur = usdPrice * usd2eur;
                    source = `${tickerKey} x EUR->USD ${usd2eur.toFixed(4)}`;
                }
            }
        }

        if (priceEur == null) {
            info(`[Calcualtions] No price for ${raw} (${tickerBase})`);
            continue;
        }

        info(`[Price] ${displayName}: € ${priceEur.toFixed(6)}  (via ${source || 'EUR direct'})`);
        cryptoAssetsWithValue.push({
            asset: displayName,
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

export function calculateAverageBuyPrices(
    tradesHistory: { trades: Record<string, any> },
    ledgers: any[]
): Record<string, AverageBuyPriceStats> {
    info('[Calculations] Calculating average buy prices...');
    const stats: Record<string, { totalVolume: number; totalCostEur: number }> = {};

    for (const trade of Object.values(tradesHistory.trades)) {
        if (trade.type !== 'buy' || !trade.pair.toUpperCase().endsWith('EUR')) {
            continue;
        }

        const assetCode = trade.pair.toUpperCase().replace('EUR', '').replace('Z', '');
        const asset = mapKrakenAsset(assetCode);

        const volume = parseFloat(trade.vol);
        const cost = parseFloat(trade.cost);

        if (!stats[asset]) {
            stats[asset] = { totalVolume: 0, totalCostEur: 0 };
        }

        stats[asset].totalVolume += volume;
        stats[asset].totalCostEur += cost;
    }

    const groupedByRefId: Record<string, any[]> = {};
    for (const l of ledgers) {
        if (!groupedByRefId[l.refid]) {
            groupedByRefId[l.refid] = [];
        }
        groupedByRefId[l.refid].push(l);
    }

    for (const refId in groupedByRefId) {
        const group = groupedByRefId[refId];
        if (group.length !== 2) continue;

        const eurSpend = group.find(l => l.type === 'spend' && l.asset.toUpperCase().includes('EUR'));
        const cryptoReceive = group.find(l => l.type === 'receive' && !l.asset.toUpperCase().includes('EUR'));

        if (eurSpend && cryptoReceive) {
            const asset = mapKrakenAsset(cryptoReceive.asset);
            const volume = parseFloat(cryptoReceive.amount);
            const cost = Math.abs(parseFloat(eurSpend.amount));

            info(`[Calculations] Found instant buy via ledger for ${asset}: ${volume} for €${cost}`);

            if (!stats[asset]) {
                stats[asset] = { totalVolume: 0, totalCostEur: 0 };
            }

            stats[asset].totalVolume += volume;
            stats[asset].totalCostEur += cost;
        }
    }

    const result: Record<string, AverageBuyPriceStats> = {};
    for (const asset in stats) {
        const { totalVolume, totalCostEur } = stats[asset];
        if (totalVolume > 0) {
            result[asset] = {
                totalVolume,
                totalCostEur,
                averagePriceEur: totalCostEur / totalVolume,
            };
        }
    }

    info(`[Calculations] Calculated average buy prices for ${Object.keys(result).length} assets.`);
    return result;
}