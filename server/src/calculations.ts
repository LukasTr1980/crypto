import { info } from "./utils/logger";
import { mapKrakenAsset } from "./utils/assetMapper";

export interface AssetValue {
    asset: string;
    balance: number;
    priceInEur: number;
    eurValue: number;
}

function findEurPriceTicker(assetCode: string, marketPrices: Record<string, any>): any | null {
    const potentialPairs = [
        `${assetCode}EUR`,
        `${assetCode}ZEUR`,
    ];

    for (const pair of potentialPairs) {
        if (marketPrices[pair]) {
            info(`[Calculations] Found price for ${assetCode} in pair ${pair}`);
            return marketPrices[pair];
        }
    }
    return null;
}

export function calculateAssetsValue(
    accountBalance: Record<string, { balance: string }>,
    marketPrices: Record<string, any>
): AssetValue[] {

    info('[Calculations] Calculating value for all assets...');

    const calculatedAssets: AssetValue[] = [];

    for (const [assetCode, data] of Object.entries(accountBalance)) {
        const balance = parseFloat(data.balance);

        if (balance === 0 || mapKrakenAsset(assetCode) === 'EUR') {
            continue;
        }

        const ticker = findEurPriceTicker(assetCode, marketPrices);

        if (ticker) {
            const priceInEur = parseFloat(ticker.c[0]);
            const eurValue = balance * priceInEur;

            calculatedAssets.push({
                asset: mapKrakenAsset(assetCode),
                balance,
                priceInEur,
                eurValue,
            });
        } else {
            info(`[Calculations] Could not find EUR price ticker for asset: ${assetCode}`);
        }
    }

    calculatedAssets.sort((a, b) => b.eurValue - a.eurValue);

    info(`[Calculations] Finished. Calculated value for ${calculatedAssets.length} assets.`);
    return calculatedAssets;
}