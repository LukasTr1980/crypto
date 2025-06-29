import express from 'express';
import path from 'path';
import { showWithdrawals, showDeposits } from './funding';
import { showBuys, showSells, showCoinSummary } from './trade';
import { info, error } from './utils/logger';

const app = express();
const port = process.env.PORT ?? 3000;

app.get('/api/funding', async (_req, res) => {
    info('GET /api/funding');
    try {
        const deposits = await showDeposits();
        const withdrawals = await showWithdrawals();
        res.json({ deposits, withdrawals });
        info('[Funding API] success');
    } catch (err: any) {
        error('[Funding API] ➜', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/trades', async (_req, res) => {
    info('GET /api/trades');
    try {
        const buys = await showBuys();
        const sells = await showSells();
        res.json({ buys, sells });
        info('[Trades API] success');
    } catch (err: any) {
        error('[Trades API] ➜', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/coin-summary', async (_req, res) => {
    info('GET /api/coin-summary');
    try {
        const coinSummary = await showCoinSummary();
        res.json(coinSummary);
        info('[CoinSummary API] success');
    } catch (err: any) {
        error('[CoinSummary Api] ➜', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(port, () => {
    info(`Server running on http://localhost:${port}`);
});