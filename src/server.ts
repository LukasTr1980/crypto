import express from 'express';
import path from 'path';
import { showWithdrawals, showDeposits } from './funding';
import { showBuys, showSells, showCoinSummary } from './trade';

const app = express();
const port = process.env.PORT ?? 3000;

app.get('/api/funding', async (_req, res) => {
    try {
        const deposits = await showDeposits();
        const withdrawals = await showWithdrawals();
        res.json({ deposits, withdrawals });
    } catch (err: any) {
        console.error('[Funding API] ➜', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/trades', async (_req, res) => {
    try {
        const buys = await showBuys();
        const sells = await showSells();
        res.json({ buys, sells });
    } catch (err: any) {
        console.error('[Trades API] ➜', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/coin-summary', async (_req, res) => {
    try {
        const coinSummary = await showCoinSummary();
        res.json(coinSummary);
    } catch (err: any) {
        console.error('[CoinSummary Api] ➜', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});