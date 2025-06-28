export function fmt(n: number, digits = 2): string {
    return n === 0 ? '-' : n.toFixed(digits);
}