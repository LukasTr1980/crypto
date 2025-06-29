import axios from 'axios';
import dotenv from 'dotenv';
import { sha256, sha512 } from '@noble/hashes/sha2';
import { hmac } from '@noble/hashes/hmac';
import { base64 } from '@scure/base';
import { nextNonce } from './nonce';
import { info, error } from './logger';

dotenv.config();

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

export async function krakenPost(path: string): Promise<any> {
    const params = new URLSearchParams({ nonce: nextNonce() });
    const headers = {
        "API-Key": KEY,
        "API-Sign": sign(path, params, SECRET!),
        "Content-Type": "application/x-www-form-urlencoded",
    } as const;

    info(`[Kraken] POST ${path}`);
    const { data } = await axios.post(API_URL + path, params, { headers });
    if (data.error?.length) {
        error(`[Kraken] Error: ${data.error.join("; ")}`);
        throw new Error(data.error.join(";"));
    }
    return data.result;
}

async function krakenGet(path: string, params: Record<string, any> = {}) {
    info(`[Kraken] GET ${path}`);
    const { data } = await axios.get(API_URL + path, { params });
    if (data.error?.length) throw new Error(data.error.join(";"));
    return data.result;
}

export async function fetchPrices(pairs: string[]): Promise<Record<string, PriceQuote>> {
    if (!pairs.length) return {};

    info(`[Kraken] GET /0/public/Ticker?pair=${pairs.join(',')}`);
    const { data } = await axios.get(`${API_URL}/0/public/Ticker`, {
        params: { pair: pairs.join(',') },
    });

    if (data.error?.length) {
        error(`[Kraken] Ticker error: ${data.error.join("; ")}`);
        throw new Error(data.error.join("; "));
    }

    const out: Record<string, PriceQuote> = {};
    Object.entries(data.result).forEach(([pair, t]: any) => {
        out[pair] = {
            price: Number(t.c[0]),
            ts: new Date().toISOString(),
        };
    });
    return out;
}
