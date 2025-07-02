import chalk from "chalk";

const nativeConsoleLog = console.log;
const nativeConsoleError = console.error;

const getTimestamp = (): string => new Date().toISOString();

function log(
    level: string,
    consoleMethod: (...args: any[]) => void,
    colorFn: (msg: string) => string,
    ...args: any[]
) {
    const timestamp = getTimestamp();
    const prefix = colorFn(`${timestamp} [${level.toUpperCase()}]`);
    consoleMethod(prefix, ...args);
}

export function info(...args: any[]) {
    log('INFO', nativeConsoleLog, msg => chalk.green(msg), ...args);
}

export function error(...args: any[]) {
    log('ERROR', nativeConsoleError, msg => chalk.red(msg), ...args);
}

export function debug(...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
        log('DEBUG', nativeConsoleLog, msg => chalk.blue(msg), ...args);
    }
}