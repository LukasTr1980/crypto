import { info } from "../../server/src/utils/logger";
import { mapKrakenAsset } from "../../server/src/utils/assetMapper";

interface BtcValueResult {
    btcBalance: number;
    eurValue: number;
    btcPrice: number;
}

export function calculateBtcValue(
    accountBalance: Record<string, { balance: string }>,
    marketPrices: Record<string, any>
): BtcValueResult | null {

    info('[Calculations] Calculating BTC value...');

    let totalBtcBalance = 0;
    for (const [assetCode, data] of Object.entries(accountBalance)) {
        if (mapKrakenAsset(assetCode) === 'BTC') {
            totalBtcBalance += parseFloat(data.balance);
        }
    }

    if (totalBtcBalance === 0) {
        info('[Calculations] No BTC balance found.');
        return null;
    }

    const btcEurTicker = marketPrices['XXBTZEUR'];
    if (!btcEurTicker) {
        info('[Calculations] No BTC/EUR price ticker found in market data.');
        return null;
    }

    const btcPriceInEur = parseFloat(btcEurTicker.c[0]);
    const eurValue = totalBtcBalance * btcPriceInEur;

    info(`[Calculations] BTC Balance: ${totalBtcBalance}, Price: ${btcPriceInEur}, Calculated EUR Value: ${eurValue}`);

    return {
        btcBalance: totalBtcBalance,
        eurValue: eurValue,
        btcPrice: btcPriceInEur
    };
}