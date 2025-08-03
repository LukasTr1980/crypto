import { info } from "./utils/logger";
import { mapKrakenAsset, getTickerBase } from "./utils/assetMapper";
import { extractPrice } from "./utils/extractPrice";
import {
    AssetValue,
    CalculatedPortfolio,
    AverageBuyPriceStats,
    FundingSummaryStats,
    AverageSellPriceStats,
    PnlStats,
    PnlPerAssetResult,
    KrakenTicker,
    KrakenTrade,
    LedgerEntry,
    KrakenTickerMap,
} from "./types";

function usdToEur(prices: KrakenTickerMap): number | null {
    const pairs = ['EURUSD', 'USDEUR', 'USDZEUR'] as const;

    for (const p of pairs) {
        const tick = prices[p];
        if (!tick) continue;

        const lastStr = tick.c?.[0];
        if (!lastStr) continue;

        const rate = parseFloat(lastStr);
        if (!Number.isFinite(rate) || rate === 0) continue;

        return p === 'EURUSD' ? 1 / rate : rate;
    }
    return null;
}

function findPriceTicker(
    base: string,
    quote: "EUR" | "USD",
    prices: KrakenTickerMap,
): string | null {
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
    prices: KrakenTickerMap,
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
            priceInEur: 1,
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
    tradesHistory: { trades: Record<string, KrakenTrade> },
    ledgers: LedgerEntry[]
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

    const groupedByRefId: Record<string, LedgerEntry[]> = {};
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
                averagePriceEur: (totalCostEur + totalFeesEur) / totalVolume,
            };
        }
    }

    info(
        `[Calculations] Calculated average buy prices for ${Object.keys(result).length} assets.`
    );
    return result;
}

export function calculateFundingSummary(
    ledgers: LedgerEntry[]
): Record<string, FundingSummaryStats> {
    const summary: Record<string, FundingSummaryStats> = {};

    for (const l of ledgers) {
        if (l.type !== 'deposit' && l.type !== 'withdrawal') continue;

        const asset = mapKrakenAsset(l.asset);
        const amount = Math.abs(parseFloat(l.amount));
        const fee = Math.abs(parseFloat(l.fee ?? '0'));

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
    tradesHistory: { trades: Record<string, KrakenTrade> }
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
                averagePriceEur: (totalRevenueEur - totalFeesEur) / totalVolume,
            };
        }
    }

    info(`[Calculations] Calculated average sell prices for ${Object.keys(result).length} assets.`);
    return result;
}

export function calculatePnlPerAsset(
    account: Record<string, { balance: string }>,
    tradesHistory: { trades: Record<string, KrakenTrade> },
    ledgers: LedgerEntry[],
    prices: KrakenTickerMap,
): PnlPerAssetResult {
    const buyStats = calculateAverageBuyPrices(tradesHistory, ledgers);
    const sellStats = calculateAverageSellPrices(tradesHistory);
    const portfolio = calculateAssetsValue(account, prices);

    const currentValue: Record<string, { bal: number; valEur: number; price: number }> = {};
    portfolio.assets.forEach(a => {
        currentValue[a.asset] = { bal: a.balance, valEur: a.eurValue, price: a.priceInEur };
    });

    const allAssets = new Set<string>([
        ...Object.keys(buyStats),
        ...Object.keys(sellStats),
        ...portfolio.assets.map(a => a.asset),
    ]);

    const perAsset: Record<string, PnlStats> = {};

    for (const asset of allAssets) {
        const buy : AverageBuyPriceStats | undefined = buyStats[asset];
        const sell: AverageSellPriceStats | undefined = sellStats[asset];
        const cur = currentValue[asset] ?? { bal: 0, valEur: 0, price: 0 };

        const netBuys = (buy?.totalCostEur ?? 0) + (buy?.totalFeesEur ?? 0);
        const netSells = (sell?.totalRevenueEur ?? 0) - (sell?.totalFeesEur ?? 0);
        const investedEur = netBuys - netSells;

        let realizedEur = 0;
        if (sell) {
            const avgBuyPrice = buy?.averagePriceEur ?? 0;
            const costBasisSold = avgBuyPrice * sell.totalVolume;
            realizedEur =
                sell.totalRevenueEur -
                sell.totalFeesEur -
                costBasisSold;
        }

        const avgBuyPrice = buy?.averagePriceEur ?? 0;
        const costBasisRemaining = avgBuyPrice * cur.bal;
        const unrealizedEur = cur.valEur - costBasisRemaining;

        const totalEur = realizedEur + unrealizedEur;

        const totalPct =
            investedEur !== 0 ? (totalEur / Math.abs(investedEur)) * 100 : 0;

        perAsset[asset] = {
            investedEur,
            realizedEur,
            unrealizedEur,
            totalEur,
            totalPct,
        };
    }

    let sumInv = 0, sumReal = 0, sumUnreal = 0;
    Object.values(perAsset).forEach(p => {
        sumInv += p.investedEur;
        sumReal += p.realizedEur;
        sumUnreal += p.unrealizedEur;
    });

    const sumTot = sumReal + sumUnreal;
    const sumPct = sumInv !== 0 ? (sumTot / Math.abs(sumInv)) * 100 : 0;

    return {
        perAsset,
        totals: {
            investedEur: sumInv,
            realizedEur: sumReal,
            unrealizedEur: sumUnreal,
            totalEur: sumTot,
            totalPct: sumPct,
        },
    };
}