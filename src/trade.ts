import { fetchTradesHistory, fetchPrices, fetchAllLedgers, PriceQuote } from "./utils/kraken";
import { dt } from "./utils/dt";
import { InstantTrade, getBaseFees, getInstantTrades, getRewards } from "./ledger";
import { mapKrakenAsset, krakenPair, getPublicTickerPair, mapPublicPairToAsset } from "./utils/assetMapper";
import { info, debug } from "./utils/logger";

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
    totalPLPercent: number | null;
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
        type: i.volume > 0 ? 'buy' : 'sell',
        price: i.price,
        volume: Math.abs(i.volume),
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

export function processBuys(tradesRaw: any[], ledgerRows: any[]): TradeResult {
    info('[Trades] Processing buys');
    const proItems = tradesRaw
        .filter(r => r.type === 'buy' && isEurPair(r.pair))
        .map(mapTrade);

    const instantRows = getInstantTrades(ledgerRows);
    const instantItems = instantRows
        .filter(t => t.volume > 0)
        .map(convertInstant);

    info(`[Trades] Buys processed: ${proItems.length} pro, ${instantItems.length} instant`);
    return appendTotals([...proItems, ...instantItems]);
}

export function processSells(tradesRaw: any[], ledgerRows: any[]): TradeResult {
    info('[Trades] Processing sells');
    const proItems = tradesRaw
        .filter(r => r.type === 'sell' && isEurPair(r.pair))
        .map(mapTrade);

    const instantRows = getInstantTrades(ledgerRows);
    const instantItems = instantRows
        .filter(t => t.volume < 0)
        .map(convertInstant);

    info(`[Trades] Sells processed: ${proItems.length} pro, ${instantItems.length} instant`);
    return appendTotals([...proItems, ...instantItems]);
}

// trade.ts - DEBUGGING-VERSION zum Loggen der API-Antwort

export function processCoinSummary(
    proRows: any[],
    ledgerRows: any[],
    priceData: Record<string, PriceQuote>
): CoinSummary[] {
    info('[Trades] Processing coin summary');


    const instantRows = getInstantTrades(ledgerRows);
    const baseFees = getBaseFees(ledgerRows);
    const rewardRows = getRewards(ledgerRows);

    const bucket: Record<string, CoinSummary> = {};
    const ensure = (a: string): CoinSummary => bucket[a] ??= {
        asset: a, 
        buyVolume: 0, 
        rewardVolume: 0, 
        buyCost: 0, 
        avgBuyPrice: null, 
        sellVolume: 0, 
        sellProceeds: 0, 
        avgSellPrice: null, 
        netVolume: 0, 
        netSpend: 0, 
        feeTotal: 0, 
        coinFee: 0, 
        realised: 0, 
        unrealised: 0, 
        totalPL: 0, 
        priceNow: 0, 
        priceTs: "", 
        totalPLPercent: null,
    };

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
        ensure(f.asset).coinFee += f.volume;
    }
    for (const r of rewardRows) {
        ensure(r.asset).rewardVolume += r.volume;
    }
    
    for (const b of Object.values(bucket)) {
        b.netVolume = b.buyVolume + b.rewardVolume - b.sellVolume - b.coinFee;
        b.netSpend = b.buyCost - b.sellProceeds + b.feeTotal;
        if(b.buyVolume > 0) b.avgBuyPrice = b.buyCost / b.buyVolume;
        if(b.sellVolume > 0) b.avgSellPrice = b.sellProceeds / b.sellVolume;
    }

    info(`[Trades] Coin summary bucket built: ${Object.keys(bucket).length} assets`);

    for (const b of Object.values(bucket)) {
        let currentPrice = 0;
        let priceTimestamp = '';

        if (b.asset === 'USDG') {
            const usdQuote = priceData['USDGEUR'];
            if (usdQuote) {
                currentPrice = usdQuote.price;
                priceTimestamp = usdQuote.ts;
            }
        } else {
            const internalPair = krakenPair(b.asset) ?? '';
            const quote = priceData[internalPair] ?? priceData[`${b.asset}EUR`];
            if (quote) {
                currentPrice = quote.price;
                priceTimestamp = quote.ts;
            }
        }

        b.priceNow = currentPrice;
        b.priceTs = priceTimestamp ? dt(new Date(priceTimestamp).getTime() / 1000) : '';
        b.unrealised = b.netVolume * b.priceNow;
        b.realised = -b.netSpend;
        b.totalPL = b.realised + b.unrealised;

        if (b.buyCost > 0) {
            b.totalPLPercent = (b.totalPL / b.buyCost) * 100;
        } else {
            b.totalPLPercent = null;
        }
    }

    return Object.values(bucket).sort((a, b) => a.asset.localeCompare(b.asset));
}

