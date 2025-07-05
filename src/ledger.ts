import { dt } from "./utils/dt";
import { mapKrakenAsset } from "./utils/assetMapper";
import { debug, info } from "./utils/logger";

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

export interface EarnTransactions {
    time: string;
    asset: string;
    type: 'Prämie' | 'Überweisung';
    amount: number;
    fee: number;
    refid: string;
}

export function getInstantTrades(ledgerRows: any[]): InstantTrade[] {
    info('[Ledger] getInstantTrades start');
    const bucket: Record<string, any[]> = {};
    ledgerRows.forEach(r => (bucket[r.refid] = [...(bucket[r.refid] ?? []), r]));

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

export function getBaseFees(ledgerRows: any[]): BaseFee[] {
    info('[Ledger] getBaseFees start');
    return ledgerRows
        .filter((r: any) => 
            ['trade', 'reward', 'staking'].includes(r.type) &&
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

export function getRewards(ledgerRows: any[]): RewardItem[] {
    info('[Ledger] getRewards start');
    const rewards = ledgerRows
        .filter((r: any) => (r.type === "reward" || r.subtype === "reward") && Number(r.amount) > 0)
        .map((r: any) => {
            debug(`[RAW REWARD DETECTED] Asset: '${r.asset}', Amount: ${r.amount}, RefID: ${[r.refid]}`);

            const amount = Number(r.amount) || 0;
            const fee = Number(r.fee) || 0;
            const netVolume = amount -fee;

            return {
            time: dt(r.time),
            asset: mapKrakenAsset(r.asset),
            volume: netVolume,
            refid: r.refid,
            }
        });
    info(`[Ledger] Found ${rewards.length} reward items (inlc. Earn Rewards).`);
    return rewards;
}

export function getEarnTransactions(ledgerRows: any[]): EarnTransactions[] {
    info("[Ledger] getEarnTransactions (Final Version 3.0)");

    const transactions = ledgerRows
        .filter((r: any) =>
            r.type === "reward" || r.type === "staking" ||
            (r.type === "transfer" && r.subtype === "autoallocate" && Number(r.amount) > 0)
        )
        .map((r: any): EarnTransactions => {
            // GEÄNDERT: Wir speichern Brutto-Betrag und Gebühr getrennt
            const grossAmount = Number(r.amount) || 0;
            const fee = Number(r.fee) || 0;
            return {
                time: dt(r.time),
                asset: mapKrakenAsset(r.asset),
                type: (r.type === 'reward' || r.type === 'staking') ? 'Prämie' : 'Überweisung',
                amount: grossAmount, // <-- Dies ist jetzt der Brutto-Betrag
                fee: fee,           // <-- Dies ist die Gebühr
                refid: r.txid,
            }
        })
        .sort((a, b) => {
            const parseGermanDate = (dateString: string) => {
                const [datePart, timePart] = dateString.split(' ');
                const [day, month, year] = datePart.split('.');
                return new Date(`${year}-${month}-${day}T${timePart}`);
            };
            return parseGermanDate(b.time).getTime() - parseGermanDate(a.time).getTime();
        });

    info(`[Ledger] Korrekt gefiltert: ${transactions.length} Earn-Transaktionen.`);
    return transactions;
}
