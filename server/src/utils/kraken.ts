import axios from 'axios';
import PQueue from 'p-queue';
import dotenv from 'dotenv';
import { sha256, sha512 } from '@noble/hashes/sha2';
import { hmac } from '@noble/hashes/hmac';
import { base64 } from '@scure/base';
import { nextNonce } from './nonce';
import { info, error } from './logger';
import type {
    LedgerEntry,
    KrakenTrade,
    KrakenTickerMap,
    AccountBalance,
    TradeBalance,
    KrakenApiResponse,
    KrakenLedgerResponse,
    KrakenTradesHistoryResponse,
} from '../types';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const API_URL = 'https://api.kraken.com';
const privateQueue = new PQueue({ concurrency: 1 });

const KEY = process.env.KRAKEN_API_KEY;
const SECRET = process.env.KRAKEN_API_SECRET;
if (!KEY || !SECRET) {
    error('[Fehler] API-Schlüssel fehlen (.env prüfen)');
    process.exit(1);
}


function sign(path: string, params: URLSearchParams, secretB64: string): string {
    const nonce = params.get('nonce')!;
    const hash = sha256(new TextEncoder().encode(nonce + params.toString()));
    const msg = new Uint8Array([...new TextEncoder().encode(path), ...hash]);

    const sig = hmac(sha512, base64.decode(secretB64), msg);
    return base64.encode(sig);
}

async function doKrakenPost<T>(path: string, params: URLSearchParams): Promise<T> {
    const headers = {
        "API-Key": KEY,
        "API-Sign": sign(path, params, SECRET!),
        "Content-Type": "application/x-www-form-urlencoded",
    } as const;

    info(`[Kraken] POST ${path} (Nonce: ${params.get('nonce')})`);
    const { data } = await axios.post<KrakenApiResponse<T>>(API_URL + path, params, { headers });
    if (data.error?.length) {
        error(`[Kraken] Error: ${data.error.join("; ")}`);
        throw new Error(data.error.join(";"));
    }
    return data.result;
}

export function krakenPost<T>(
    path: string,
    params: URLSearchParams,
): Promise<T> {
    return privateQueue.add<T>(() => doKrakenPost<T>(path, params), {throwOnTimeout: true});
}

export async function fetchAllLedgers(): Promise<LedgerEntry[]> {
    info('[Kraken] Fetching all ledger entries with pagination...');
    let offset = 0;
    let allLedgers: LedgerEntry[] = [];
    let totalCount = 0;

    do {
        const params = new URLSearchParams({ nonce: nextNonce(), ofs: offset.toString() });
        const result = await krakenPost<KrakenLedgerResponse>('/0/private/Ledgers', params);

        const page = Object.entries(result.ledger).map(([txid, l]) => ({ txid, ...l }));
        allLedgers = allLedgers.concat(page);

        totalCount = result.count;
        offset += page.length;
        info(`[Kraken] Fetched ${allLedgers.length}/${totalCount} ledgers...`);

    } while (offset < totalCount);
    return allLedgers;
}

export async function fetchAllTradesHistory(): Promise<{
    trades: Record<string, KrakenTrade>;
    count: number;
}> {
    info('[Kraken] Fetching all trades history with pagination...');
    let offset = 0;
    let allTrades: KrakenTrade[] = [];
    let totalCount = 0;

    do {
        const params = new URLSearchParams({ nonce: nextNonce(), ofs: offset.toString() });
        const result = await krakenPost<KrakenTradesHistoryResponse>('/0/private/TradesHistory', params);

        const page = Object.values(result.trades);
        allTrades = allTrades.concat(page);

        totalCount = result.count;
        offset += page.length;
        info(`[Kraken] Fetched ${allTrades.length}/${totalCount} trades...`);
    } while (offset < totalCount);

    const byId: Record<string, KrakenTrade> = {};
    for (const t of allTrades) byId[`${t.ordertxid}${t.postxid}`] = t;

    return { trades: byId, count: allTrades.length };
}

export async function fetchAccountBalance(): Promise<AccountBalance> {
    info('[Kraken] Fetching account balance');
    const params = new URLSearchParams({ nonce: nextNonce() });
    return krakenPost<AccountBalance>('/0/private/BalanceEx', params);
}

export async function fetchTradeBalance(): Promise<TradeBalance> {
    info('[Kraken] Fetching Trade Balance');
    const params = new URLSearchParams({ nonce: nextNonce() });
    return krakenPost<TradeBalance>('/0/private/TradeBalance', params);
}

export async function fetchPrices(): Promise<KrakenTickerMap> {
    info('[Kraken] GET /public/Ticker (all pairs)');
    const { data } = await axios.get<KrakenApiResponse<KrakenTickerMap>>(`${API_URL}/0/public/Ticker`);

    if (data.error?.length) {
        error(`[Kraken] Ticker error: ${data.error.join("; ")}`);
        throw new Error(data.error.join("; "));
    }

    info(`[Kraken] Returned ${Object.keys(data.result).length} total price tickers.`);
    return data.result;
}