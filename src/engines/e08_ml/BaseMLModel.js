
/**
 * Base ML Model Class
 * All specific machine learning models should extend this class
 */

class BaseMLModel {
  constructor(modelId, modelName) {
    this.modelId = modelId;
    this.modelName = modelName;
    this.isLoaded = false;
    this.isTraining = false;
    this.version = "1.0.0";
    this.metadata = {};
    this.predictionsCache = new Map();
    this.cacheSizeLimit = 1000;
  }

  /**
   * Load the ML model
   * In real implementation, this would load TensorFlow.js, ONNX, or other ML framework models
   */
  async load() {
    throw new Error('load() method must be implemented by subclass');
  }

  /**
   * Make a prediction using the model
   * @param {Object} inputFeatures - Features for prediction
   * @returns {Object} Prediction result
   */
  async predict(inputFeatures) {
    throw new Error('predict() method must be implemented by subclass');
  }

  /**
   * Train the model with new data
   * @param {Array} trainingData - Training dataset
   * @returns {Object} Training result
   */
  async train(trainingData) {
    throw new Error('train() method must be implemented by subclass');
  }

  /**
   * Evaluate model performance
   * @param {Array} testData - Test dataset
   * @returns {Object} Evaluation metrics
   */
  async evaluate(testData) {
    throw new Error('evaluate() method must be implemented by subclass');
  }

  /**
   * Get model information
   * @returns {Object} Model metadata
   */
  getInfo() {
    return {
      modelId: this.modelId,
      modelName: this.modelName,
      version: this.version,
      isLoaded: this.isLoaded,
      isTraining: this.isTraining,
      metadata: this.metadata
    };
  }

  /**
   * Log helper method
   */
  log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    if (__DEV__) {
      console.log(`[E08_ML:${this.modelId}][${level.toUpperCase()}] ${message}`, metadata);
    }
  }

  /**
   * Cache prediction results to avoid recomputation
   * @param {string} cacheKey - Key for caching
   * @param {Object} result - Prediction result to cache
   */
  cachePrediction(cacheKey, result) {
    // Limit cache size
    if (this.predictionsCache.size >= this.cacheSizeLimit) {
      // Remove oldest entry (simplified LRU)
      const firstKey = this.predictionsCache.keys().next().value;
      if (firstKey) {
        this.predictionsCache.delete(firstKey);
      }
    }
    this.predictionsCache.set(cacheKey, {
      result: result,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached prediction if available
   * @param {string} cacheKey - Key for caching
   * @returns {Object|null} Cached result or null if not found/expired
   */
  getCachedPrediction(cacheKey) {
    const cached = this.predictionsCache.get(cacheKey);
    if (!cached) {
      return null;
    }
    
    // Cache expires after 5 minutes
    if (Date.now() - cached.timestamp > 5 * 60 * 1000) {
      this.predictionsCache.delete(cacheKey);
      return null;
    }
    
    return cached.result;
  }

  /**
   * Clear prediction cache
   */
  clearPredictionCache() {
    this.predictionsCache.clear();
    this.log('info', 'Prediction cache cleared');
  }
}

// Export base class for use by specific ML models
export default BaseMLModel;
