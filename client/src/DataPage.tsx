import { useEffect, useState } from "react";
import { fmt, fmtEuro } from "./utils/fmt";
import { dt } from "./utils/dt";

export interface AssetValue {
    asset: string;
    balance: number;
    priceInEur: number;
    eurValue: number;
    sharePct: number;
}

export type Ledger = {
    time: number;
    asset: string;
    type: string;
    subtype?: string;
    amount: string;
    fee: string;
    balance: string;
    refid: string;
};

export type TradeBalance = {
    eb: string;
    tb: string;
    m: string;
    n: string;
    c: string;
    v: string;
    e: string;
    mf: string;
    ml: string;
}

export type Trade = {
    time: number;
    pair: string;
    type: 'buy' | 'sell';
    ordertype: string;
    price: string;
    vol: string;
    cost: string;
    fee: string;
    ordertxid: string;
};

export interface AverageBuyPricesStats {
    totalVolume: number;
    totalCostEur: number;
    averagePriceEur: number;
}

export interface FundingSummaryStats {
    totalDeposited: number;
    totalWithdrawn: number;
    net: number;
    fees: number;
}

export interface AllData {
    accountBalance: Record<string, { balance: string; hold_trade: string }>;
    tradeBalance: TradeBalance;
    tradesHistory: { trades: Record<string, Trade> };
    ledgers: Ledger[];
    calculatedAssets: AssetValue[];
    totalValueEur: number;
    averageBuyPrices: Record<string, AverageBuyPricesStats>;
    fundingSummary: Record<string, FundingSummaryStats>;
}

const AssetValueTable = ({ assets }: { assets: AssetValue[] }) => {
    if (!assets || assets.length === 0) {
        return (
            <section>
                <h2>Calculated Assets Value</h2>
                <p>No assets values could be calculated</p>
            </section>
        );
    }

    return (
        <section>
            <h2>Calculated Assets Value</h2>
            <table>
                <thead>
                    <tr>
                        <th>Assets</th>
                        <th className="num">Balance</th>
                        <th className="num">MarketPrice (€)</th>
                        <th className="num">Value (€)</th>
                        <th className="num">% of Total</th>
                    </tr>
                </thead>
                <tbody>
                    {assets.map(a => (
                        <tr key={a.asset}>
                            <td>{a.asset}</td>
                            <td className="num">{fmt(a.balance, 8)}</td>
                            <td className="num">{fmtEuro(a.priceInEur, 2)}</td>
                            <td className="num">{fmtEuro(a.eurValue, 2)}</td>
                            <td className="num">{fmt(a.sharePct, 2)} %</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
};

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

    const rowsMap: Array<{ key: keyof TradeBalance; label: string }> = [
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
    if (!tradesHistory || !tradesHistory.trades || Object.keys(tradesHistory.trades).length === 0) {
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
                    {trades.map(t => (
                        <tr key={`${t.ordertxid}-${t.time}`}>
                            <td>{dt(t.time)}</td><td>{t.pair}</td>
                            <td>{t.type.toUpperCase()}</td><td>{t.ordertype}</td>
                            <td className="num">{fmtEuro(parseFloat(t.price), 4)}</td>
                            <td className="num">{fmt(parseFloat(t.vol), 8)}</td>
                            <td className="num">{fmtEuro(parseFloat(t.cost), 2)}</td>
                            <td className="num">{fmtEuro(parseFloat(t.fee), 4)}</td>
                            <td>{t.ordertxid}</td>
                        </tr>
                    ))}
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
                    {sortedLedgers.map(l => {
                        const isEur = l.asset.toUpperCase().includes('EUR');
                        return (
                            <tr key={l.refid}>
                                <td>{dt(l.time)}</td><td>{l.asset}</td><td>{l.type}</td>
                                <td>{l.subtype || '-'}</td>
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

const AverageBuyPriceTable = ({ buyPrices }: { buyPrices: Record<string, AverageBuyPricesStats> }) => {
    const assets = Object.keys(buyPrices);
    if (assets.length === 0) {
        return (
            <section>
                <h2>Average Buy Prices</h2>
                <p>No EUR-based buy trades found to calculate averages.</p>
            </section>
        );
    }

    return (
        <section>
            <h2>Average Buy Prices (vs. EUR)</h2>
            <table>
                <thead>
                    <tr>
                        <th>Asset</th>
                        <th className="num">Total Volume bought</th>
                        <th className="num">Total Cost (€)</th>
                        <th className="num">Average Buy Price (€)</th>
                    </tr>
                </thead>
                <tbody>
                    {assets.sort().map(asset => {
                        const stats = buyPrices[asset];
                        return (
                            <tr key={asset}>
                                <td>{asset}</td>
                                <td className="num">{fmt(stats.totalVolume, 8)}</td>
                                <td className="num">{fmtEuro(stats.totalCostEur)}</td>
                                <td className="num">{fmtEuro(stats.averagePriceEur)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </section>
    );
};

const FundingSummaryTable = (
    { summary }: { summary: Record<string, FundingSummaryStats> }
) => {
    const assets = Object.keys(summary);
    if (!assets.length)
        return (<section><h2>Deposits / Withdrawals (summed)</h2><p>No Data.</p></section>);

    return (
        <section>
            <h2>Deposits/Withdrawals</h2>
            <table>
                <thead>
                    <tr>
                        <th>Assets</th>
                        <th className="num">Deposits</th>
                        <th className="num">Withdrawals</th>
                        <th className="num">Net</th>
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

export default function DataPage () {
    const [data, setData] = useState<AllData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(()=> {
        (async () => {
            try {
                console.info('[DataPage] fetching...');
                const r = await fetch('/api/all-data');
                if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
                setData(await r.json());
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
                </div>
            </header>
            <main id="content">
                <AssetValueTable assets={data.calculatedAssets} />
                <AverageBuyPriceTable buyPrices={data.averageBuyPrices} />
                <BalanceExTable balanceData={data.accountBalance} />
                <FundingSummaryTable summary={data.fundingSummary} />
                <TradeBalanceTable tradeBalance={data.tradeBalance} />
                <TradesHistoryTable tradesHistory={data.tradesHistory} />
                <LedgersTable ledgers={data.ledgers} />
            </main>
        </>
    );
}