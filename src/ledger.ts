import { krakenPost } from "./utils/kraken";
import { dt } from "./utils/dt";
import { mapKrakenAsset } from "./utils/assetMapper";

export interface InstantTrade {
    time: string;
    asset: string;
    volume: number;
    cost: number;
    price: number;
    refid: string;
}

export interface BaseFee {
    time: string;
    asset: string;
    volume: number;
    refid: string;
}

export interface RewardItem {
    time: string;
    asset: string;
    volume: number;
    refid: string;
}

export async function getInstantTrades(): Promise<InstantTrade[]> {
    const { ledger } = await krakenPost('/0/private/Ledgers');
    const rows = Object.values(ledger ?? {}) as any[];

    const bucket: Record<string, any[]> = {};
    rows.forEach(r => (bucket[r.refid] = [...(bucket[r.refid] ?? []), r]));

    const out: InstantTrade[] = [];

    for (const g of Object.values(bucket)) {
        const eurSpend = g.find(x => x.type === 'spend' && ["EUR", "ZEUR"].includes(x.asset));
        const eurRecv = g.find(x => x.type === 'receive' && ["EUR", "ZEUR"].includes(x.asset));
        const coinSpend = g.find(x => x.type === 'spend' && !["EUR", "ZEUR"].includes(x.asset));
        const coinRecv = g.find(x => x.type === 'receive' && !["EUR", "ZEUR"].includes(x.asset));

        if (!coinRecv && !coinSpend) continue;
        if (!eurSpend && !eurRecv) continue;

        const asset = mapKrakenAsset((coinRecv ?? coinSpend).asset);
        const volume = coinRecv ? Number(coinRecv.amount) : -Number(coinSpend.amount);
        const cost = Math.abs(Number((eurSpend ?? eurRecv).amount));
        const price = Number((cost / Math.abs(volume)).toFixed(8));
        const time = dt((coinRecv ?? coinSpend).time);

        out.push({ time, asset, volume, cost, price, refid: (coinRecv ?? coinSpend).refid });
    }
    return out;
}

export async function getBaseFees(): Promise<BaseFee[]> {
    const { ledger } = await krakenPost('/0/private/Ledgers');
    return Object.values(ledger ?? {})
        .filter((r: any) => 
            r.type === 'trade' &&
            r.fee && Number(r.fee) > 0 &&
            r.asset !== 'EUR' && r.asset !== 'ZEUR'
        )
        .map((r: any) => ({
            time: dt(r.time),
            asset: mapKrakenAsset(r.asset.replace(/\\.\\w+$/, '')),
            volume: Number(r.fee),
            refid: r.refid
        }));
}

export async function getRewards(): Promise<RewardItem[]> {
    const { ledger } = await krakenPost("/0/private/Ledgers");
    return Object.values(ledger ?? {})
        .filter((r: any) => r.type === "reward" && Number(r.amount) > 0)
        .map((r: any) => ({
            time: dt(r.time),
            asset: mapKrakenAsset(r.asset),
            volume: Number(r.amount),
            refid: r.refid,
        }));
}