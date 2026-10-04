
/**
 * Base Adapter Class
 * All specific data source adapters should extend this class
 */

class BaseAdapter {
  constructor(sourceId) {
    this.sourceId = sourceId;
    this.sourceName = sourceId; // Override in subclasses
  }

  /**
   * Normalize raw data from source to our internal event format
   * @param {any} rawData - Raw data from the data source
   * @returns {Object} Normalized event object(s)
   */
  normalize(rawData) {
    throw new Error('normalize() method must be implemented by subclass');
  }

  /**
   * Validate that we can handle the given raw data
   * @param {any} rawData - Raw data to validate
   * @returns {boolean} True if we can process this data
   */
  canHandle(rawData) {
    throw new Error('canHandle() method must be implemented by subclass');
  }

  /**
   * Get metadata about this adapter
   * @returns {Object} Adapter information
   */
  getInfo() {
    return {
      sourceId: this.sourceId,
      sourceName: this.sourceName,
      type: this.constructor.name
    };
  }

  /**
   * Log helper method
   */
  log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    if (__DEV__) {
      console.log(`[E05_Adapter:${this.sourceId}][${level.toUpperCase()}] ${message}`, metadata);
    }
  }
}

// Export base class for use by specific adapters
export default BaseAdapter;
