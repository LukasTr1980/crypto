import axios from 'axios';
import PQueue from 'p-queue';
import dotenv from 'dotenv';
import { sha256, sha512 } from '@noble/hashes/sha2';
import { hmac } from '@noble/hashes/hmac';
import { base64 } from '@scure/base';
import { nextNonce } from './nonce';
import { info, error } from './logger';

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

export interface PriceQuote {
    price: number;
    ts: string;
}

function sign(path: string, params: URLSearchParams, secretB64: string): string {
    const nonce = params.get('nonce')!;
    const hash = sha256(new TextEncoder().encode(nonce + params.toString()));
    const msg = new Uint8Array([...new TextEncoder().encode(path), ...hash]);

    const sig = hmac(sha512, base64.decode(secretB64), msg);
    return base64.encode(sig);
}

async function doKrakenPost(path: string, params: URLSearchParams): Promise<any> {
    const headers = {
        "API-Key": KEY,
        "API-Sign": sign(path, params, SECRET!),
        "Content-Type": "application/x-www-form-urlencoded",
    } as const;

    info(`[Kraken] POST ${path} (Nonce: ${params.get('nonce')})`);
    const { data } = await axios.post(API_URL + path, params, { headers });
    if (data.error?.length) {
        error(`[Kraken] Error: ${data.error.join("; ")}`);
        throw new Error(data.error.join(";"));
    }
    return data.result;
}

export function krakenPost(
    path: string,
    params: URLSearchParams
): Promise <any> {
    return privateQueue.add(() => doKrakenPost(path, params));
}

export async function fetchAllLedgers(): Promise<any[]> {
    info('[Kraken] Fetching all ledger entries with pagination...');
    let offset = 0;
    let allLedgers: any[] = [];
    let totalCount = 0;
    let ledgerPage: any[] = [];

    do {
        const params = new URLSearchParams({ nonce: nextNonce(), ofs: offset.toString() });
        const result = await krakenPost('/0/private/Ledgers', params);

        ledgerPage = Object.entries(result.ledger ?? {}).map(([txid, data]) => ({
            txid,
            ...(data as Object)
        }));
        allLedgers = allLedgers.concat(ledgerPage);

        if (totalCount === 0) {
            totalCount = Number(result.count);
        }

        offset += ledgerPage.length;
        if (totalCount > 0) {
            info(`[Kraken] Fetched ${allLedgers.length} of ${totalCount} ledger entries...`);
        }

    } while (offset < totalCount && ledgerPage.length > 0);

    info(`[Kraken] Finished fetching. Total ledger entries ${allLedgers.length}`);
    return allLedgers;
}

export async function fetchAllTradesHistory(): Promise<any> {
    info('[Kraken] Fetching all trades history with pagination...');
    let offset = 0;
    let allTrades: any[] = [];
    let totalCount = 0;
    
    do {
        const params = new URLSearchParams({ nonce: nextNonce(), ofs: offset.toString() });
        const result = await krakenPost('/0/private/TradesHistory', params);
        const tradesPage = Object.values(result.trades ?? {});

        allTrades = allTrades.concat(tradesPage);

        if (totalCount === 0) {
            totalCount = Number(result.count);
        }

        offset += tradesPage.length;
        if (totalCount > 0) {
            info(`[Kraken] Fetched ${allTrades.length} of ${totalCount} trades...`);
        }
    } while (offset < totalCount);

    info(`[Kraken] Finished fetching. Total trades: ${allTrades.length}`);

    const tradesAsObject = allTrades.reduce((obj, trade) => {
        obj[trade.ordertxid + trade.postxid] = trade;
        return obj;
    }, {});

    return { trades: tradesAsObject, count: allTrades.length };
}

export async function fetchAccountBalance(): Promise<Record<string, { balance: string; hold_trade: string; }>> {
    info('[Kraken] Fetching account balance');
    const params = new URLSearchParams({ nonce: nextNonce() });
    return krakenPost('/0/private/BalanceEx', params);
}

export async function fetchTradeBalance(): Promise<any> {
    info('[Kraken] Fetching Trade Balance');
    const params = new URLSearchParams({ nonce: nextNonce() });
    return krakenPost('/0/private/TradeBalance', params);
}

export async function fetchPrices(): Promise<any> {
    info('[Kraken] GET /public/Ticker (all pairs)');
    const { data } = await axios.get(`${API_URL}/0/public/Ticker`);

    if (data.error?.length) {
        error(`[Kraken] Ticker error: ${data.error.join("; ")}`);
        throw new Error(data.error.join("; "));
    }

    info(`[Kraken] Returned ${Object.keys(data.result).length} total price tickers.`);
    return data.result;
}