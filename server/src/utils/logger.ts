import chalk from "chalk";
import type { LogArgs, ColorFn, ConsoleMethod } from "../types";

const nativeConsoleLog: ConsoleMethod = console.log.bind(console);
const nativeConsoleError: ConsoleMethod = console.error.bind(console);

const getTimestamp = (): string => new Date().toISOString();

function log(
    level: 'INFO' | 'ERROR' | 'DEBUG',
    consoleMethod: ConsoleMethod,
    colorFn: ColorFn,
    ...args: LogArgs
): void {
    const timestamp = getTimestamp();
    const prefix = colorFn(`${timestamp} [${level.toUpperCase()}]`);
    consoleMethod(prefix, ...args);
}

export function info(...args: LogArgs) {
    log('INFO', nativeConsoleLog, msg => chalk.green(msg), ...args);
}

export function error(...args: LogArgs) {
    log('ERROR', nativeConsoleError, msg => chalk.red(msg), ...args);
}

export function debug(...args: LogArgs) {
    if (process.env.NODE_ENV === 'development') {
        log('DEBUG', nativeConsoleLog, msg => chalk.blue(msg), ...args);
    }
}