import { krakenPost } from "./utils/kraken";
import { dt } from "./utils/dt";

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
    buyCost: number;
    avgBuyPrice: number | null;
    sellVolume: number;
    sellProceeds: number;
    avgSellPrice: number | null;
    netVolume: number;
    netSpend: number;
    feeTotal: number;
}

function parseAsset(pair: string): string {
    const base = pair.replace(/ZEUR$|EUR$/i, '');
    return base.replace(/^[XZ]/, '');
}

async function laodTradesRaw() {
    const res = await krakenPost('/0/private/TradesHistory');
    return Object.values(res.trades ?? {}) as any[];    
}

function mapTrade(raw: any): TradeItem {
    const volume = Number(raw.vol);
    const cost = Number(raw.cost);
    const fee = Number(raw.fee);
    const price = Number(raw.price);
    const pair = raw.pair;
    const asset = parseAsset(pair);

    return {
        time: dt(raw.time),
        asset,
        pair,
        type: raw.type,
        price,
        volume,
        cost,
        fee,
    };
}

export async function showBuys(): Promise<TradeResult> {
    const items = (await laodTradesRaw()).filter(t => t.type === 'buy').map(mapTrade);
    let volumeTotal = 0, costTotal = 0, feeTotal = 0;
    items.forEach(t => { volumeTotal += t.volume; costTotal += t.cost; feeTotal += t.fee; });
    return { items, volumeTotal, costTotal, feeTotal };
}

export async function showSells(): Promise<TradeResult> {
    const items = (await laodTradesRaw()).filter(t => t.type === 'sell').map(mapTrade);
    let volumeTotal = 0, costTotal = 0, feeTotal = 0;
    items.forEach(t => { volumeTotal += t.volume; costTotal += t.cost; feeTotal += t.fee });
    return { items, volumeTotal, costTotal, feeTotal };
}

export async function showCoinSummary(): Promise<CoinSummary[]> {
    const rows = await laodTradesRaw();
    const bucket: Record<string, CoinSummary> = {};

    for (const r of rows) {
        const asset = parseAsset(r.pair);
        if (!bucket[asset]) {
            bucket[asset] = {
                asset,
                buyVolume: 0,
                buyCost: 0,
                avgBuyPrice: null,
                sellVolume: 0,
                sellProceeds: 0,
                avgSellPrice: null,
                netVolume: 0,
                netSpend: 0,
                feeTotal: 0,
            };
        }
        const b = bucket[asset];
        const vol = Number(r.vol);
        const cost = Number(r.cost);

        if (r.type === 'buy') {
            b.buyVolume += vol;
            b.buyCost += cost;
        } else {
            b.sellVolume += vol;
            b.sellProceeds += cost;
        }
        b.feeTotal += Number(r.fee);
    }

    for (const b of Object.values(bucket)) {
        b.avgBuyPrice = b.buyVolume ? b.buyCost / b.buyVolume : null;
        b.avgSellPrice = b.sellVolume ? b.sellProceeds / b.sellVolume : null;
        b.netVolume = b.buyVolume - b.sellVolume;
        b.netSpend = b.buyCost - b.sellProceeds + b.feeTotal;
    }

    return Object.values(bucket).sort((a, b) => a.asset.localeCompare(b.asset));
}