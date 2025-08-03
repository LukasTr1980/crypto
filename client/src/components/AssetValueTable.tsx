import SortableTable from "./SortTable";
import { fmt, fmtEuro } from "../utils/fmt";
import type { AssetValue } from "../types";

const columns = [
    {
        key: 'asset',
        label: 'Asset',
        sortable: false,
    },
    {
        key: 'balance',
        label: 'Balance',
        numeric: true,
        render: (r: AssetValue) => fmt(r.balance, 8),
    },
    {
        key: 'priceInEur',
        label: 'MarketPrice (€)',
        numeric: true,
        render: (r: AssetValue) => fmtEuro(r.priceInEur, 2),
    },
    {
        key: 'eurValue',
        label: 'Value (€)',
        numeric: true,
        render: (r: AssetValue) => fmtEuro(r.eurValue, 2),
    },
    {
        key: 'sharePct',
        label: '% of Total',
        numeric: true,
        render: (r: AssetValue) => `${fmt(r.sharePct, 2)} %`,
    },
] as const;

export default function AssetValueTable({
    assets,
}: {
    assets: AssetValue[];
}) {
    if (!assets?.length) {
        return (
            <section>
                <h2>Calculated Assets Value</h2>
                <p>No values could be calculated</p>
            </section>
        );
    }

    return (
        <section>
            <h2>Calculated Assets Value</h2>

            <SortableTable
                data={assets}
                columns={columns}
                initialSort={{ key: 'priceInEur', dir: 'desc' }}
            />
        </section>
    );
}