export function fmt(n: number, digits = 2): string {
    if (n === 0) return '-';
    return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(n);
}

export function fmtEuro(n: number, d = 2) {
    return n === 0 ? '-' :
        '€ ' + fmt(n, d);
}