import { krakenPost } from './utils/kraken';

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
