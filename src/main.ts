import { FundingResult } from './funding';
import { TradeResult } from './trade';
import { fmt, fmtEuro } from './utils/fmt';
import { info, error } from './utils/logger';
import { EarnTransactions } from './ledger';
import { mapKrakenAsset } from './utils/assetMapper';
import { dt } from './utils/dt';

interface AllDataResponse {
    portfolioValue: number;
    accountBalance: Record<string, { balance: string; hold_trade: string }>;
    tradeBalance: any;
    tradesHistory: { trades: Record<string, any> };
    deposits: FundingResult;
    withdrawals: FundingResult;
    buys: TradeResult;
    sells: TradeResult;
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

function renderEarnTable(items: EarnTransactions[]) {
    const header =
        '<tr><th>Datum</th><th>Asset</th><th>Typ</th>' +
        '<th class="num">Betrag</th>' +
        '<th class="num">Gebühr</th>' +
        '<th>Ref ID</th></tr>';

    const body = items
        .map(i =>
            row(
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

function renderBalance(value: number) {
    const el = document.getElementById('portfolio-balance');
    if (!el) {
        return;
    }

    el.innerHTML = `
    <span>Current Balance</span>
    <div>${fmtEuro(value, 2)}</div>
    `;
}

function renderBalanceExTable(balanceData: Record<string, { balance: string; hold_trade: string; }>) {
    const header =
        '<tr><th>Asset</th>' +
        '<th class="num">Total Balance</th>' +
        '<th class="num">In Order</th><tr>';

    const aggregatedBalance: Record<string, { balance: number; hold_trade: number }> = {};
    for (const [assetCode, data] of Object.entries(balanceData)) {
        const asset = mapKrakenAsset(assetCode);

        if (!aggregatedBalance[asset]) {
            aggregatedBalance[asset] = { balance: 0, hold_trade: 0 };
        }

        aggregatedBalance[asset].balance += parseFloat(data?.balance ?? '0');
        aggregatedBalance[asset].hold_trade += parseFloat(data?.hold_trade ?? '0');
    }

    const body = Object.entries(aggregatedBalance)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([asset, data]) => {
            if (data.balance === 0 && data.hold_trade === 0) return;
            const balanceDigits = asset === 'EUR' ? 2 : 8;

            return row([
                asset,
                fmt(data.balance, balanceDigits),
                fmt(data.hold_trade, 8)
            ], [1, 2]);
        })
        .join('');

    return `
    <section>
        <h2>Account Balance Details</h2>
        <table>
            <thead>${header}</thead>
            <tbody>${body}</tbody>
        </table>
    </section>`;
}

function renderTradeBalanceTable(tradeBalance: any) {
    if (!tradeBalance || Object.keys(tradeBalance).length === 0) {
        return `
        <section>
            <h2>Trade Balance</h2>
            <p>No Trade Balance available. Normal for accounts with no Margin-Trades.</p>
        </section>`;
    }

    const header = '<tr><th colspan="2">Trade Balance Summary</th></tr>';

    const rowsMap = [
        { key: 'eb', label: 'Equivalent Balance (Equity)' },
        { key: 'tb', label: 'Trade Balance (Collateral)' },
        { key: 'm', label: 'Margin Used' },
        { key: 'n', label: 'Unrealized P/L' },
        { key: 'c', label: 'Cost Basis of Positions' },
        { key: 'v', label: 'Floating Valuation of Positions' },
        { key: 'e', label: 'Equity' },
        { key: 'mf', label: 'Free Margin' },
        { key: 'ml', label: 'Margin Level' },
    ];

    const body = rowsMap.map(item => {
        const value = tradeBalance[item.key];
        if (value === undefined) return '';

        const formattedValue = item.key === 'ml'
            ? `${fmt(parseFloat(value), 2)} %`
            : fmtEuro(parseFloat(value));

        return row([item.label, formattedValue], [1]);
    }).join('');

    return `
    <section>
        <h2>Trade Balance</h2>
        <table>
            <thead>${header}</head>
            <tbody>${body}</tbody>
        </table>
    </section>`
}

function renderTradesHistoryTable(tradesHistory: { trades: Record<string, any> }) {
    if (!tradesHistory || !tradesHistory.trades || Object.keys(tradesHistory.trades).length === 0) {
        return `
        <section>
            <h2>Raw Trade History</h2>
            <p>No raw Trades-Data found.</p>
        </section>`;
    }

    const header =
        '<tr><th>Time</th><th>Pair</th><th>Type</th><th>Order Type</th>' +
        '<th class="num">Price</th>' +
        '<th class="num">Volume</th>' +
        '<th class="num">Cost</th>' +
        '<th class="num">Fee</th>' +
        '<th>Order ID</th></tr>';

    const trades = Object.values(tradesHistory.trades)
        .sort((a, b) => b.time - a.time);

    const body = trades.map(t =>
        row([
            dt(t.time),
            t.pair,
            t.type.toUpperCase(),
            t.ordertype,
            fmtEuro(parseFloat(t.price), 4),
            fmt(parseFloat(t.vol), 8),
            fmtEuro(parseFloat(t.cost), 2),
            fmtEuro(parseFloat(t.fee), 4),
            t.ordertxid,
        ], [4, 5, 6, 7])
    ).join('');

    return `
    <section>
        <h2>Raw Trade History</h2>
        <table>
            <thead>${header}</thead>
            <tbody>${body}</tbody>
        </table>
    </section>`;
}

async function load() {
    const el = document.getElementById('content');
    if (!el) {
        throw new Error('#content element not found');
    }

    info('[Main] Loading all page data from single endpoint');
    try {
        const res = await fetch('api/all-data');
        if (!res.ok) {
            const body = await res.json().catch(() => ({ error: `Servererror: ${res.status}` }));
            throw new Error(body.error ?? `HTTP ${res.status}`);
        }

        const data: AllDataResponse = await res.json();
        info('[Main] api/all-data OK');

        renderBalance(data.portfolioValue);

        let html =
            renderBalanceExTable(data.accountBalance) +
            renderTradeBalanceTable(data.tradeBalance) +
            renderTradesHistoryTable(data.tradesHistory) +
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