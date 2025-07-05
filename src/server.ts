import express from 'express';
import path from 'path';
import { info, error, debug } from './utils/logger';
import { fetchAllLedgers, fetchTradesHistory, fetchAccountBalance, fetchTradeBalance } from './utils/kraken';

const app = express();
const port = process.env.PORT ?? 3000;

app.get('/api/all-data', async (_req, res) => {
    info('GET /api/all-data - Starting data aggregation');
    try {
        const ledgers = await fetchAllLedgers();
        const tradesHistory = await fetchTradesHistory();
        const accountBalance = await fetchAccountBalance();
        const tradeBalance = await fetchTradeBalance();

        const tradesCount = Object.keys(tradesHistory.trades ?? {}).length;
        info(`[Fetched] ${ledgers.length} ledgers, ${tradesCount} trades.`);
        debug('[Ledgers Raw]', JSON.stringify(ledgers.slice(0, 5), null, 2));

        res.json({
            accountBalance,
            tradeBalance,
            tradesHistory,
            ledgers,
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