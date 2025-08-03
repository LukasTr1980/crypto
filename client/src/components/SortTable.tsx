import React from "react";
import { useSort } from "./useSort";
import type { SortDir, RowObj, SortTableProps } from "../types";

function Arrow({
    active,
    dir,
}: {
    active: boolean;
    dir?: SortDir;
}) {
    const cls = active
        ? (dir === 'asc' ? 'arrow-up' : 'arrow-down')
        : 'arrow-none';

    return <span className={`arrow ${cls}`} aria-hidden="true" />;
}

export default function SortableTable<T extends RowObj>({
    data,
    columns,
    initialSort,
    footer,
}: SortTableProps<T>) {
    const { sorted, sort, requestSort } = useSort(data, initialSort);

    return (
        <table>
            <thead>
                <tr>
                    {columns.map(({ key, label, numeric, sortable = true }) => {
                        const active = sortable && sort?.key === key;
                        const dir: SortDir | undefined = active ? sort.dir : undefined;

                        return (
                            <th
                                key={String(key)}
                                className={[
                                    numeric ? 'num' : '',
                                    'sortable-header',
                                    active ? `sorted-${dir}` : '',
                                ].join(' ').trim()}
                                onClick={sortable ? () => requestSort(key) : undefined}
                            >   
                                {sortable && <Arrow active={active} dir={dir} />}
                                {label}
                            </th>
                        );
                    })}
                </tr>
            </thead>
            <tbody>
                {sorted.map((row, idx) => (
                    <tr key={idx}>
                        {columns.map(({ key, numeric, render }) => (
                            <td key={String(key)} className={numeric ? 'num' : undefined}>
                                {render ? render(row) : row[key] as React.ReactNode}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
            {footer && (
                <tfoot>
                    <tr>
                        {columns.map(({ key, numeric, render }) => (
                            <td
                                key={String(key)}
                                className={numeric ? 'num' : undefined}
                                >
                                    {render ? render(footer) : (footer[key] as React.ReactNode)}
                                </td>
                        ))}
                    </tr>
                </tfoot>
            )}
        </table>
    );
}