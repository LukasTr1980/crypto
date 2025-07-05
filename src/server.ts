import express from 'express';
import path from 'path';
import { fetchDepositsRaw, fetchWithdrawalsRaw, processDeposits, processWithdrawals } from './funding';
import { info, error, debug } from './utils/logger';
import { fetchAllLedgers, fetchTradesHistory, fetchPrices, fetchAccountBalance, fetchTradeBalance } from './utils/kraken';
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
        const tradeBalance = await fetchTradeBalance();

        debug('[BalanceEx Raw]', JSON.stringify(accountBalance, null, 2));
        
        info(`Fetched ${ledgers.length} ledgers, ${tradesRaw.length} trades, ${depositsRaw.length} deposits, ${withdrawalsRaw.length} withdrawals.`);

        const deposits = processDeposits(depositsRaw);
        const withdrawals = processWithdrawals(withdrawalsRaw);
        const earnTransactions = getEarnTransactions(ledgers);

        const allTradesAssets = new Set([
            ...earnTransactions.map(t => t.asset),
            ...Object.keys(accountBalance).map(mapKrakenAsset),
        ]);

        const publicPairsToFetch = [...allTradesAssets]
            .map(asset => getPublicTickerPair(asset))
            .filter((p): p is string => !!p);
        
        const publicPrices = await fetchPrices(publicPairsToFetch);

        const priceData: Record<string, any> = {};

        for (const [krakenKey, quote] of Object.entries(publicPrices)) {
            const asset = mapPublicPairToAsset(krakenKey);
            const internalKey = krakenPair(asset) ?? krakenKey;

            priceData[krakenKey] = quote;
            priceData[internalKey] = quote
        }

        debug('[Prices] keys:', Object.keys(priceData).join(','));

        let portfolioValue = 0;
        for (const [assetCode, balanceData] of Object.entries(accountBalance as Record<string, any>)) {
            const balance = parseFloat(balanceData.balance);
            if (isNaN(balance) || balance === 0) continue;

            const asset = mapKrakenAsset(assetCode);
            if (asset === 'EUR') {
                portfolioValue += balance;
                continue;
            }

            const pair = krakenPair(asset) ?? `${asset}EUR`;
            const quote = priceData[pair];

            if (!quote?.price) {
                error(`[Balance] Missing price for ${asset} (expected pair ${pair})`);
                continue;
            }

            portfolioValue += balance * quote.price;

        }
        info(`[Balance] Calculated total portfolio value: €${portfolioValue.toFixed(2)}`);

        res.json({
            portfolioValue,
            accountBalance,
            tradeBalance,
            tradesHistory,
            deposits,
            withdrawals,
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