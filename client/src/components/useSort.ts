import { useState, useCallback } from "react";

export type SortDir = 'asc' | 'desc';

export interface SortConfig<T = any> {
    key: keyof T;
    dir: SortDir;
}

export function useSort<T extends object>(
    data: readonly T[],
    initial?:SortConfig<T>
) {
    const [sort, setSort] = useState<SortConfig<T> | null>(initial ?? null);

    const sorted = sort
        ? [...data].sort((a, b) => {
            const vA = a[sort.key];
            const vB = b[sort.key];
            if (vA === vB) return 0;

            const factor = sort.dir === 'asc' ? 1 : -1;
            return (vA > vB ? 1 : -1) * factor;
        })
        : data;

    const requestSort = useCallback((key: keyof T) => {
        setSort((prev) => 
            prev && prev.key === key
                ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { key, dir: 'asc' }
        );
    }, []);

    return { sorted, sort, requestSort };
}