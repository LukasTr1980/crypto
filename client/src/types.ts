export interface AssetValue {
    asset: string;
    balance: number;
    priceInEur: number;
    eurValue: number;
    sharePct: number;
}

export interface Ledger {
    time: number;
    asset: string;
    type: string;
    subtype?: string;
    amount: string;
    fee: string;
    balance: string;
    refid: string;
}

export interface TradeBalance {
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

export interface Trade {
    time: number;
    pair: string;
    type: 'buy' | 'sell';
    ordertype: string;
    price: string;
    vol: string;
    cost: string;
    fee: string;
    ordertxid: string;
}

export interface AverageBuyPricesStats {
    totalVolume: number;
    totalCostEur: number;
    totalFeesEur: number;
    averagePriceEur: number;
}

export interface FundingSummaryStats {
    totalDeposited: number;
    totalWithdrawn: number;
    net: number;
    fees: number;
}

export interface AverageSellPricesStats {
    totalVolume: number;
    totalRevenueEur: number;
    totalFeesEur: number;
    averagePriceEur: number;
}

export interface PnlStats {
    investedEur: number;
    realizedEur: number;
    unrealizedEur: number;
    totalEur: number;
    totalPct: number;
}

export interface AllData {
    accountBalance: Record<string, { balance: string; hold_trade: string }>;
    tradeBalance: TradeBalance;
    tradesHistory: { trades: Record<string, Trade> };
    ledgers: Ledger[];
    calculatedAssets: AssetValue[];
    totalValueEur: number;
    averageBuyPrices: Record<string, AverageBuyPricesStats>;
    averageSellPrices: Record<string, AverageSellPricesStats>;
    fundingSummary: Record<string, FundingSummaryStats>;
    profitPerAsset: Record<string, PnlStats>;
    profitTotals: PnlStats;
    cached: boolean;
    generatedAt: number;
}

export interface NotesResponse {
    text: string;
}

export type SortDir = 'asc' | 'desc';

export interface SortConfig<T = unknown> {
    key: keyof T;
    dir: SortDir;
}

export type RowObj = object;

export interface Column<T> {
    key: keyof T;
    label: React.ReactNode;
    numeric?: boolean;
    render?: (row: T) => React.ReactNode;
    sortable?: boolean;
}

export interface SortTableProps<T> {
    data: readonly T[];
    columns: readonly Column<T>[];
    initialSort?: SortConfig<T>;
    footer?: T;
}

export interface PnlRow extends PnlStats {
    asset: string;
}
