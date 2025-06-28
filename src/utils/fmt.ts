export function fmt(n: number, digits = 2): string {
    if (n === 0) return '-';
    return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(n);
}