import express from 'express';
import path from 'path';
import { showWithdrawals, showDeposits } from './funding';

const app = express();
const port = process.env.PORT ?? 3000;

app.get('/api/funding', async (req, res) => {
    try {
        const [deposits, withdrawals] = await Promise.all([
            showDeposits(),
            showWithdrawals()
        ]);
        res.json({ deposits, withdrawals });
    } catch (err: any) {
        console.error('[Funding API] ➜', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});