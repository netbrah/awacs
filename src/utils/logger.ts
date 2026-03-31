import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_PREFIX: Record<LogLevel, string> = {
  debug: chalk.gray('[DEBUG]'),
  info: chalk.cyan('[INFO]'),
  warn: chalk.yellow('[WARN]'),
  error: chalk.red('[ERROR]'),
};

let currentLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

function log(level: LogLevel, message: string, ...args: unknown[]): void {
  if (LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel]) {
    const prefix = LEVEL_PREFIX[level];
    const timestamp = new Date().toISOString().slice(11, 19);
    console.error(`${chalk.dim(timestamp)} ${prefix} ${message}`, ...args);
  }
}

export const logger = {
  debug: (msg: string, ...args: unknown[]) => log('debug', msg, ...args),
  info: (msg: string, ...args: unknown[]) => log('info', msg, ...args),
  warn: (msg: string, ...args: unknown[]) => log('warn', msg, ...args),
  error: (msg: string, ...args: unknown[]) => log('error', msg, ...args),
};
