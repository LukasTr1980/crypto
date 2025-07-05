import { dt } from "./utils/dt";
import { InstantTrade, getInstantTrades } from "./ledger";
import { mapKrakenAsset } from "./utils/assetMapper";
import { info } from "./utils/logger";

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