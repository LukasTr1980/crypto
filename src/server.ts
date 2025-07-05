import express from 'express';
import path from 'path';
import { info, error, debug } from './utils/logger';
import { fetchAllLedgers, fetchTradesHistory, fetchPrices, fetchAccountBalance, fetchTradeBalance } from './utils/kraken';
import { getPublicTickerPair, mapPublicPairToAsset, krakenPair, mapKrakenAsset } from './utils/assetMapper';

const app = express();
const port = process.env.PORT ?? 3000;

app.get('/api/all-data', async (_req, res) => {
    info('GET /api/all-data - Starting data aggregation');
    try {
        const ledgers = await fetchAllLedgers();
        const tradesHistory = await fetchTradesHistory();
        const tradesRaw = Object.values(tradesHistory.trades ?? {});
        const accountBalance = await fetchAccountBalance();
        const tradeBalance = await fetchTradeBalance();

        debug('[Ledgers Raw]', JSON.stringify(ledgers.slice(0, 5), null, 2));
        
        info(`Fetched ${ledgers.length} ledgers, ${tradesRaw.length} trades.`);

        const allTradesAssets = new Set([
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