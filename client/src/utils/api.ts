export function apiUrl(path: string) {
    const base = import.meta.env.BASE_URL || '/';
    const b = base.endsWith('/') ? base : base + '/';

    const rel = path.replace(/^\/+/, '');
    return `${b}api/${rel}`;
}