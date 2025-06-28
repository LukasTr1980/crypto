export function formatToLocale(val: string | number): string {
    return Number(val).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
