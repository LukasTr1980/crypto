import { dt } from './utils/dt';
import { krakenPost } from './utils/kraken';
import { info } from './utils/logger';
import { nextNonce } from './utils/nonce';

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

export async function fetchDepositsRaw(): Promise<any[]> {
    info('[Funding] Fetching raw deposits data');
    const params = new URLSearchParams({ nonce: nextNonce() });
    return await krakenPost('/0/private/DepositStatus', params);
}

export async function fetchWithdrawalsRaw(): Promise<any[]> {
    info('[Funding] Fetching raw withdrawal data');
    const params = new URLSearchParams({ nonce: nextNonce() });
    return await krakenPost('/0/private/WithdrawStatus', params);
}

export function processDeposits(rawDeposits: any[]): FundingResult {
    info('[Funding] Processing deposits');
    let gross = 0, feeSum = 0;

    const items = rawDeposits.map((d: any) => {
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
    info(`[Funding] Deposits processed: ${items.length}`);
    return {
        items,
        gross,
        feeSum,
        netTotal
    };
}

export function processWithdrawals(rawWithdrawals: any[]): FundingResult {
    info('[Funding] Processing withdrawals');
    let gross = 0, feeSum = 0;

    const items = rawWithdrawals.map((w: any) => {
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
    info(`[Funding] Withdrawals processed: ${items.length}`);
    return {
        items,
        gross,
        feeSum,
        netTotal
    };
}
