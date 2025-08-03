import React, { useEffect, useState } from "react";
import { fmt, fmtEuro } from "./utils/fmt";
import { dt } from "./utils/dt";
import Notes from "./Notes";
import { apiUrl } from "./utils/api";
import AssetValueTable from "./components/AssetValueTable";
import ProfitTable from "./components/ProfitTable";
import type {
    AssetValue,
    Ledger,
    TradeBalance,
    Trade,
    AverageBuyPricesStats,
    FundingSummaryStats,
    AverageSellPricesStats,
    PnlStats,
    AllData,
} from "./types";

const BalanceExTable = ({ balanceData }: { balanceData: Record<string, { balance: string; hold_trade: string; }> }) => {
    const sortedEntries = Object.entries(balanceData)
        .map(([assetCode, data]) => ({
            assetCode,
            balance: parseFloat(data?.balance ?? '0'),
            hold_trade: parseFloat(data?.hold_trade ?? '0'),
        }))
        .filter(({ balance, hold_trade }) => balance != 0 || hold_trade != 0)
        .sort((a, b) => a.assetCode.localeCompare(b.assetCode));

    return (
        <section>
            <h2>Raw Account Balance Details</h2>
            <table>
                <thead>
                    <tr>
                        <th>Asset</th>
                        <th className="num">Total Balance</th>
                        <th className="num">In Order</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedEntries.map(({ assetCode, balance, hold_trade }) => {
                        const isEur = assetCode.toUpperCase().includes('EUR');
                        return (
                            <tr key={assetCode}>
                                <td>{assetCode}</td>
                                <td className="num">{fmt(balance, isEur ? 2 : 8)}</td>
                                <td className="num">{fmt(hold_trade, 8)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </section>
    );
};

const TradeBalanceTable = ({ tradeBalance }: { tradeBalance: TradeBalance }) => {
    if (!tradeBalance || Object.keys(tradeBalance).length === 0) {
        return (
            <section>
                <h2>Raw Trade Balance</h2>
                <p>No Raw Trade Balance available. Normal for accounts with no Margin-Trades.</p>
            </section>
        );
    }

    const rowsMap: { key: keyof TradeBalance; label: string }[] = [
        { key: 'eb', label: 'Equivalent Balance (Equity)' }, { key: 'tb', label: 'Trade Balance (Collateral)' },
        { key: 'm', label: 'Margin Used' }, { key: 'n', label: 'Unrealized P/L' },
        { key: 'c', label: 'Cost Basis of Positions' }, { key: 'v', label: 'Floating Valuation of Positions' },
        { key: 'e', label: 'Equity' }, { key: 'mf', label: 'Free Margin' }, { key: 'ml', label: 'Margin Level' },
    ];

    return (
        <section>
            <h2>Raw Trade Balance</h2>
            <table>
                <thead>
                    <tr><th colSpan={2}>Trade Balance Summary</th></tr>
                </thead>
                <tbody>
                    {rowsMap.map(item => {
                        const value = tradeBalance[item.key];
                        if (value === undefined) return null;
                        const formattedValue = item.key === 'ml'
                            ? `${fmt(parseFloat(value), 2)} %`
                            : `${fmtEuro(parseFloat(value))}`;
                        return (
                            <tr key={item.key}>
                                <td>{item.label}</td>
                                <td className="num">{formattedValue}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </section>
    );
};

const TradesHistoryTable = ({ tradesHistory }: { tradesHistory: { trades: Record<string, Trade> } }) => {
    if (!tradesHistory?.trades || Object.keys(tradesHistory.trades).length === 0) {
        return (
            <section>
                <h2>Raw Trade History</h2>
                <p>No raw Trades-Data found.</p>
            </section>
        );
    }

    const trades = Object.values(tradesHistory.trades).sort((a, b) => b.time - a.time);

    return (
        <section>
            <h2>Raw Trades History</h2>
            <table>
                <thead>
                    <tr>
                        <th>Time</th><th>Pair</th><th>Type</th><th>Order Type</th>
                        <th className="num">Price</th><th className="num">Volume</th>
                        <th className="num">Cost</th><th className="num">Fee</th>
                        <th>Order ID</th>
                    </tr>
                </thead>
                <tbody>
                    {trades.map((t, idx) => {
                        const base = t.ordertxid || 'no-id';
                        return (
                            <tr key={`${base}-${t.time}-${idx}`}>
                                <td>{dt(t.time)}</td><td>{t.pair}</td>
                                <td>{t.type.toUpperCase()}</td><td>{t.ordertype}</td>
                                <td className="num">{fmtEuro(parseFloat(t.price), 4)}</td>
                                <td className="num">{fmt(parseFloat(t.vol), 8)}</td>
                                <td className="num">{fmtEuro(parseFloat(t.cost), 2)}</td>
                                <td className="num">{fmtEuro(parseFloat(t.fee), 4)}</td>
                                <td>{t.ordertxid}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </section>
    );
};

const LedgersTable = ({ ledgers }: { ledgers: Ledger[] }) => {
    if (!ledgers || ledgers.length === 0) {
        return (
            <section>
                <h2>Raw Ledger</h2>
                <p>No Ledger-Data found.</p>
            </section>
        );
    }

    const sortedLedgers = [...ledgers].sort((a, b) => b.time - a.time);

    return (
        <section>
            <h2>Raw Ledger</h2>
            <table>
                <thead>
                    <tr>
                        <th>Time</th><th>Asset</th><th>Type</th><th>Subtype</th>
                        <th className="num">Amount</th><th className="">Fee</th>
                        <th className="num">Balance</th><th>Ref ID</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedLedgers.map((l, idx) => {
                        const isEur = l.asset.toUpperCase().includes('EUR');
                        return (
                            <tr key={`${l.refid}-${idx}`}>
                                <td>{dt(l.time)}</td><td>{l.asset}</td><td>{l.type}</td>
                                <td>{l.subtype ?? '-'}</td>
                                <td className="num">{fmt(parseFloat(l.amount), isEur ? 2 : 8)}</td>
                                <td className="num">{fmt(parseFloat(l.fee), isEur ? 2 : 8)}</td>
                                <td className="num">{fmt(parseFloat(l.balance), isEur ? 2 : 8)}</td>
                                <td>{l.refid}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </section>
    );
};

const AveragePriceTable = (
    { buyPrices, sellPrices }: {
        buyPrices: Record<string, AverageBuyPricesStats>;
        sellPrices: Record<string, AverageSellPricesStats>;
    }
) => {
    const assets = Array.from(
        new Set([...Object.keys(buyPrices), ...Object.keys(sellPrices)])
    ).sort();

    if (!assets.length) return (
        <section><h2>Average Buy / Sell Prices</h2><p>No EUR-trades available</p></section>
    );

    const num = (n: number, d = 8) => fmt(n, d);

    return (
        <section>
            <h2>Average Buy / Sell Prices (vs. EUR)</h2>
            <table>
                <thead>
                    <tr>
                        <th rowSpan={2}>Asset</th>
                        <th colSpan={4} className="group buyHead">Buys</th>
                        <th colSpan={4} className="group sellHead">Sells</th>
                    </tr>
                    <tr>
                        <th className="num">Vol</th>
                        <th className="num">
                            Cost
                            <Info text={
                                "Sum of buy costs (fees included)\n" +
                                "Formula: (TotalBuyCosts + TotalFees) / TotalVolume"
                            }
                            />
                        </th>
                        <th className="num">Fees</th>
                        <th className="num">Avg €</th>
                        <th className="num">Vol</th>
                        <th className="num">
                            Revenue
                            <Info text={
                                "Sell revenue minus fees\n" +
                                "Formula: (TotalRevenue - TotalFees) / Totalvolume"
                            }
                            />
                        </th>
                        <th className="num">Fees</th>
                        <th className="num">Avg €</th>
                    </tr>
                </thead>
                <tbody>
                    {assets.map(asset => {
                        const buy = buyPrices[asset];
                        const sell = sellPrices[asset];
                        return (
                            <tr key={asset}>
                                <td>{asset}</td>
                                <td className="num buy">{buy ? num(buy.totalVolume) : '-'}</td>
                                <td className="num buy">{buy ? fmtEuro(buy.totalCostEur) : '-'}</td>
                                <td className="num buy">{buy ? fmtEuro(buy.totalFeesEur) : '-'}</td>
                                <td className="num buy">{buy ? fmtEuro(buy.averagePriceEur) : '-'}</td>
                                <td className="num sell">{sell ? num(sell.totalVolume) : '-'}</td>
                                <td className="num sell">{sell ? fmtEuro(sell.totalRevenueEur) : '-'}</td>
                                <td className="num sell">{sell ? fmtEuro(sell.totalFeesEur) : '-'}</td>
                                <td className="num sell">{sell ? fmtEuro(sell.averagePriceEur) : '-'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </section>
    );
};

const Info: React.FC<{ text: string }> = ({ text }) => (
    <span className="info">
        <span className="tooltip">{text}</span>
    </span>
);

const FundingSummaryTable = (
    { summary }: { summary: Record<string, FundingSummaryStats> }
) => {
    const assets = Object.keys(summary);
    if (!assets.length)
        return (<section><h2>Deposits / Withdrawals (summed)</h2><p>No Data.</p></section>);

    return (
        <section>
            <h2>Deposits / Withdrawals</h2>
            <table>
                <thead>
                    <tr>
                        <th>Assets</th>
                        <th className="num">Deposits</th>
                        <th className="num">Withdrawals</th>
                        <th className="num">
                            Net
                            <Info text={
                                "Net = Total Deposits - Total Withdrawals\n" +
                                "Positive: Remaining balance on exchange\n" +
                                "Negative: Net surplus withdrawn\n" +
                                "Fees are listed separately (included in Withdrawals)"
                            } />
                        </th>
                        <th className="num">Fees</th>
                    </tr>
                </thead>
                <tbody>
                    {assets.sort().map(asset => {
                        const s = summary[asset];
                        const isEur = asset.toUpperCase().includes('EUR');
                        const fmtNum = (n: number) =>
                            isEur ? fmtEuro(n, 2) : fmt(n, 8);
                        return (
                            <tr key={asset}>
                                <td>{asset}</td>
                                <td className="num">{fmtNum(s.totalDeposited)}</td>
                                <td className="num">{fmtNum(s.totalWithdrawn)}</td>
                                <td className="num">{fmtNum(s.net)}</td>
                                <td className="num">{fmtNum(s.fees)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </section>
    );
};

export default function DataPage() {
    const [data, setData] = useState<AllData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        void (async () => {
            try {
                console.info('[DataPage] fetching...');
                const r = await fetch(apiUrl('all-data'));
                if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
                const payload: AllData = (await r.json()) as AllData;
                setData(payload);
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                setError(message);
            }
        })();
    }, []);

    if (error) return <p style={{ color: 'red' }}>{error}</p>
    if (!data) return <div className="loader" />

    return (
        <>
            <header>
                <h1>Crypto</h1>
                <div id="portfolio-balance">
                    <span>Portfolio Balance</span>
                    <div>{fmtEuro(data.totalValueEur)}</div>
                    <div className={`cache-status ${data.cached ? 'cached' : 'live'}`}>
                        {data.cached ? 'cached' : 'live'} - {dt(data.generatedAt / 1000)}
                    </div>
                </div>
            </header>
            <main id="content">
                <AssetValueTable assets={data.calculatedAssets} />
                <ProfitTable stats={data.profitPerAsset} totals={data.profitTotals} />
                <AveragePriceTable buyPrices={data.averageBuyPrices} sellPrices={data.averageSellPrices} />
                <Notes />
                <BalanceExTable balanceData={data.accountBalance} />
                <FundingSummaryTable summary={data.fundingSummary} />
                <TradeBalanceTable tradeBalance={data.tradeBalance} />
                <TradesHistoryTable tradesHistory={data.tradesHistory} />
                <LedgersTable ledgers={data.ledgers} />
            </main>
        </>
    );
}