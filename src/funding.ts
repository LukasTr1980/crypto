import { dt } from './utils/dt';
import { krakenPost } from './utils/kraken';
import { info, error } from './utils/logger';

export interface FundingItem {
    time: string;
    asset: string;
    amount: number;
    fee: number;
    net: number;
}

export interface FundingResult {
    items: FundingItem[];
    gross: number;
    feeSum: number;
    netTotal: number;
}

export async function showDeposits(): Promise<FundingResult> {
    info('[Funding] showDeposits start');
    const res = await krakenPost('/0/private/DepositStatus');
    let gross = 0, feeSum = 0;

    const items = res.map((d: any) => {
        const amount = Number(d.amount);
        const fee = Number(d.fee);
        const net = amount - fee;
        gross += amount;
        feeSum += fee;
        return {
            time: dt(d.time),
            asset: d.asset,
            amount,
            fee,
            net,
        } as FundingItem;
    });

    const netTotal = gross - feeSum;
    info(`[Funding] Deposits loaded: ${items.length}`);
    return {
        items,
        gross,
        feeSum,
        netTotal
    };
}

export async function showWithdrawals(): Promise<FundingResult> {
    info('[Funding] showWithdrawals start');
    const res = await krakenPost('/0/private/WithdrawStatus');
    let gross = 0, feeSum = 0;

    const items = res.map((w: any) => {
        const amount = Number(w.amount);
        const fee = Number(w.fee);
        const net = amount + fee;
        gross += amount;
        feeSum += fee;
        return {
            time: dt(w.time),
            asset: w.asset,
            amount,
            fee,
            net,
        } as FundingItem;
    });

    const netTotal = gross + feeSum;
    info(`[Funding] Withdrawals loaded: ${items.length}`);
    return {
        items,
        gross,
        feeSum,
        netTotal
    };
}
