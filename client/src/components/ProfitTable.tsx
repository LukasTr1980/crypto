import React from "react";
import SortableTable from "./SortTable";
import { fmt, fmtEuro } from '../utils/fmt';

export interface PnlStats {
    investedEur: number;
    realizedEur: number;
    unrealizedEur: number;
    totalEur: number;
    totalPct: number;
}
interface Row extends PnlStats {
    asset: string;
}

const cls = (v: number) => (v >= 0 ? 'gain' : 'loss');

const Info: React.FC<{ text: string }> = ({ text }) => (
    <span className="info"><span className="tooltip">{text}</span></span>
);

const columns = [
    { key: 'asset', label: 'Asset', sortable: false },
    {
        key: 'investedEur',
        label: <>Invested<Info text="Buys - Sells (net cash flow)" /></>,
        numeric: true,
        render: (r: Row) => fmtEuro(r.investedEur),
    },
    {
        key: 'realizedEur',
        label: <>Realized<Info text="Gain / Loss on SOLD coins" /></>,
        numeric: true,
        render: (r: Row) => (
            <span className={cls(r.realizedEur)}>{fmtEuro(r.realizedEur)}</span>
        ),
    },
    {
        key: 'unrealizedEur',
        label: <>Unrealized<Info text="Market value - cost basis of current coins" /></>,
        numeric: true,
        render: (r: Row) => (
            <span className={cls(r.unrealizedEur)}>{fmtEuro(r.unrealizedEur)}</span>
        ),
    },
    {
        key: 'totalEur',
        label: <>Total<Info text="Realized + Unrealized" /></>,
        numeric: true,
        render: (r: Row) => (
            <span className={cls(r.totalEur)}>{fmtEuro(r.totalEur)}</span>
        ),
    },
    {
        key: 'totalPct',
        label: <>Total %<Info text="Total / Invested" /></>,
        numeric: true,
        render: (r: Row) => (
            <span className={cls(r.totalPct)}>{fmt(r.totalPct, 2)} %</span>
        ),
    },
] as const;

export default function ProfitTable({
    stats,
    totals
}: {
    stats: Record<string, PnlStats>;
    totals: PnlStats;
}) {
    const rows: Row[] = Object.entries(stats)
        .map(([asset, s]) => ({ asset, ...s }))
        .sort((a, b) => b.totalEur - a.totalEur);

    if (!rows.length) return null;

    const footer: Row = { asset: 'Total', ...totals };

    return (
        <section>
            <h2>Realized / Unrealized per Coin</h2>

            <SortableTable<Row>
                data={rows}
                columns={columns}
                initialSort={{ key: 'totalEur', dir: 'desc' }}
                footer={footer}
            />
        </section>
    );
}
