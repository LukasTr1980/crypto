import express from 'express';
import path from 'path';
import { info, error } from './utils/logger';
import { fetchAllLedgers, fetchAllTradesHistory, fetchAccountBalance, fetchTradeBalance, fetchPrices } from './utils/kraken';
import { calculateAssetsValue, calculateAverageBuyPrices, calculateAverageSellPrices, calculateFundingSummary, calculatePnlPerAsset } from './calculations';
import { withCache } from './utils/cache';
import { readNotes, writeNotes } from './notesStorage';

const app = express();
const port = process.env.PORT ?? 3000;

const loadAllData = async () => {
    const ledgers = await fetchAllLedgers();
    const tradesHistory = await fetchAllTradesHistory();
    const accountBalance = await fetchAccountBalance();
    const tradeBalance = await fetchTradeBalance();
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

const loadAllDataCached = withCache(180_000, loadAllData);

app.use(express.json());

app.get('/api/all-data', async (_req, res) => {
    try {
        const data = await loadAllDataCached();
        res.json(data);
    } catch (err: any) {
        error('[All-Data API] ->', err.message, err.stack);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/notes', async (_req, res) => {
    const text = await readNotes();
    res.json({ text });
});

app.post('/api/notes', async (req, res) => {
    await writeNotes(req.body?.text ?? '');
    res.status(204).end();
})

app.use(express.static(path.join(__dirname, '..', '..', 'client', 'dist')));

app.listen(port, () => {
    info(`Server running on http://localhost:${port}`);
});