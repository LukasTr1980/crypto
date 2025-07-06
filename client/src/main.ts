import { fmt, fmtEuro } from './utils/fmt';
import { info, error } from './utils/logger';
import { dt } from './utils/dt';

interface AllDataResponse {
    accountBalance: Record<string, { balance: string; hold_trade: string }>;
    tradeBalance: any;
    tradesHistory: { trades: Record<string, any> };
    ledgers: any[];
    btcValue: { btcBalance: number; eurValue: number; btcPrice: number; } | null;
}

function row(cells: (string | number)[], numIdx: number[] = []) {
    return `<tr>${cells
        .map((c, i) => `<td${numIdx.includes(i) ? ' class="num"' : ''}>${c}</td>`)
        .join('')}</tr>`;
}

function renderBtcValueTable(btcValue: { btcBalance: number; eurValue: number; btcPrice: number } | null) {
    if (!btcValue) {
        return '<section><h2>Calculated BTC Value</h2><p>No BTC balance found to calculate value.</p></section>';
    }

    const header = '<tr><th>Description</th><th class="num">Value</th></tr>';
    const body = [
        row(['BTC Balance', fmt(btcValue.btcBalance, 8)], [1]),
        row(['Current BTC Price', fmt(btcValue.btcPrice, 2)], [1]),
        row(['Value in EUR', fmt(btcValue.eurValue, 2)], [1]),
    ].join('');

    return `<section><h2>Calculated BTC Value</h2><table><thead>${header}</thead><tbody>${body}</body></table></section>`;
}

function renderBalanceExTable(balanceData: Record<string, { balance: string; hold_trade: string; }>) {
    const header =
        '<tr><th>Asset</th>' +
        '<th class="num">Total Balance</th>' +
        '<th class="num">In Order</th><tr>';

    const body = Object.entries(balanceData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([assetCode, data]) => {
            const balance = parseFloat(data?.balance ?? '0');
            const hold_trade = parseFloat(data?.hold_trade ?? '0');

            if (balance === 0 && hold_trade === 0) return '';

            const isEur = assetCode.toUpperCase().includes('EUR');
            const balanceDigits = isEur ? 2 : 8;

            return row([
                assetCode,
                fmt(balance, balanceDigits),
                fmt(hold_trade, 8)
            ], [1, 2]);
        })
        .join('');

    return `
    <section>
        <h2>Raw Account Balance Details</h2>
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
            <h2>Raw Trade Balance</h2>
            <p>No Raw Trade Balance available. Normal for accounts with no Margin-Trades.</p>
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
        <h2>Raw Trade Balance</h2>
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

function renderLedgersTable(ledgers: any[]) {
    if (!ledgers || ledgers.length === 0) {
        return `
        <section>
            <h2>Raw Ledger</h2>
            <p>No Ledger-Data found.</p>
        </section>`
    }

    const header =
        '<tr><th>Time</th><th>Asset</th><th>Type</th><th>Subtype</th>' +
        '<th class="num">Amount</th>' +
        '<th class="num">Fee</th>' +
        '<th class="num">Balance</th>' +
        '<th>Ref ID</th></tr>';

    const body = ledgers
        .sort((a, b) => b.time - a.time)
        .map(l => {
            const isEur = l.asset.toUpperCase().includes('EUR');
            return row([
                dt(l.time),
                l.asset,
                l.type,
                l.subtype || '-',
                fmt(parseFloat(l.amount), isEur ? 2 : 8),
                fmt(parseFloat(l.fee), isEur ? 2 : 8),
                fmt(parseFloat(l.balance), isEur ? 2 : 8),
                l.refid,
            ], [4, 5, 6]);
        })
        .join('');

    return `
    <section>
        <h2>Raw Ledger</h2>
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

        let html =
            renderBtcValueTable(data.btcValue) +
            renderBalanceExTable(data.accountBalance) +
            renderTradeBalanceTable(data.tradeBalance) +
            renderTradesHistoryTable(data.tradesHistory) +
            renderLedgersTable(data.ledgers);

        el.innerHTML = html;
        info('[Main] Page data loaded and rendered');
    } catch (err: any) {
        el.innerHTML = `<p style="color:red">Error while loading data: ${err.message}</p>`;
        error(err);
    }
}

document.addEventListener('DOMContentLoaded', load);