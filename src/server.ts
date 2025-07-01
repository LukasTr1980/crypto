import express from 'express';
import path from 'path';
import { fetchDepositsRaw, fetchWithdrawalsRaw, processDeposits, processWithdrawals } from './funding';
import { processBuys, processSells, processCoinSummary } from './trade';
import { info, error } from './utils/logger';
import { fetchAllLedgers, fetchTradesHistory, fetchPrices, fetchAccountBalance } from './utils/kraken';
import { getEarnTransactions } from './ledger';
import { getPublicTickerPair, mapPublicPairToAsset, krakenPair, mapKrakenAsset } from './utils/assetMapper';

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
        const accountBalance = await fetchAccountBalance();
        
        info(`Fetched ${ledgers.length} ledgers, ${tradesRaw.length} trades, ${depositsRaw.length} deposits, ${withdrawalsRaw.length} withdrawals.`);

        const deposits = processDeposits(depositsRaw);
        const withdrawals = processWithdrawals(withdrawalsRaw);
        const buys = processBuys(tradesRaw, ledgers);
        const sells = processSells(tradesRaw, ledgers);
        const earnTransactions = getEarnTransactions(ledgers);

        const allTradesAssets = new Set([
            ...buys.items.map(t => t.asset),
            ...sells.items.map(t => t.asset),
            ...earnTransactions.map(t => t.asset),
            ...Object.keys(accountBalance).map(mapKrakenAsset),
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

        let portofolioValue = 0;
        for (const [assetCode, balanceStr] of Object.entries(accountBalance)) {
            const balance = parseFloat(balanceStr);
            if (balance === 0) continue;

            const asset = mapKrakenAsset(assetCode);
            if (asset === 'EUR') {
                portofolioValue += balance;
                continue;
            }

            const pair = krakenPair(asset);
            const quote = priceData[pair!];
            if (quote?.price) {
                portofolioValue += balance * quote.price;
            } else {
                info(`[Balance] No price found for asset ${asset} (code: ${assetCode}, pair: ${pair})`);
            }
        }
        info(`[Balance] Calculated total portfolio value: €${portofolioValue.toFixed(2)}`);

        const coinSummary = processCoinSummary(tradesRaw, ledgers, priceData);

        res.json({
            portofolioValue,
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