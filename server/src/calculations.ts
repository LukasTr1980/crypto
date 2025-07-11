import { info } from "./utils/logger";
import { mapKrakenAsset, getTickerBase } from "./utils/assetMapper";
import { extractPrice } from "./utils/extractPrice";

export interface AssetValue {
    asset: string;
    balance: number;
    priceInEur: number;
    eurValue: number;
    sharePct: number;
}

export interface CalculatedPortfolio {
    assets: AssetValue[];
    totalValueEur: number;
}

export interface AverageBuyPriceStats {
    totalVolume: number;
    totalCostEur: number;
    totalFeesEur: number;
    averagePriceEur: number;
}

export interface FundingSummaryStats {
    totalDeposited: number;
    totalWithdrawn: number;
    net: number;
    fees: number;
}

export interface AverageSellPriceStats {
    totalVolume: number;
    totalRevenueEur: number;
    totalFeesEur: number;
    averagePriceEur: number;
}

function usdToEur(prices: Record<string, any>): number | null {
    const pairs = ["EURUSD", "USDEUR", "USDZEUR"];
    for (const p of pairs) {
        if (prices[p])
            return p === "EURUSD"
                ? 1 / parseFloat(prices[p].c[0])
                : parseFloat(prices[p].c[0]);
    }
    return null;
}

function findPriceTicker(
    base: string,
    quote: "EUR" | "USD",
    prices: Record<string, any>
): any | null {
    const variants = [
        `${base}${quote}`,
        `${base}Z${quote}`,
        `X${base}${quote}`,
        `X${base}Z${quote}`,
    ];

    if (base === "BTC") {
        if (quote === "EUR") variants.push("XBTEUR", "XXBTZEUR");
        else variants.push("XBTUSD", "XXBTZUSD");
    }

    return variants.find((v) => prices[v]) ?? null;
}

export function calculateAssetsValue(
    account: Record<string, { balance: string }>,
    prices: Record<string, any>
): CalculatedPortfolio {
    info("[Calculations] Calculating value for all assets...");

    const usd2eur = usdToEur(prices);
    if (!usd2eur) info("[Calculations] Could not determine USD->EUR rate");

    const assetValues: AssetValue[] = [];

    const eurBalance = parseFloat(account.ZEUR?.balance ?? account.EUR?.balance ?? "0");
    if (eurBalance > 0) {
        assetValues.push({
            asset: "EUR",
            balance: eurBalance,
            priceInEur: 1, // 1 € == 1 €
            eurValue: eurBalance,
            sharePct: 0,
        });
    }

    for (const [raw, data] of Object.entries(account)) {
        const balance = parseFloat(data.balance);

        const displayName = mapKrakenAsset(raw);
        if (balance === 0 || displayName === "EUR") continue;

        const tickerBase = getTickerBase(raw);

        let priceEur: number | null = null;
        let source = "";

        let tickerKey = findPriceTicker(tickerBase, "EUR", prices);
        if (tickerKey) {
            priceEur = extractPrice(prices[tickerKey]);
            if (priceEur != null) source = tickerKey;
        }

        if (priceEur == null && usd2eur) {
            tickerKey = findPriceTicker(tickerBase, "USD", prices);
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

        info(
            `[Price] ${displayName}: € ${priceEur.toFixed(6)}  (via ${source || "EUR direct"})`
        );
        assetValues.push({
            asset: displayName,
            balance,
            priceInEur: priceEur,
            eurValue: balance * priceEur,
            sharePct: 0,
        });
    }

    const sortedAssets = assetValues.sort((a, b) => b.eurValue - a.eurValue);

    const totalPortfolioValueInEur = sortedAssets.reduce(
        (sum, asset) => sum + asset.eurValue,
        0
    );

    if (totalPortfolioValueInEur > 0) {
        sortedAssets.forEach(a => {
            a.sharePct = (a.eurValue / totalPortfolioValueInEur) * 100;
        });
    }

    info(
        `[Calculations] Total portfolio value: € ${totalPortfolioValueInEur.toFixed(2)}`
    );

    return {
        assets: sortedAssets,
        totalValueEur: totalPortfolioValueInEur,
    };
}

export function calculateAverageBuyPrices(
    tradesHistory: { trades: Record<string, any> },
    ledgers: any[]
): Record<string, AverageBuyPriceStats> {
    info("[Calculations] Calculating average buy prices...");
    const stats: Record<string, { totalVolume: number; totalCostEur: number; totalFeesEur: number }> = {};

    for (const trade of Object.values(tradesHistory.trades)) {
        if (trade.type !== "buy" || !trade.pair.toUpperCase().endsWith("EUR")) {
            continue;
        }

        const assetCode = trade.pair.toUpperCase().replace("EUR", "").replace("Z", "");
        const asset = mapKrakenAsset(assetCode);

        const volume = parseFloat(trade.vol);
        const cost = parseFloat(trade.cost);
        const fee = parseFloat(trade.fee);

        if (!stats[asset]) {
            stats[asset] = { totalVolume: 0, totalCostEur: 0, totalFeesEur: 0 };
        }

        stats[asset].totalVolume += volume;
        stats[asset].totalCostEur += cost;
        stats[asset].totalFeesEur += fee;
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

        const eurSpend = group.find(
            (l) => l.type === "spend" && l.asset.toUpperCase().includes("EUR")
        );
        const cryptoReceive = group.find(
            (l) => l.type === "receive" && !l.asset.toUpperCase().includes("EUR")
        );

        if (eurSpend && cryptoReceive) {
            const asset = mapKrakenAsset(cryptoReceive.asset);
            const volume = parseFloat(cryptoReceive.amount);
            const cost = Math.abs(parseFloat(eurSpend.amount));
            const fee = 0; // Instant Buy Kraken abo no fees

            info(
                `[Calculations] Found instant buy via ledger for ${asset}: ${volume} for €${cost}`
            );

            if (!stats[asset]) {
                stats[asset] = { totalVolume: 0, totalCostEur: 0, totalFeesEur: 0 };
            }

            stats[asset].totalVolume += volume;
            stats[asset].totalCostEur += cost;
            stats[asset].totalFeesEur += fee;
        }
    }

    const result: Record<string, AverageBuyPriceStats> = {};
    for (const asset in stats) {
        const { totalVolume, totalCostEur, totalFeesEur } = stats[asset];
        if (totalVolume > 0) {
            result[asset] = {
                totalVolume,
                totalCostEur,
                totalFeesEur,
                averagePriceEur: totalCostEur / totalVolume,
            };
        }
    }

    info(
        `[Calculations] Calculated average buy prices for ${Object.keys(result).length} assets.`
    );
    return result;
}

export function calculateFundingSummary(
    ledgers: any[]
): Record<string, FundingSummaryStats> {
    const summary: Record<string, FundingSummaryStats> = {};

    for (const l of ledgers) {
        if (l.type !== 'deposit' && l.type !== 'withdrawal') continue;

        const asset = mapKrakenAsset(l.asset);
        const amount = Math.abs(parseFloat(l.amount));
        const fee = Math.abs(parseFloat(l.fee) || 0);

        if (!summary[asset]) {
            summary[asset] = { totalDeposited: 0, totalWithdrawn: 0, net: 0, fees: 0 };
        }

        if (l.type === 'deposit') summary[asset].totalDeposited += amount;
        if (l.type === 'withdrawal')summary[asset].totalWithdrawn += amount;

        summary[asset].fees += fee;
    }

    for (const stats of Object.values(summary)) {
        stats.net = stats.totalDeposited - stats.totalWithdrawn;
    }

    return summary;
}

export function calculateAverageSellPrices(
    tradesHistory: { trades: Record<string, any> }
): Record<string, AverageSellPriceStats> {
    info('[Calculations] Calculating average sell prices...');

    const stats: Record<string, { totalVolume: number; totalRevenueEur: number; totalFeesEur: number }> = {};

    for (const trade of Object.values(tradesHistory.trades)) {
        if (trade.type !== 'sell' || !trade.pair.toUpperCase().endsWith('EUR')) continue;

        const assetCode = trade.pair.toUpperCase().replace('EUR', '').replace('Z', '');
        const asset = mapKrakenAsset(assetCode);

        const volume = parseFloat(trade.vol);
        const revenue = parseFloat(trade.cost);
        const fee = parseFloat(trade.fee);

        if (!stats[asset]) stats[asset] = { totalVolume: 0, totalRevenueEur: 0, totalFeesEur: 0 };

        stats[asset].totalVolume += volume;
        stats[asset].totalRevenueEur += revenue;
        stats[asset].totalFeesEur += fee;
    }

    const result: Record<string, AverageSellPriceStats> = {};
    for (const asset in stats) {
        const { totalVolume, totalRevenueEur, totalFeesEur } = stats[asset];
        if (totalVolume > 0) {
            result[asset] = {
                totalVolume,
                totalRevenueEur,
                totalFeesEur,
                averagePriceEur: totalRevenueEur / totalVolume,
            };
        }
    }

    info(`[Calculations] Calculated average sell prices for ${Object.keys(result).length} assets.`);
    return result;
}