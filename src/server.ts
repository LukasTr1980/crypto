import express from 'express';
import path from 'path';
import { info, error, debug } from './utils/logger';
import { fetchAllLedgers, fetchAllTradesHistory, fetchAccountBalance, fetchTradeBalance, fetchPrices } from './utils/kraken';
import { calculateBtcValue } from './calculations';

const app = express();
const port = process.env.PORT ?? 3000;

app.get('/api/all-data', async (_req, res) => {
    info('GET /api/all-data - Starting data aggregation');
    try {
        const ledgers = await fetchAllLedgers();
        const tradesHistory = await fetchAllTradesHistory();
        const accountBalance = await fetchAccountBalance();
        const tradeBalance = await fetchTradeBalance();

        const marketPrices = fetchPrices();

        const btcValue = calculateBtcValue(accountBalance, marketPrices);

        const tradesCount = Object.keys(tradesHistory.trades ?? {}).length;
        info(`[Fetched] ${ledgers.length} ledgers, ${tradesCount} trades.`);
        debug('[Ledgers Raw]', JSON.stringify(ledgers.slice(0, 5), null, 2));

        res.json({
            accountBalance,
            tradeBalance,
            tradesHistory,
            ledgers,
            btcValue
        });
        info('[All-Data API] Success');

    } catch (err: any) {
        error('[All-Data API] ->', err.message, err.stack);
        res.status(500).json({ error: err.message });
    }
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(port, () => {
    info(`Server running on http://localhost:${port}`);
});