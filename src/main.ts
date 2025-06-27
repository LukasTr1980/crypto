import { formatDate } from './utils/formatDate';

interface FundingItem {
    time: string;
    asset: string;
    amount: number;
    fee: number;
    net: number;
}

interface FundingResult {
    items: FundingItem[];
    gross: number;
    feeSum: number;
    netTotal: number;
}

interface FundingResponse {
    deposits: FundingResult;
    withdrawals: FundingResult;
}

function row(cells: (string | number)[], numIdx: number[] = []) {
    return `<tr>${cells
        .map((c, i) => `<td${numIdx.includes(i) ? ' class="num"' : ''}>${c}</td>`)
        .join('')}</tr>`;
}

function renderTable(result: FundingResult, caption: string) {
    const header =
        '<tr><th>Time</th><th>Asset</th>' +
        '<th class="num">Amount</th>' +
        '<th class="num">Fee</th>' +
        '<th class="num">Net</th></tr>';

    const body = result.items
        .map(i => row([i.time, i.asset, i.amount, i.fee, i.net], [2, 3, 4]))
        .join('');

    const summary = row([
        '<strong>Total</strong>',
        '',
        `<strong>${formatDate(result.gross)}</strong>`,
        `<strong>${formatDate(result.feeSum)}</strong>`,
        `<strong>${formatDate(result.netTotal)}</strong>`,
    ]);

    return `
    <section>
        <h2>${caption}</h2>
        <table>
            <thead>${header}</thead>
            <tbody>${body}</tbody>
            <tfoot>${summary}</tfoot>
        </table>
    </section>`;
}

async function load() {
    const el = document.getElementById('content');
    if (!el) {
        throw new Error('#content element not found');
    }

    try {
        const res = await fetch('/api/funding');
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data: FundingResponse = await res.json();

        el.innerHTML =
            renderTable(data.deposits, 'Deposits') +
            renderTable(data.withdrawals, 'Withdrawals');
    } catch (err: any) {
        el.innerHTML = `<p style="color:red">Fehler: ${err.message}</p>`;
        console.error(err);
    }
}

load();