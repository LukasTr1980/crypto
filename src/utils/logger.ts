const nativeConsoleLog = console.log;
const nativeConsoleError = console.error;

const getTimestamp = (): string => new Date().toISOString();

function log(level: string, consoleMethod: (...args: any[]) => void, ...args: any[]) {
    const timestamp = getTimestamp();
    consoleMethod(`${timestamp} [${level.toUpperCase()}]`, ...args);
}

export function info(...args: any[]) {
    log('INFO', nativeConsoleLog, ...args);
}

export function error(...args: any[]) {
    log('ERROR', nativeConsoleError, ...args);
}

export function debug(...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
        log('DEBUG', nativeConsoleLog, ...args);
    }
}