import { FundingResult } from './funding';
import { TradeResult, CoinSummary } from './trade';
import { fmt, fmtEuro } from './utils/fmt';
import { info, error } from './utils/logger';
import { EarnTransactions } from './ledger';

interface AllDataResponse {
    portfolioValue: number;
    deposits: FundingResult;
    withdrawals: FundingResult;
    buys: TradeResult;
    sells: TradeResult;
    coinSummary: CoinSummary[];
    earnTransactions: EarnTransactions[];
}

function row(cells: (string | number)[], numIdx: number[] = []) {
    return `<tr>${cells
        .map((c, i) => `<td${numIdx.includes(i) ? ' class="num"' : ''}>${c}</td>`)
        .join('')}</tr>`;
}

function renderFundingTable(result: FundingResult, caption: string) {
    const header =
        '<tr><th>Time</th><th>Asset</th>' +
        '<th class="num">Amount</th>' +
        '<th class="num">Fee</th>' +
        '<th class="num">Net</th></tr>';

    const body = result.items
        .map(i => row([
            i.time,
            i.asset,
            fmt(i.amount, 2),
            fmt(i.fee, 2),
            fmt(i.net, 2)
        ], [2, 3, 4]))
        .join('');

    const summary = row([
        '<strong>Total</strong>',
        '',
        `<strong>${fmt(result.gross, 2)}</strong>`,
        `<strong>${fmt(result.feeSum, 2)}</strong>`,
        `<strong>${fmt(result.netTotal, 2)}</strong>`,
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

function renderTradeTable(result: TradeResult, caption: string) {
    const header =
        '<tr><th>Time</th><th>Pair</th><th>Side</th>' +
        '<th class="num">Price €</th>' +
        '<th class="num">Volume</th>' +
        '<th class="num">Cost €</th>' +
        '<th class="num">Fee €</th></tr>';

    const body = result.items
        .map(t =>
            row(
                [
                    t.time,
                    t.pair,
                    t.type.toUpperCase(),
                    fmtEuro(t.price, 2),
                    fmt(t.volume, 8),
                    fmtEuro(t.cost, 2),
                    fmtEuro(t.fee, 2),
                ],
                [3, 4, 5, 6]
            )
        )
        .join('');

    const summary = row(
        [
            '<strong>Total</strong>',
            '',
            '',
            '',
            `<strong>${fmt(result.volumeTotal, 8)}</strong>`,
            `<strong>${fmtEuro(result.costTotal, 2)}</strong>`,
            `<strong>${fmtEuro(result.feeTotal, 8)}</strong>`
        ],
        [4, 5, 6]
    );

    return `
    <section>
        <h2>${caption}</h2>
        <table>
            <thead>${header}</thead>
            <tbody>${body}</tbody>
        </table>
    </section>`;
}

function renderCoinTable(list: CoinSummary[]) {
    const header =
        '<tr><th>Coin</th>' +
        '<th class="num">Buy €</th>' +
        '<th class="num">Buy (Coin)</th>' +
        '<th class="num">Ø Buy €/Coin</th>' +
        '<th class="num">Sell €</th>' +
        '<th class="num">Sell (Coin)</th>' +
        '<th class="num">Ø Sell €/Coin</th>' +
        '<th class="num">Net (Coin)</th>' +
        '<th class="num">Net €</th>' +
        '<th class="num">Fees €</th>' +
        '<th class="num">Fees (Coin)</th>' +
        '<th class="num">Realised €</th>' +
        '<th class="num">Unrealised €</th>' +
        '<th class="num">Total P/L €</th>' +
        '<th class="num">Total P/L %</th>' +
        '<th class="num">Reward (Coin)</th>' +
        '<th class="num">Price</th>' +
        '<th class="num">Quote TS</th></tr>';

    const body = list.map(c => {
        const formatPl = (pl: number): string => {
            const formattedPl = fmtEuro(pl, 2);
            if (pl > 0) {
                return `<span class="gain">${formattedPl}</span>`;
            }
            if (pl < 0) {
                return `<span class="loss">${formattedPl}</span>`
            }
            return formattedPl;
        };

        const formatPlPercent = (plPercent: number | null): string => {
            if (plPercent === null) {
                return '-';
            }
            const formattedPercent = `${fmt(plPercent, 2)}%`;
            if (plPercent > 0) return `<span class="gain">${formattedPercent}</span>`;
            if (plPercent < 0) return `<span class="loss">${formattedPercent}</span>`;
            return formattedPercent;
        }

        return row([
            c.asset,
            fmtEuro(c.buyCost, 2),
            fmt(c.buyVolume, 8),
            c.avgBuyPrice ? fmt(c.avgBuyPrice, 2) : '-',
            fmtEuro(c.sellProceeds, 2),
            fmt(c.sellVolume, 8),
            c.avgSellPrice ? fmt(c.avgSellPrice, 2) : '-',
            fmt(c.netVolume, 8),
            fmtEuro(c.netSpend, 2),
            fmtEuro(c.feeTotal, 2),
            fmt(c.coinFee, 8),
            fmtEuro(c.realised, 2),
            fmtEuro(c.unrealised, 2),
            formatPl(c.totalPL),
            formatPlPercent(c.totalPLPercent),
            fmt(c.rewardVolume, 8),
            fmtEuro(c.priceNow, 2),
            c.priceTs || '-',
        ], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    }).join('');

    return `<section><h2>Per-Coin Totals</h2><table><thead>${header}</thead><tbody>${body}</tbody></table></section>`;
}

function renderEarnTable(items: EarnTransactions[]) {
    const header =
        '<tr><th>Datum</th><th>Asset</th><th>Typ</th>' +
        '<th class="num">Betrag</th>' +
        '<th class="num">Gebühr</th>' +
        '<th>Ref ID</th></tr>';

    const body = items
        .map(i => 
            row (
                [
                    i.time,
                    i.asset,
                    i.type,
                    fmt(i.amount, 8),
                    fmt(i.fee, 8),
                    i.refid,
                ],
                [3, 4]
            )
        )
        .join('');

        return `
        <section>
            <h2>Earn Transactions</h2>
            <table>
                <thead>${header}</thead>
                <tbody>${body}</tbody>
            </table>
        </section>`;
}

function renderBalance (value: number) {
    const el = document.getElementById('portfolio-balance');
    if (!el) {
        return;
    }

    el.innerHTML = `
    <span>Current Balance</span>
    <div>${fmtEuro(value, 2)}</div>
    `;
}

async function load() {
    const el = document.getElementById('content');
    if (!el) {
        throw new Error('#content element not found');
    }

    info('[Main] Loading all page data from single endpoint');
    try {
        const res = await fetch('/api/all-data');
        if (!res.ok) {
            const body = await res.json().catch(() => ({ error: `Servererror: ${res.status}` }));
            throw new Error(body.error ?? `HTTP ${res.status}`);
        }

        const data: AllDataResponse = await res.json();
        info('[Main] /api/all-data OK');

        renderBalance(data.portfolioValue);

        let html =
            renderCoinTable(data.coinSummary) +
            renderEarnTable(data.earnTransactions) +
            renderTradeTable(data.buys, 'Buys') +
            renderTradeTable(data.sells, 'Sells') +
            renderFundingTable(data.deposits, 'Deposits') +
            renderFundingTable(data.withdrawals, 'Withdrawals');

        el.innerHTML = html;
        info('[Main] Page data loaded and rendered');
    } catch (err: any) {
        el.innerHTML = `<p style="color:red">Error while loading data: ${err.message}</p>`;
        error(err);
    }
}

document.addEventListener('DOMContentLoaded', load);