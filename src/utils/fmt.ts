export function fmt(n: number, digits = 2) {
    return n === 0 ? '-' : n.toFixed(digits);
}