export interface AssetValue {
    asset: string;
    balance: number;
    priceInEur: number;
    eurValue: number;
    sharePct: number;
}

export interface CalculatedPortfolio {
    assets: AssetValue[];
    totalValueEur: number;
}

export interface AverageBuyPriceStats {
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

export interface AverageSellPriceStats {
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

export interface PnlPerAssetResult {
    perAsset: Record<string, PnlStats>;
    totals: PnlStats;
}

export interface KrakenTicker {
    c?: [string, string];
    a?: [string, string];
    b?: [string, string];
}

export interface KrakenTrade {
    type: 'buy' | 'sell';
    pair: string;
    vol: string;
    cost: string;
    fee: string;
}

export interface LedgerEntry {
    refid: string;
    type: string;
    asset: string;
    amount: string;
    fee?: string;
}

export type KrakenTickerMap = Record<string, KrakenTicker>;

export interface PriceQuote {
    price: number;
    ts: string;
}

export interface CacheEntry<T> { value: T; ts: number };

export interface TradesHistory {
    trades: Record<string, KrakenTrade>;
}

export type AccountBalance = Record<string, { balance: string; hold_trade?: string }>;
export type TradeBalance = Record<string, string>;

export interface AllData {
    accountBalance: AccountBalance;
    tradeBalance: TradeBalance;
    tradesHistory: TradesHistory;
    ledgers: LedgerEntry[];
    calculatedAssets: AssetValue[];
    totalValueEur: number;
    averageBuyPrices: Record<string, AverageBuyPriceStats>;
    averageSellPrices: Record<string, AverageSellPriceStats>;
    fundingSummary: Record<string, FundingSummaryStats>;
    profitPerAsset: Record<string, PnlStats>;
    profitTotals: PnlStats;
    generatedAt: number;
}

export interface NotesBody { text?: string }

export type LogArgs = unknown[];
export type ConsoleMethod = (...args: LogArgs) => void;
export type ColorFn = (msg: string) => string;