import { krakenPost } from "./utils/kraken";
import { dt } from "./utils/dt";
import { getInstantBuys, InstantTrade, getBaseFees, BaseFee } from "./ledger";
import { mapKrakenAsset } from "./utils/assetMapper";

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
    coinFee: number;
}

async function laodTradesRaw() {
    const res = await krakenPost('/0/private/TradesHistory');
    return Object.values(res.trades ?? {}) as any[];    
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

export async function showBuys(): Promise<TradeResult> {
    const proRows = await laodTradesRaw();
    const proItems = proRows
                        .filter(r => r.type === 'buy')
                        .map(mapTrade);

    const instantRows = await getInstantBuys();
    const instantItems = instantRows.map(convertInstant);

    return appendTotals([...proItems, ...instantItems]);
}

export async function showSells(): Promise<TradeResult> {
    const items = (await laodTradesRaw())
                    .filter(r => r.type === 'sell')
                    .map(mapTrade);
    return appendTotals(items);
}

export async function showCoinSummary(): Promise<CoinSummary[]> {
    const proRows = await laodTradesRaw();
    const instantRows = await getInstantBuys();
    const baseFees = await getBaseFees();

    const bucket: Record<string, CoinSummary> = {};
    const ensure = (a: string): CoinSummary => bucket[a] ??= {
            asset: a,
            buyVolume: 0,
            buyCost: 0,
            avgBuyPrice: null,
            sellVolume: 0,
            sellProceeds: 0,
            avgSellPrice: null,
            netVolume: 0,
            netSpend: 0,
            feeTotal: 0,
            coinFee: 0,
    }

    for (const r of proRows) {
        const asset = mapKrakenAsset(r.pair);
        const b = ensure(asset);
        const vol = Number(r.vol);
        const cost = Number(r.cost);

        if (r.type === 'buy') {
            b.buyVolume += vol;
            b.buyCost += cost;
        } else {
            b.sellVolume += vol,
            b.sellProceeds += cost;
        }
        b.feeTotal += Number(r.fee);
    }

    for (const i of instantRows) {
        const b = ensure(i.asset);
        b.buyVolume += i.volume;
        b.buyCost += i.cost;
    }

    for (const f of baseFees) {
        const b = ensure(f.asset);
        b.buyVolume -= f.volume;
        b.feeTotal += f.volume;
        b.coinFee += f.volume;
    }

    for (const b of Object.values(bucket)) {
        b.avgBuyPrice = b.buyVolume ? b.buyCost / b.buyVolume : null;
        b.avgSellPrice = b.sellVolume ? b.sellProceeds / b.sellVolume : null;
        b.netVolume = b.buyVolume - b.sellVolume;
        b.netSpend = b.buyCost - b.sellProceeds + b.feeTotal;
    }

    return Object.values(bucket).sort((a, b) => a.asset.localeCompare(b.asset));
}