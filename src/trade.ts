import { krakenPost, fetchPrices } from "./utils/kraken";
import { dt } from "./utils/dt";
import { InstantTrade, getBaseFees, getInstantTrades, getRewards } from "./ledger";
import { mapKrakenAsset, krakenPair, getPublicTickerPair, mapPublicPairToAsset } from "./utils/assetMapper";
import { info, error } from "./utils/logger";

export interface TradeItem {
    time: string;
    asset: string;
    pair: string;
    type: 'buy' | 'sell';
    price: number;
    volume: number;
    cost: number;
    fee: number;
}

export interface TradeResult {
    items: TradeItem[];
    volumeTotal: number;
    costTotal: number;
    feeTotal: number;
}

export interface CoinSummary {
    asset: string;
    buyVolume: number;
    rewardVolume: number;
    buyCost: number;
    avgBuyPrice: number | null;
    sellVolume: number;
    sellProceeds: number;
    avgSellPrice: number | null;
    netVolume: number;
    netSpend: number;
    feeTotal: number;
    coinFee: number;
    realised: number;
    unrealised: number;
    totalPL: number;
    priceNow: number;
    priceTs: string;
}

async function loadTradesRaw() {
    info('[Trades] loadTradesRaw start');
    const res = await krakenPost('/0/private/TradesHistory');
    const rows = Object.values(res.trades ?? {}) as any[];
    info(`[Trades] Loaded ${rows.length} trades from API`);
    return rows;
}

function mapTrade(raw: any): TradeItem {
    return {
        time: dt(raw.time),
        asset: mapKrakenAsset(raw.pair),
        pair: raw.pair,
        type: raw.type,
        price: Number(raw.price),
        volume: Number(raw.vol),
        cost: Number(raw.cost),
        fee: Number(raw.fee)
    };
}

function convertInstant(i: InstantTrade): TradeItem {
    return {
        time: i.time,
        asset: mapKrakenAsset(i.asset),
        pair: `${mapKrakenAsset(i.asset)}EUR`,
        type: 'buy',
        price: i.price,
        volume: i.volume,
        cost: i.cost,
        fee: 0
    };
}

function appendTotals(list: TradeItem[]): TradeResult {
    let volumeTotal = 0, costTotal = 0, feeTotal = 0;
    list.forEach(t => {
        volumeTotal += t.volume;
        costTotal += t.cost;
        feeTotal += t.fee;
    });
    return { items: list, volumeTotal, costTotal, feeTotal };
}

const isEurPair = (p: string) => /E?EUR$/i.test(p);

export async function showBuys(): Promise<TradeResult> {
    info('[Trades] showBuys start');
    const proRows = await loadTradesRaw();
    const proItems = proRows
        .filter(r => r.type === 'buy' && isEurPair(r.pair))
        .map(mapTrade);

    const instantRows = await getInstantTrades();
    const instantItems = instantRows.map(convertInstant);
    info(`[Trades] Buys: ${proItems.length} pro, ${instantItems.length} instant`);
    return appendTotals([...proItems, ...instantItems]);
}

export async function showSells(): Promise<TradeResult> {
    info('[Trades] showSells start');
    const items = (await loadTradesRaw())
        .filter(r => r.type === 'sell' && isEurPair(r.pair))
        .map(mapTrade);
    info(`[Trades] Sells loaded: ${items.length}`);
    return appendTotals(items);
}

// trade.ts - DEBUGGING-VERSION zum Loggen der API-Antwort

export async function showCoinSummary(): Promise<CoinSummary[]> {
    info('[Trades] showCoinSummary start');
    const proRows = await loadTradesRaw();
    const instantRows = await getInstantTrades();
    const baseFees = await getBaseFees();
    const rewardRows = await getRewards();

    const bucket: Record<string, CoinSummary> = {};
    const ensure = (a: string): CoinSummary => bucket[a] ??= {
        asset: a, buyVolume: 0, rewardVolume: 0, buyCost: 0, avgBuyPrice: null, sellVolume: 0, sellProceeds: 0, avgSellPrice: null, netVolume: 0, netSpend: 0, feeTotal: 0, coinFee: 0, realised: 0, unrealised: 0, totalPL: 0, priceNow: 0, priceTs: "",
    };

    // --- Datensammlung (unverändert) ---
    for (const r of proRows) {
        if (!isEurPair(r.pair)) continue;
        const asset = mapKrakenAsset(r.pair);
        const b = ensure(asset);
        const vol = Number(r.vol);
        const cost = Number(r.cost);
        const fee = Number(r.fee);
        if (r.type === 'buy') {
            b.buyVolume += vol;
            b.buyCost += cost;
            b.feeTotal += fee;
        } else {
            b.sellVolume += vol;
            b.sellProceeds += cost;
            b.feeTotal += fee;
        }
    }
    for (const t of instantRows) {
        const b = ensure(t.asset);
        if (t.volume > 0) {
            b.buyVolume += t.volume;
            b.buyCost += t.cost;
        } else {
            b.sellVolume += -t.volume;
            b.sellProceeds += t.cost;
        }
    }
    for (const f of baseFees) {
        const b = ensure(f.asset);
        b.buyVolume -= f.volume;
        b.coinFee += f.volume;
    }
    for (const r of rewardRows) {
        const b = ensure(r.asset);
        b.rewardVolume += r.volume;
    }
    for (const b of Object.values(bucket)) {
        b.netVolume = b.buyVolume + b.rewardVolume - b.sellVolume - b.coinFee;
        b.netSpend = b.buyCost - b.sellProceeds + b.feeTotal;
        if(b.buyVolume > 0) b.avgBuyPrice = b.buyCost / b.buyVolume;
        if(b.sellVolume > 0) b.avgSellPrice = b.sellProceeds / b.sellVolume;
    }

    info(`[Trades] Coin summary bucket built: ${Object.keys(bucket).length} assets`);

    // --- Preisabfrage (unverändert) ---
    const assetsInBucket = Object.keys(bucket);
    const publicPairsToFetch = assetsInBucket
        .map(asset => getPublicTickerPair(asset))
        .filter((p): p is string => !!p);

    const publicPriceResp = await fetchPrices(publicPairsToFetch);
    const priceResp: Record<string, { price: number; ts: string }> = {};
    for (const publicPair in publicPriceResp) {
        const asset = mapPublicPairToAsset(publicPair);
        const internalPair = krakenPair(asset);
        if (internalPair) {
            priceResp[internalPair] = publicPriceResp[publicPair];
        }
    }

    // --- USD-Kurs Abfrage (ROBUSTE VERSION) ---
    const usdEurResponse = await fetchPrices([getPublicTickerPair('USD')!]);
    
    // Wir nehmen den ersten Wert aus der Antwort, egal wie der Schlüssel heißt.
    const usdEurData = Object.values(usdEurResponse)[0];
    const usdEurPrice = usdEurData?.price;
    
    if (!usdEurPrice) {
        throw new Error("Konnte den USD-EUR-Wechselkurs nicht aus der Kraken-Antwort extrahieren.");
    }
    priceResp['USDGEUR'] = { price: usdEurPrice, ts: usdEurData.ts };

    // --- Finale Berechnung (unverändert) ---
    for (const b of Object.values(bucket)) {
        let currentPrice = 0;
        let priceTimestamp = '';
        if (b.asset === 'USDG') {
            currentPrice = priceResp['USDGEUR']?.price ?? 1;
            priceTimestamp = priceResp['USDGEUR']?.ts ?? '';
        } else {
            const internalPair = krakenPair(b.asset) ?? '';
            currentPrice = priceResp[internalPair]?.price ?? 0;
            priceTimestamp = priceResp[internalPair]?.ts ?? '';
        }
        b.priceNow = currentPrice;
        b.priceTs = priceTimestamp ? dt(new Date(priceTimestamp).getTime() / 1000) : '';
        b.unrealised = b.netVolume * b.priceNow;
        b.realised = -b.netSpend;
        b.totalPL = b.realised + b.unrealised;
    }
    
    return Object.values(bucket).sort((a, b) => a.asset.localeCompare(b.asset));
}

