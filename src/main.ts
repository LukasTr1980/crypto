import { FundingResult } from './funding';
import { TradeResult, CoinSummary } from './trade';
import { fmt, fmtEuro } from './utils/fmt';

interface FundingResponse {
    deposits: FundingResult;
    withdrawals: FundingResult;
}

interface TradeResponse {
    buys: TradeResult;
    sells: TradeResult;
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
        ], [2,3,4]))
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
        '<th class="num">Fees (Coin)</th></tr>';

    const body = list.map(c => row([
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
        fmt(c.coinFee, 8)
    ], [1,2,3,4,5,6,7,8,9,10])).join('');

    return `<section><h2>Per-Coin Totals</h2><table><thead>${header}</thead><tbody>${body}</tbody></table></section>`;
}

async function load() {
    const el = document.getElementById('content');
    if (!el) {
        throw new Error('#content element not found');
    }

    try {
        const fundingRes = await fetch('/api/funding');
        if (!fundingRes.ok) {
            const body = await fundingRes.json().catch(() => ({}));
            throw new Error (body.error ?? `HTTP ${fundingRes.status}`);
        }

        const funding: FundingResponse = await fundingRes.json();

        const tradesRes = await fetch('/api/trades');
        if (!tradesRes.ok) {
            const body = await tradesRes.json().catch(() => ({}));
            throw new Error (body.error ?? `HTTP ${tradesRes.status}`);
        }

        const trades: TradeResponse = await tradesRes.json();
        
        const summaryRes = await fetch('/api/coin-summary');
        const summary: CoinSummary[] = await summaryRes.json();

        let html = 
            renderFundingTable(funding.deposits, 'Deposits') +
            renderFundingTable(funding.withdrawals, 'Withdrawals') +
            renderTradeTable(trades.buys, 'Buys') +
            renderTradeTable(trades.sells, 'Sells') +
            renderCoinTable(summary);
        
        el.innerHTML = html;

    } catch (err: any) {
        el.innerHTML = `<p style="color:red">Fehler: ${err.message}</p>`;
        console.error(err);
    }

}

load();