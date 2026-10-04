/**
 * E19: Observability & Ops Engine
 * Provides logging, metrics, health checks, and operational tooling
 * for the PR-Alert disaster warning system.
 */

class ObservabilityEngine {
  constructor() {
    this.engineName = 'E19_Observability';
    this.version = '1.0.0';
    this.initialized = false;
    
    // Configuration
    this.config = {
      logLevel: process.env.LOG_LEVEL || 'info',
      metricsEnabled: process.env.METRICS_ENABLED === 'true',
      healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000, // 30s
      retentionPeriod: parseInt(process.env.METRICS_RETENTION_HOURS) || 24, // hours
      enableProfiling: process.env.ENABLE_PROFILING === 'true',
    };
    
    // Internal state
    this.metrics = new Map();
    this.healthChecks = new Map();
    this.logBuffer = [];
    this.maxLogBufferSize = 1000;
    this.activeTraces = new Map();
    this.profilingData = new Map();
    
    // Performance thresholds
    this.thresholds = {
      apiResponseTime: 2000, // ms
      dbQueryTime: 500, // ms
      engineProcessingTime: 1000, // ms
      memoryUsage: 0.8, // 80% of heap
      cpuUsage: 0.7, // 70% CPU
    };
    
    // Bind methods
    this.log = this.log.bind(this);
    this.info = this.info.bind(this);
    this.warn = this.warn.bind(this);
    this.error = this.error.bind(this);
    this.debug = this.debug.bind(this);
    this.metricsIncrement = this.metricsIncrement.bind(this);
    this.metricsGauge = this.metricsGauge.bind(this);
    this.metricsHistogram = this.metricsHistogram.bind(this);
    this.registerHealthCheck = this.registerHealthCheck.bind(this);
    this.runHealthChecks = this.runHealthChecks.bind(this);
    this.startProfiling = this.startProfiling.bind(this);
    this.endProfiling = this.endProfiling.bind(this);
    this.getMetrics = this.getMetrics.bind(this);
    this.getHealthStatus = this.getHealthStatus.bind(this);
    this.getLogs = this.getLogs.bind(this);
  }

  /**
   * Initialize the observability engine
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize() {
    try {
      this.log('info', 'Initializing E19 Observability Engine', {
        version: this.version,
        config: this.config
      });
      
      // Initialize default health checks
      await this._initializeDefaultHealthChecks();
      
      // Start metrics collection if enabled
      if (this.config.metricsEnabled) {
        this._startMetricsCollection();
      }
      
      // Start health check interval
      this._startHealthCheckInterval();
      
      this.initialized = true;
      this.log('info', 'E19 Observability Engine initialized successfully');
      return true;
    } catch (error) {
      this.log('error', 'Failed to initialize E19 Observability Engine', { error: error.message });
      return false;
    }
  }

  /**
   * Log a message with specified level
   * @param {string} level - Log level (info, warn, error, debug)
   * @param {string} message - Log message
   * @param {Object} [metadata] - Additional metadata
   */
  log(level, message, metadata = {}) {
    if (!this._shouldLog(level)) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      engine: this.engineName,
      ...metadata
    };
    
    // Add to buffer
    this.logBuffer.push(logEntry);
    if (this.logBuffer.length > this.maxLogBufferSize) {
      this.logBuffer.shift(); // Remove oldest
    }
    
    // Output to console (in production, would send to external logging system)
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.engineName}] ${message}`;
    switch (level.toLowerCase()) {
      case 'error':
        console.error(logMessage, metadata);
        break;
      case 'warn':
        console.warn(logMessage, metadata);
        break;
      case 'debug':
        if (this.config.logLevel === 'debug') {
          console.debug(logMessage, metadata);
        }
        break;
      default:
        console.log(logMessage, metadata);
    }
  }

  /**
   * Log info level message
   */
  info(message, metadata = {}) {
    this.log('info', message, metadata);
  }

  /**
   * Log warn level message
   */
  warn(message, metadata = {}) {
    this.log('warn', message, metadata);
  }

  /**
   * Log error level message
   */
  error(message, metadata = {}) {
    this.log('error', message, metadata);
  }

  /**
   * Log debug level message
   */
  debug(message, metadata = {}) {
    this.log('debug', message, metadata);
  }

  /**
   * Check if message should be logged based on level
   * @param {string} level - Log level to check
   * @returns {boolean} True if should log
   */
  _shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.config.logLevel.toLowerCase()] || 1;
    const messageLevel = levels[level.toLowerCase()] || 1;
    return messageLevel >= currentLevel;
  }

  /**
   * Increment a counter metric
   * @param {string} name - Metric name
   * @param {number} value - Value to increment by (default: 1)
   * @param {Object} [labels] - Metric labels
   */
  metricsIncrement(name, value = 1, labels = {}) {
    if (!this.config.metricsEnabled) return;
    
    const metricKey = this._createMetricKey(name, labels);
    const current = this.metrics.get(metricKey) || { value: 0, labels, type: 'counter', timestamp: Date.now() };
    this.metrics.set(metricKey, {
      value: current.value + value,
      labels,
      type: 'counter',
      timestamp: Date.now()
    });
  }

  /**
   * Set a gauge metric
   * @param {string} name - Metric name
   * @param {number} value - Gauge value
   * @param {Object} [labels] - Metric labels
   */
  metricsGauge(name, value, labels = {}) {
    if (!this.config.metricsEnabled) return;
    
    const metricKey = this._createMetricKey(name, labels);
    this.metrics.set(metricKey, {
      value,
      labels,
      type: 'gauge',
      timestamp: Date.now()
    });
  }

  /**
   * Record a histogram metric (for timing distributions)
   * @param {string} name - Metric name
   * @param {number} value - Observed value
   * @param {Object} [labels] - Metric labels
   */
  metricsHistogram(name, value, labels = {}) {
    if (!this.config.metricsEnabled) return;
    
    const metricKey = this._createMetricKey(name, labels);
    const histogram = this.metrics.get(metricKey) || {
      count: 0,
      sum: 0,
      buckets: {},
      labels,
      type: 'histogram',
      timestamp: Date.now()
    };
    
    histogram.count += 1;
    histogram.sum += value;
    
    // Define buckets (similar to Prometheus)
    const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
    buckets.forEach(bucket => {
      if (value <= bucket) {
        histogram.buckets[bucket] = (histogram.buckets[bucket] || 0) + 1;
      }
    });
    // +Inf bucket
    histogram.buckets['+Inf'] = (histogram.buckets['+Inf'] || 0) + 1;
    
    this.metrics.set(metricKey, histogram);
  }

  /**
   * Create a metric key from name and labels
   * @param {string} name - Metric name
   * @param {Object} labels - Metric labels
   * @returns {string} Metric key
   */
  _createMetricKey(name, labels) {
    if (!labels || Object.keys(labels).length === 0) return name;
    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelString}}`;
  }

  /**
   * Register a health check function
   * @param {string} name - Health check name
   * @param {Function} checkFn - Async function returning { healthy: boolean, details?: Object }
   * @param {number} [timeoutMs] - Timeout in milliseconds (default: 5000)
   */
  registerHealthCheck(name, checkFn, timeoutMs = 5000) {
    this.healthChecks.set(name, {
      fn: checkFn,
      timeout: timeoutMs,
      lastRun: null,
      lastResult: null,
      consecutiveFailures: 0
    });
    
    this.log('debug', `Registered health check: ${name}`);
  }

  /**
   * Run all registered health checks
   * @returns {Promise<Object>} Health check results
   */
  async runHealthChecks() {
    const results = {
      timestamp: new Date().toISOString(),
      overall: true,
      checks: {}
    };
    
    // Run all health checks concurrently with timeout
    const checkPromises = Array.from(this.healthChecks.entries()).map(
      async ([name, check]) => {
        try {
          const result = await Promise.race([
            check.fn(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Health check timeout')), check.timeout)
            )
          ]);
          
          const isHealthy = result.healthy === true;
          check.lastResult = { 
            healthy: isHealthy, 
            timestamp: new Date().toISOString(),
            details: result.details || {}
          };
          check.lastRun = Date.now();
          
          if (isHealthy) {
            check.consecutiveFailures = 0;
          } else {
            check.consecutiveFailures += 1;
            results.overall = false;
          }
          
          results.checks[name] = check.lastResult;
          return { name, result: check.lastResult };
        } catch (error) {
          check.lastResult = {
            healthy: false,
            timestamp: new Date().toISOString(),
            error: error.message
          };
          check.lastRun = Date.now();
          check.consecutiveFailures += 1;
          results.overall = false;
          
          results.checks[name] = check.lastResult;
          this.log('warn', `Health check ${name} failed: ${error.message}`);
          return { name, result: check.lastResult };
        }
      }
    );
    
    await Promise.all(checkPromises);
    
    // Record health check metrics
    this.metricsGauge('observability_health_checks_total', this.healthChecks.size);
    const healthyChecks = Array.from(this.healthChecks.values())
      .filter(check => check.lastResult && check.lastResult.healthy).length;
    this.metricsGauge('observability_health_checks_healthy', healthyChecks);
    this.metricsGauge('observability_health_overall', results.overall ? 1 : 0);
    
    return results;
  }

  /**
   * Start periodic health check interval
   */
  _startHealthCheckInterval() {
    if (this.healthCheckInterval) return;
    
    this.healthCheckInterval = setInterval(() => {
      this.runHealthChecks().catch(error => {
        this.log('error', 'Error running health checks', { error: error.message });
      });
    }, this.config.healthCheckInterval);
    
    this.log('debug', `Started health check interval: ${this.config.healthCheckInterval}ms`);
  }

  /**
   * Stop health check interval
   */
  _stopHealthCheckInterval() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.log('debug', 'Stopped health check interval');
    }
  }

  /**
   * Initialize default health checks for system components
   * @private
   */
  async _initializeDefaultHealthChecks() {
    // Memory usage health check
    this.registerHealthCheck('memory_usage', async () => {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const used = process.memoryUsage().heapUsed;
        const total = process.memoryUsage().heapTotal;
        const usageRatio = used / total;
        
        return {
          healthy: usageRatio < this.thresholds.memoryUsage,
          details: {
            heapUsed: Math.round(used / 1024 / 1024),
            heapTotal: Math.round(total / 1024 / 1024),
            usageRatio: Number((usageRatio * 100).toFixed(2)) + '%'
          }
        };
      }
      return { healthy: true, details: { status: 'process.memory not available' } };
    }, 5000);
    
    // CPU usage health check (simplified)
    this.registerHealthCheck('cpu_usage', async () => {
      // In a real implementation, would use os-utils or similar
      // For now, return healthy as placeholder
      return { 
        healthy: true, 
        details: { 
          status: 'CPU monitoring not implemented in this environment',
          note: 'In production, use os-utils or similar library'
        } 
      };
    }, 5000);
    
    // Disk usage health check
    this.registerHealthCheck('disk_usage', async () => {
      // Placeholder - in real implementation would check disk space
      return { 
        healthy: true, 
        details: { 
          status: 'Disk monitoring not implemented in this environment',
          note: 'In production, check actual disk usage'
        } 
      };
    }, 5000);
    
    // Event processing lag health check
    this.registerHealthCheck('event_processing_lag', async () => {
      // Would check time since last event was processed
      // For now, simulate based on recent activity
      const lastEventTime = this._getLastEventTimestamp() || Date.now();
      const lagMs = Date.now() - lastEventTime;
      const healthy = lagMs < (5 * 60 * 1000); // 5 minutes
      
      return {
        healthy,
        details: {
          lastEventTime: new Date(lastEventTime).toISOString(),
          lagMinutes: Math.round(lagMs / 1000 / 60),
          thresholdMinutes: 5
        }
      };
    }, 5000);
    
    // Engine status health check
    this.registerHealthCheck('engine_status', async () => {
      // Would check if all engines are operational
      // For now, return healthy as placeholder
      return { 
        healthy: true, 
        details: { 
          status: 'Engine status monitoring not implemented',
          note: 'In production, check actual engine states'
        } 
      };
    }, 5000);
  }

  /**
   * Get last event timestamp from storage (placeholder)
   * @private
   * @returns {number|null} Timestamp or null if not available
   */
  _getLastEventTimestamp() {
    // In real implementation, would query database or cache
    // For now, return null to use current time
    return null;
  }

  /**
   * Start metrics collection interval
   * @private
   */
  _startMetricsCollection() {
    if (this.metricsCollectionInterval) return;
    
    // Collect system metrics periodically
    this.metricsCollectionInterval = setInterval(() => {
      this._collectSystemMetrics();
    }, 15000); // Every 15 seconds
    
    this.log('debug', 'Started metrics collection interval');
  }

  /**
   * Stop metrics collection interval
   */
  _stopMetricsCollection() {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
      this.log('debug', 'Stopped metrics collection interval');
    }
  }

  /**
   * Collect system metrics (placeholder)
   * @private
   */
  _collectSystemMetrics() {
    try {
      // Memory metrics
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const mem = process.memoryUsage();
        this.metricsGauge('node_memory_heap_used_bytes', mem.heapUsed);
        this.metricsGauge('node_memory_heap_total_bytes', mem.heapTotal);
        this.metricsGauge('node_memory_external_bytes', mem.external);
        this.metricsGauge('node_memory_rss_bytes', mem.rss);
      }
      
      // Event loop delay (simplified)
      const loopDelay = process._getActiveHandles ? process._getActiveHandles().length : 0;
      this.metricsGauge('node_eventloop_active_handles', loopDelay);
      
      // Uptime
      if (typeof process !== 'undefined' && process.uptime) {
        this.metricsGauge('node_process_uptime_seconds', process.uptime());
      }
    } catch (error) {
      // Silently ignore metrics collection errors to avoid breaking observability
      this.log('debug', 'Error collecting system metrics', { error: error.message });
    }
  }

  /**
   * Start profiling a code block
   * @param {string} name - Profile name
   * @returns {Object} Profile context with end() method
   */
  startProfiling(name) {
    if (!this.config.enableProfiling) return { end: () => {} };
    
    const profileId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = process.hrtime.bigint();
    
    this.activeTraces.set(profileId, {
      name,
      startTime,
      timestamp: Date.now()
    });
    
    return {
      end: () => this.endProfiling(profileId)
    };
  }

  /**
   * End profiling and record the duration
   * @param {string} profileId - Profile ID from startProfiling
   */
  endProfiling(profileId) {
    if (!this.config.enableProfiling) return;
    
    const trace = this.activeTraces.get(profileId);
    if (!trace) return;
    
    const endTime = process.hrtime.bigint();
    const durationNs = Number(endTime - trace.startTime);
    const durationMs = durationNs / 1000000;
    
    this.activeTraces.delete(profileId);
    
    // Record as histogram
    this.metricsHistogram(`observability_profile_duration_ms`, durationMs, { 
      profile: trace.name 
    });
    
    // Store for querying
    const profileKey = `${trace.name}:${Date.now()}`;
    this.profilingData.set(profileKey, {
      name: trace.name,
      durationMs,
      timestamp: trace.timestamp
    });
    
    // Limit profiling data storage
    if (this.profilingData.size > 1000) {
      // Remove oldest entries
      const sorted = Array.from(this.profilingData.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp);
      this.profilingData.clear();
      for (let i = Math.max(0, sorted.length - 500); i < sorted.length; i++) {
        this.profilingData.set(sorted[i][0], sorted[i][1]);
      }
    }
    
    this.log('debug', `Profile completed: ${trace.name}`, { 
      durationMs: Number(durationMs.toFixed(2)) 
    });
  }

  /**
   * Get current metrics snapshot
   * @returns {Object} Current metrics
   */
  getMetrics() {
    if (!this.config.metricsEnabled) return { enabled: false };
    
    const metricsObj = {};
    this.metrics.forEach((value, key) => {
      metricsObj[key] = value;
    });
    
    return {
      enabled: true,
      timestamp: new Date().toISOString(),
      metrics: metricsObj
    };
  }

  /**
   * Get current health status
   * @returns {Object} Health status
   */
  async getHealthStatus() {
    return await this.runHealthChecks();
  }

  /**
   * Get recent logs
   * @param {number} [limit] - Number of logs to return (default: 100)
   * @param {string} [level] - Filter by level (optional)
   * @returns {Array} Log entries
   */
  getLogs(limit = 100, level) {
    let filtered = this.logBuffer;
    
    if (level) {
      filtered = filtered.filter(entry => 
        entry.level.toLowerCase() === level.toLowerCase()
      );
    }
    
    // Return most recent logs first
    return filtered
      .slice(-limit)
      .reverse()
      .map(entry => ({ ...entry }));
  }

  /**
   * Create a trace context for distributed tracing
   * @param {string} operationName - Name of the operation
   * @returns {Object} Trace context
   */
  createTrace(operationName) {
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    return {
      traceId,
      operationName,
      startTime,
      logs: [],
      finish: () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        this.log('debug', `Trace finished: ${operationName}`, {
          traceId,
          durationMs: duration,
          operation: operationName
        });
        
        // Record as histogram
        this.metricsHistogram('observability_trace_duration_ms', duration, {
          operation: operationName
        });
      },
      log: (level, message, metadata = {}) => {
        this.log(level, `[Trace ${traceId}] ${message}`, {
          traceId,
          operation: operationName,
          ...metadata
        });
      }
    };
  }

  /**
   * Shutdown the observability engine
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.log('info', 'Shutting down E19 Observability Engine');
    
    this._stopHealthCheckInterval();
    this._stopMetricsCollection();
    
    // Final metrics flush
    if (this.config.metricsEnabled) {
      this.log('info', 'Final metrics snapshot', {
        metrics: this.getMetrics()
      });
    }
    
    this.initialized = false;
    return Promise.resolve();
  }

  /**
   * Get engine status and diagnostics
   * @returns {Object} Engine diagnostics
   */
  getDiagnostics() {
    return {
      engine: this.engineName,
      version: this.version,
      initialized: this.initialized,
      config: this.config,
      metricsCount: this.metrics.size,
      healthChecksCount: this.healthChecks.size,
      logBufferSize: this.logBuffer.length,
      activeTraces: this.activeTraces.size,
      profilingEntries: this.profilingData.size,
      uptime: process.uptime ? process.uptime() : 0,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
const observabilityEngine = new ObservabilityEngine();
module.exports = observabilityEngine;

// Also export the class for cases where multiple instances might be needed
observabilityEngine.ObservabilityEngine = ObservabilityEngine;