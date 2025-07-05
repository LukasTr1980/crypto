import axios from 'axios';
import dotenv from 'dotenv';
import { sha256, sha512 } from '@noble/hashes/sha2';
import { hmac } from '@noble/hashes/hmac';
import { base64 } from '@scure/base';
import { nextNonce } from './nonce';
import { info, error, debug } from './logger';

info(process.env.NODE_ENV);

if (process.env.NODE_ENV !== 'production') {
    dotenv.config();
}

const API_URL = 'https://api.kraken.com';

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

export async function krakenPost(path: string, params: URLSearchParams): Promise<any> {
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
        info(`[Kraken] Fetched ${allLedgers.length} of ${totalCount} ledger entries...`);

    } while (offset < totalCount && ledgerPage.length > 0);

    info(`[Kraken] Finished fetching. Total ledger entries ${allLedgers.length}`);
    return allLedgers;
}

export async function fetchTradesHistory(): Promise<any> {
    const params = new URLSearchParams({ nonce: nextNonce() });
    return krakenPost('/0/private/TradesHistory', params);
}

export async function fetchAccountBalance(): Promise<Record<string, string>> {
    info('[Kraken] Fetching account balance');
    const params = new URLSearchParams({ nonce: nextNonce() });
    return krakenPost('/0/private/BalanceEx', params);
}

export async function fetchPrices(pairs: string[]): Promise<Record<string, PriceQuote>> {
    if (!pairs.length) return {};

    info(`[Kraken] GET /0/public/Ticker?pair=${pairs.join(',')}`);
    const { data } = await axios.get(`${API_URL}/0/public/Ticker`, {
        params: { pair: pairs.join(',') },
    });

    debug('[Ticker raw]', JSON.stringify(data.result.USDGEUR ?? data.result.USDGZEUR, null, 2));

    if (data.error?.length) {
        error(`[Kraken] Ticker error: ${data.error.join("; ")}`);
        throw new Error(data.error.join("; "));
    }

    const out: Record<string, PriceQuote> = {};
    for (const [pair, t] of Object.entries<any>(data.result)) {
        let p = Number(t.c?.[0] ?? 0);

        if (!p || p === 0) {
            const ask = Number(t.a?.[0] ?? 0);
            const bid = Number(t.b?.[0] ?? 0);
            if (ask && bid) p = (ask + bid) / 2;
            else if (ask) p = ask;
            else if (bid) p = bid;
        }

        if (p > 0) {
            out[pair] = { price: p, ts: new Date().toISOString() };
        } else {
            debug(`[Ticker] No usable price for ${pair} - ask=${t.a?.[0]} bid=${t.b?.[0]} last=${t.c?.[0]}`);
        }
    }

    info(`[Kraken] Returned ${Object.keys(out).length} usable pairs`);
    return out;
}
