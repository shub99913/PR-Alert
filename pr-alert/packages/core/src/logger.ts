import pino from 'pino';
import pinoPretty from 'pino-pretty';

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  base: {
    service: 'pr-alert',
    pid: process.pid,
    hostname: process.env.HOSTNAME || 'localhost',
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

// Child logger factory for engines
export function createEngineLogger(engineName: string) {
  return logger.child({ engine: engineName });
}

// Request logger middleware
export function requestLogger() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    
    req.logger = logger.child({
      requestId,
      method: req.method,
      url: req.url,
      ip: req.ip,
    });
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      req.logger.info({
        statusCode: res.statusCode,
        durationMs: duration,
        contentLength: res.get('content-length'),
      }, 'HTTP request completed');
    });
    
    next();
  };
}

// Structured error logging
export function logError(logger: pino.Logger, error: Error, context?: Record<string, any>) {
  logger.error({
    err: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    ...context,
  }, error.message);
}

// Audit logger for critical operations
export const auditLogger = logger.child({ category: 'audit' });

export function auditLog(action: string, details: Record<string, any>, userId?: string) {
  auditLogger.info({
    action,
    userId,
    ...details,
    timestamp: new Date().toISOString(),
  }, `AUDIT: ${action}`);
}

export default logger;