import express from 'express';
import path from 'path';
import { fetchDepositsRaw, fetchWithdrawalsRaw, processDeposits, processWithdrawals } from './funding';
import { processBuys, processSells, processCoinSummary } from './trade';
import { info, error } from './utils/logger';
import { fetchAllLedgers, fetchTradesHistory, fetchPrices } from './utils/kraken';
import { getEarnTransactions } from './ledger';
import { getPublicTickerPair, mapPublicPairToAsset, krakenPair } from './utils/assetMapper';

const app = express();
const port = process.env.PORT ?? 3000;

app.get('/api/all-data', async (_req, res) => {
    info('GET /api/all-data - Starting data aggregation');
    try {
        const ledgers = await fetchAllLedgers();
        const tradesHistory = await fetchTradesHistory();
        const tradesRaw = Object.values(tradesHistory.trades ?? {});
        const depositsRaw = await fetchDepositsRaw();
        const withdrawalsRaw = await fetchWithdrawalsRaw();
        
        info(`Fetched ${ledgers.length} ledgers, ${tradesRaw.length} trades, ${depositsRaw.length} deposits, ${withdrawalsRaw.length} withdrawals.`);

        const deposits = processDeposits(depositsRaw);
        const withdrawals = processWithdrawals(withdrawalsRaw);
        const buys = processBuys(tradesRaw, ledgers);
        const sells = processSells(tradesRaw, ledgers);
        const earnTransactions = getEarnTransactions(ledgers);

        const allTradesAssets = new Set([
            ...buys.items.map(t => t.asset),
            ...sells.items.map(t => t.asset),
            ...earnTransactions.map(t => t.asset)
        ]);

        const publicPairsToFetch = [...allTradesAssets]
            .map(asset => getPublicTickerPair(asset))
            .filter((p): p is string => !!p);
        
        if (!publicPairsToFetch.includes('EURUSD')) {
            publicPairsToFetch.push('EURUSD');
        }

        const publicPrices = await fetchPrices(publicPairsToFetch);

        const priceData: Record<string, any> = {};
        for (const [publicPair, quote] of Object.entries(publicPrices)) {
            const asset = mapPublicPairToAsset(publicPair);
            const internalPair = krakenPair(asset) ?? publicPair;
            priceData[internalPair] = quote;
        }

        if(publicPrices['EURUSD']) {
            priceData['USDGEUR'] = publicPrices['EURUSD'];
        }

        const coinSummary = processCoinSummary(tradesRaw, ledgers, priceData);

        res.json({
            deposits,
            withdrawals,
            buys,
            sells,
            coinSummary,
            earnTransactions
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