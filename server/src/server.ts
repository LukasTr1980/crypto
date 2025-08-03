import express, { type Request } from 'express';
import path from 'path';
import { info, error } from './utils/logger';
import { fetchAllLedgers, fetchAllTradesHistory, fetchAccountBalance, fetchTradeBalance, fetchPrices } from './utils/kraken';
import {
    calculateAssetsValue,
    calculateAverageBuyPrices,
    calculateAverageSellPrices,
    calculateFundingSummary,
    calculatePnlPerAsset,
} from './calculations';
import { withCache } from './utils/cache';
import { readNotes, writeNotes } from './notesStorage';
import {
    type LedgerEntry,
    type TradesHistory,
    type AccountBalance,
    type TradeBalance,
    type AllData,
    type NotesBody,
} from './types';

const app = express();
const port = process.env.PORT ?? 3000;

const loadAllData = async (): Promise<AllData> => {
    const ledgers = (await fetchAllLedgers()) as LedgerEntry[];
    const tradesHistory = (await fetchAllTradesHistory()) as TradesHistory;
    const accountBalance = (await fetchAccountBalance()) as AccountBalance;
    const tradeBalance = (await fetchTradeBalance()) as TradeBalance;
    const prices = await fetchPrices();
    const portfolio = calculateAssetsValue(accountBalance, prices);
    const { perAsset: pnlPerAsset, totals: pnlTotals } = calculatePnlPerAsset(accountBalance, tradesHistory, ledgers, prices);

    return {
        accountBalance,
        tradeBalance,
        tradesHistory,
        ledgers,
        calculatedAssets: portfolio.assets,
        totalValueEur: portfolio.totalValueEur,
        averageBuyPrices: calculateAverageBuyPrices(tradesHistory, ledgers),
        averageSellPrices: calculateAverageSellPrices(tradesHistory), // No instant sell, no ledger
        fundingSummary: calculateFundingSummary(ledgers),
        profitPerAsset: pnlPerAsset,
        profitTotals: pnlTotals,
        generatedAt: Date.now(),
    };
};

const loadAllDataCached = withCache<AllData>(180_000, loadAllData);

app.use(express.json());

app.get('/api/all-data', async (_req, res) => {
    try {
        const data = await loadAllDataCached();
        res.json(data);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : '';
        error('[All-Data-API] ->', msg, stack);
        res.status(500).json({ error: msg });
    }
});

app.get('/api/notes', async (_req, res) => {
    const text = await readNotes();
    res.json({ text });
});

app.post('/api/notes', async (req: Request<unknown, unknown, NotesBody>, res) => {
    await writeNotes(req.body?.text ?? '');
    res.status(204).end();
});

app.use(express.static(path.join(__dirname, '..', '..', 'client', 'dist')));

app.listen(port, () => {
    info(`Server running on http://localhost:${port}`);
});