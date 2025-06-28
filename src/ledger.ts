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

export async function getInstantBuys(): Promise<InstantTrade[]> {
    const { ledger } = await krakenPost('/0/private/Ledgers');
    const rows = Object.values(ledger ?? {}) as any[];

    const buckets: Record<string, any[]> = {};
    rows.forEach(r => {
        if (!['spend', 'receive'].includes(r.type)) return;
        (buckets[r.refid] = buckets[r.refid] ?? []).push(r);
    });

    return Object.values(buckets).flatMap(g => {
        const spend = g.find(x => x.type === 'spend' && ['EUR', 'ZEUR'].includes(x.asset) && Number(x.amount) < 0);
        const receive = g.find(x => x.type === 'receive' && x.asset !== 'EUR');
        if (!spend || !receive) return [];
        const cost = Math.abs(Number(spend.amount));
        const volume = Number(receive.amount);
        return [{
            time: dt(receive.time),
            asset: mapKrakenAsset(receive.asset),
            volume,
            cost,
            price: Number((cost / volume).toFixed(8)),
            refid: receive.refid,
        }];
    });
}