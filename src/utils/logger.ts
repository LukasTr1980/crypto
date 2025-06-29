const nativeConsoleLog = console.log;
const nativeConsoleError = console.log;

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