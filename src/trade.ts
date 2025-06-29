import { krakenPost, fetchPrices } from "./utils/kraken";
import { dt } from "./utils/dt";
import { getInstantBuys, InstantTrade, getBaseFees, BaseFee } from "./ledger";
import { mapKrakenAsset, krakenPair } from "./utils/assetMapper";

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
    realised: number;
    unrealised: number;
    totalPL: number;
}

async function  loadTradesRaw() {
    const res = await krakenPost('/0/private/TradesHistory');
    const rows = Object.values(res.trades ?? {}) as any[];
    console.log(`[Trades] Loaded ${rows.length} trades from API`);
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
    const proRows = await  loadTradesRaw();
    const proItems = proRows
                        .filter(r => r.type === 'buy' && isEurPair(r.pair))
                        .map(mapTrade);

    const instantRows = await getInstantBuys();
    const instantItems = instantRows.map(convertInstant);
    console.log(`[Trades] Buys: ${proItems.length} pro, ${instantItems.length} instant`);
    return appendTotals([...proItems, ...instantItems]);
}

export async function showSells(): Promise<TradeResult> {
    const items = (await  loadTradesRaw())
                    .filter(r => r.type === 'sell' && isEurPair(r.pair))
                    .map(mapTrade);
    console.log(`[Trades] Sells loaded: ${items.length}`);
    return appendTotals(items);
}

export async function showCoinSummary(): Promise<CoinSummary[]> {
    const proRows = await  loadTradesRaw();
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
            realised: 0,
            unrealised: 0,
            totalPL: 0,
    }

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
            b.sellVolume += vol,
            b.sellProceeds += cost;
            b.feeTotal += fee;
        }
    }

    for (const i of instantRows) {
        const b = ensure(i.asset);
        b.buyVolume += i.volume;
        b.buyCost += i.cost;
    }

    for (const f of baseFees) {
        const b = ensure(f.asset);
        b.buyVolume -= f.volume;
        b.coinFee += f.volume;
    }

    for (const b of Object.values(bucket)) {
        b.avgBuyPrice = b.buyVolume ? b.buyCost / b.buyVolume : null;
        b.avgSellPrice = b.sellVolume ? b.sellProceeds / b.sellVolume : null;
        b.netVolume = b.buyVolume - b.sellVolume;
        b.netSpend = b.buyCost - b.sellProceeds + b.feeTotal;
    }

    const pairs = Object.keys(bucket).map(a => krakenPair(a));
    const prices = await fetchPrices(pairs);

    for (const b of Object.values(bucket)) {
        const price = prices[krakenPair(b.asset)] ?? 0;

        const avgCost = b.buyVolume ? b.buyCost / b.buyVolume : 0;
        const costSold = avgCost * b.sellVolume;

        b.realised = -b.netSpend;
        b.unrealised = b.netVolume * price;
        b.totalPL = b.realised + b.unrealised;
    }

    return Object.values(bucket).sort((a, b) => a.asset.localeCompare(b.asset));
}