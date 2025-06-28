import { krakenPost } from "./utils/kraken";
import { dt } from "./utils/dt";

export interface TradeItem {
    time: string;
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

export async function showBuys(): Promise<TradeResult> {
    const res = await krakenPost('/0/private/TradesHistory');

    const trades = Object.values(res.trades ?? {}) as any[];

    let volumeTotal = 0, costTotal = 0, feeTotal = 0;

    const items = trades
        .filter(t => t.type === 'buy')
        .map(t => {
            const volume = Number(t.vol);
            const cost = Number(t.cost);
            const fee = Number(t.fee);
            const price = Number(t.price);

            volumeTotal += volume;
            costTotal += cost;
            feeTotal += fee;

            return {
                time: dt(t.time),
                pair: t.pair,
                type: 'buy',
                price,
                volume,
                cost,
                fee,
            } as TradeItem;
        });

        return {
            items,
            volumeTotal,
            costTotal,
            feeTotal,
        };
}

export async function showSells(): Promise<TradeResult> {
    const res = await krakenPost('/0/private/TradesHistory');
    const trades = Object.values(res.trades ?? {}) as any[];

    let volumeTotal = 0, costTotal = 0, feeTotal = 0;

    const items = trades
        .filter(t => t.type === 'sell')
        .map(t => {
            const volume = Number(t.vol);
            const cost = Number(t.cost);
            const fee = Number(t.fee);
            const price = Number(t.price);

            volumeTotal += volume;
            costTotal += cost;
            feeTotal += fee;

            return {
                time: dt(t.time),
                pair: t.pair,
                type: 'sell',
                price,
                volume,
                cost,
                fee,
            } as TradeItem;
        });

        return {
            items,
            volumeTotal,
            costTotal,
            feeTotal
        };
}