import axios from 'axios';
import dotenv from 'dotenv';
import { sha256, sha512 } from '@noble/hashes/sha2';
import { hmac } from '@noble/hashes/hmac';
import { base64 } from '@scure/base';
import { nextNonce } from './nonce';

dotenv.config();

const API_URL = 'https://api.kraken.com';

const KEY = process.env.KRAKEN_API_KEY;
const SECRET = process.env.KRAKEN_API_SECRET;
if (!KEY || !SECRET) {
    console.error('[Fehler] API-Schlüssel fehlen (.env prüfen)');
    process.exit(1);
}

function sign(path: string, params: URLSearchParams, secretB64: string): string {
    const nonce = params.get('nonce')!;
    const hash = sha256(new TextEncoder().encode(nonce + params.toString()));
    const msg = new Uint8Array([...new TextEncoder().encode(path), ...hash]);

    const sig = hmac(sha512, base64.decode(secretB64), msg);
    return base64.encode(sig);
}

export async function krakenPost(path: string) {
    const params = new URLSearchParams({ nonce: nextNonce() });
    const headers = {
        'API-Key': KEY!,
        'API-Sign': sign(path, params, SECRET!),
        'Content-Type': 'application/x-www-form-urlencoded'
    };

    console.log(`[Kraken] POST ${path}`);
    try {
        const { data } = await axios.post(API_URL + path, params, { headers });
        if (data.error?.length) {
            console.error(`[Kraken] Error: ${data.error.join('; ')}`);
            throw new Error(data.error.join('; '));
        }
        return data.result;
    } catch (err: any) {
        console.error(`[Kraken] Request failed: ${err.message}`);
        throw err;
    }
}

export async function fetchPrices(pairs: string[]): Promise<Record<string, number>> {
    const url = 'https://api.kraken.com/0/public/Ticker?pair=' + pairs.join(',');
    const { result } = await (await fetch(url)).json();
    const out: Record<string, number> = {};
    for (const [pair, data] of Object.entries<any>(result)) {
        out[pair] = Number(data.c[0]);
    }
    return out;
}