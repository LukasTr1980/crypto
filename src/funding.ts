import axios from 'axios';
import dotenv from 'dotenv';
import { sha256, sha512 } from '@noble/hashes/sha2';
import { hmac } from '@noble/hashes/hmac';
import { base64 } from '@scure/base';
import { nextNonce } from './utils/nonce';

dotenv.config();

const API_URL = 'https://api.kraken.com';

// ---- Schlüssel prüfen ----------------------------------------------------
const KEY = process.env.KRAKEN_API_KEY;
const SECRET = process.env.KRAKEN_API_SECRET;
if (!KEY || !SECRET) {
    console.error('[Fehler] API-Schlüssel fehlen (.env prüfen)');
    process.exit(1);
}

// ---- Signaturhilfe -------------------------------------------------------
function sign(path: string, params: URLSearchParams, secretB64: string) {
    const nonce = params.get('nonce')!;
    const hash = sha256(new TextEncoder().encode(nonce + params.toString()));
    const msg = new Uint8Array([...new TextEncoder().encode(path), ...hash]);

    const sig = hmac(sha512, base64.decode(secretB64), msg);
    return base64.encode(sig);
}

// ---- Generischer POST-Call ----------------------------------------------
async function krakenPost(path: string) {
    const params = new URLSearchParams({ nonce: nextNonce() });
    const headers = {
        'API-Key': KEY!,
        'API-Sign': sign(path, params, SECRET!),
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    const { data } = await axios.post(API_URL + path, params, { headers });
    if (data.error?.length) throw new Error(data.error.join('; '));
    return data.result;
}

// ---- Spezifische Aufrufe -------------------------------------------------
function dt(ts: number) {
    return new Date(ts * 1000).toLocaleString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).replace(',', '');
}

function format(val: string | number): string {
    return Number(val).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function showDeposits(): Promise<number> {
    const res = await krakenPost('/0/private/DepositStatus');
    let gross = 0, feeSum = 0;
    console.log('\n=== DEPOSIT ===');

    res.forEach((d: any) => {
        gross += Number(d.amount);
        feeSum += Number(d.fee);
        const net = Number(d.amount) - Number(d.fee);

        console.log(
            `${dt(d.time)} | ${d.asset} | `
            + `Brutto ${format(d.amount)} | Fee ${format(d.fee)} | Netto ${format(net)}`
        );
    });

    const netTotal = gross - feeSum;
    console.log(
        `» Summe Einzahlungen: Brutto ${format(gross)} ` +
        `Gebühren ${format(feeSum)} Netto ${format(gross - feeSum)} ${res[0]?.asset || ''}\n`
    );
    return netTotal;
}

export async function showWithdrawals(): Promise<number> {
    const res = await krakenPost('/0/private/WithdrawStatus');
    let gross = 0, feeSum = 0;
    console.log('\n=== WITHDRAWAL ===');

    res.forEach((w: any) => {
        gross += Number(w.amount);
        feeSum += Number(w.fee);
        const totalOut = Number(w.amount) + Number(w.fee);

        console.log(
            `${dt(w.time)} | ${w.asset} | `
            + `Brutto ${format(w.amount)} | Fee ${format(w.fee)} | Gesamtbelastung ${format(totalOut)}`
        );
    });

    const netOut = gross + feeSum;

    console.log(
        `» Summe Auszahlungen: Brutto ${format(gross)} ` +
        `Gebühren ${format(feeSum)} Gesamt ${format(gross + feeSum)} ${res[0]?.asset || ''}\n`
    );

    return netOut;
}
