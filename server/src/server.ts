import express from 'express';
import path from 'path';
import { info, error } from './utils/logger';
import { fetchAllLedgers, fetchAllTradesHistory, fetchAccountBalance, fetchTradeBalance, fetchPrices } from './utils/kraken';
import { calculateAssetsValue, calculateAverageBuyPrices, calculateFundingSummary } from './calculations';
import { withCache } from './utils/cache';

const app = express();
const port = process.env.PORT ?? 3000;

const loadAllData = async () => {
    const ledgers = await fetchAllLedgers();
    const tradesHistory = await fetchAllTradesHistory();
    const accountBalance = await fetchAccountBalance();
    const tradeBalance = await fetchTradeBalance();
    const prices = await fetchPrices();

    const portfolio = calculateAssetsValue(accountBalance, prices);

    return {
        accountBalance,
        tradeBalance,
        tradesHistory,
        ledgers,
        calculatedAssets: portfolio.assets,
        totalValueEur: portfolio.totalValueEur,
        averageBuyPrices: calculateAverageBuyPrices(tradesHistory, ledgers),
        fundingSummary: calculateFundingSummary(ledgers),
        generatedAt: Date.now(),
    };
};

const loadAllDataCached = withCache(180_000, loadAllData);

app.get('/api/all-data', async (_req, res) => {
    try {
        const data = await loadAllDataCached();
        res.json(data);
    } catch (err: any) {
        error('[All-Data API] ->', err.message, err.stack);
        res.status(500).json({ error: err.message });
    }
});

app.use(express.static(path.join(__dirname, '..', '..', 'client', 'dist')));

app.listen(port, () => {
    info(`Server running on http://localhost:${port}`);
});