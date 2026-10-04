const logLevels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = process.env.LOG_LEVEL || 'info';

function shouldLog(level) {
  return logLevels[level] <= logLevels[currentLevel];
}

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  return log;
}

export const logger = {
  error: (message, meta) => {
    if (shouldLog('error')) console.error(formatMessage('error', message, meta));
  },
  warn: (message, meta) => {
    if (shouldLog('warn')) console.warn(formatMessage('warn', message, meta));
  },
  info: (message, meta) => {
    if (shouldLog('info')) console.log(formatMessage('info', message, meta));
  },
  debug: (message, meta) => {
    if (shouldLog('debug')) console.log(formatMessage('debug', message, meta));
  },
};

export default logger;