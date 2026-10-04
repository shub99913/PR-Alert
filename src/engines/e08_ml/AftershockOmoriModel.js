
/**
 * E08c: Aftershock Probability Model (Omori's Law)
 * Aftershock probability prediction using statistical seismology
 * 
 * Responsibilities:
 * - Predict aftershock likelihood and magnitude distribution
 * - Uses Omori's law and ETAS model principles
 * - Critical for post-earthquake risk assessment
 */

import BaseMLModel from './BaseMLModel';

class AftershockOmoriModel extends BaseMLModel {
  constructor() {
    super('aftershock_omori', 'Aftershock Probability (Omori\'s Law)');
    this.model = null; // Will hold the aftershock model parameters
  }

  /**
   * Load the aftershock model
   * Omori's law is a mathematical model, not a trained ML model
   */
  async load() {
    try {
      this.log('info', 'Loading Aftershock Omori\'s Law model...');
      
      // Simulate model loading delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Initialize Omori's law parameters
      // n(t) = k / (c + t)^p
      // where n(t) is the rate of aftershocks at time t after mainshock
      this.model = {
        // Default parameters (would be calibrated per region/earthquake)
        k: 1.0,   // productivity parameter
        c: 0.05,  // offset parameter (days)
        p: 1.2,   // decay parameter
        // Magnitude distribution parameters (Gutenberg-Richter)
        bValue: 1.0,  // Gutenberg-Richter b-value
        m0: 4.0,      // magnitude of completeness
        alpha: 1.0,   // productivity-magnitude coupling
        
        // These would be updated based on mainshock characteristics
        mainshockMagnitude: 0,
        mainshockTime: 0
      };
      
      this.isLoaded = true;
      this.metadata = {
        modelType: 'Statistical (Omori\'s Law + ETAS)',
        purpose: 'Aftershock rate and magnitude distribution prediction',
        parameters: ['k', 'c', 'p', 'bValue', 'm0', 'alpha'],
        lastUpdated: new Date().toISOString(),
        reference: 'Omori (1894), Utsu (1961), ETAS model'
      };
      
      this.log('info', 'Aftershock Omori\'s Law model loaded successfully');
      return true;
    } catch (error) {
      this.log('error', `Failed to load Aftershock model: ${error.message}`);
      this.isLoaded = false;
      throw error;
    }
  }

  /**
   * Make aftershock probability prediction
   * @param {Object} mainshockParams - Mainshock characteristics
   * @returns {Object} Aftershock prediction result
   */
  async predict(mainshockParams) {
    if (!this.isLoaded) {
      await this.load();
    }
    
    if (!this.model) {
      throw new Error('Model not loaded');
    }
    
    try {
      this.log('info', 'Making aftershock probability prediction...');
      
      // Extract mainshock parameters
      const mainshockMagnitude = mainshockParams.magnitude || 0;
      const mainshockTime = mainshockParams.timestamp || Date.now();
      const mainshockLocation = mainshockParams.location || { latitude: 20.5937, longitude: 78.9629 };
      
      // Update model parameters based on mainshock (simplified scaling)
      // In reality, these would be empirically determined
      const scaledK = Math.pow(10, mainshockMagnitude - 4) * 0.1; // Productivity scales with magnitude
      const scaledC = Math.max(0.001, 0.05 * Math.pow(10, -mainshockMagnitude / 2)); // Offset decreases with magnitude
      
      // Calculate aftershock rate for various time windows
      const timeWindows = [
        { label: 'next 1 hour', hours: 1 },
        { label: 'next 6 hours', hours: 6 },
        { label: 'next 24 hours', hours: 24 },
        { label: 'next 3 days', hours: 72 },
        { label: 'next 7 days', hours: 168 }
      ];
      
      const aftershockRates = timeWindows.map(window => {
        // Convert hours to days for Omori's law
        const tDays = window.hours / 24;
        
        // Omori's law: n(t) = k / (c + t)^p
        const ratePerDay = scaledK / Math.pow(scaledC + tDays, this.model.p);
        
        // Expected number in this time window
        const expectedCount = ratePerDay * window.hours / 24;
        
        return {
          window: window.label,
          hours: window.hours,
          ratePerDay: ratePerDay,
          expectedCount: expectedCount,
          probabilityAtLeastOne: 1 - Math.exp(-expectedCount) // Poisson probability
        };
      });
      
      // Calculate expected maximum magnitude using scaling laws
      // Based on Bath's law: M_largest_aftershock ≈ M_mainshock - 1.0
      const expectedMaxMagnitude = Math.max(mainshockMagnitude - 1.0, 3.0); // Minimum 3.0
      
      // Magnitude distribution (Gutenberg-Richter)
      // log10(N) = a - b*M
      // where N is cumulative number of events >= magnitude M
      
      // Calculate b-value adjustment (typically ~1.0, can vary)
      const bValue = this.model.bValue;
      
      // Probability of aftershock exceeding certain magnitude
      const magnitudeThresholds = [4.0, 5.0, 6.0];
      const magnitudeProbabilities = magnitudeThresholds.map(mag => {
        if (mag >= mainshockMagnitude) {
          return 0; // Cannot exceed mainshock
        }
        const deltaM = mainshockMagnitude - mag;
        // Simplified: P(M >= m) = 10^(-b*(m-Mc)) where Mc is completeness
        return Math.pow(10, -bValue * (deltaM - (this.model.m0 - mainshockMagnitude)));
      });
      
      // Overall assessment
      const totalExpectedAftershocks = aftershockRates.reduce((sum, window) => sum + window.expectedCount, 0);
      
      const predictionResult = {
        modelId: this.modelId,
        modelName: this.modelName,
        timestamp: Date.now(),
        mainshock: {
          magnitude: mainshockMagnitude,
          time: mainshockTime,
          location: mainshockLocation
        },
        aftershockRates: aftershockRates,
        expectedMaxMagnitude: expectedMaxMagnitude,
        magnitudeProbabilities: {
          ">= 4.0": magnitudeProbabilities[0] || 0,
          ">= 5.0": magnitudeProbabilities[1] || 0,
          ">= 6.0": magnitudeProbabilities[2] || 0
        },
        totalExpectedAftershocks: totalExpectedAftershocks,
        units: {
          rate: 'per day',
          count: 'number of events',
          magnitude: 'Richter scale'
        },
        metadata: {
          modelParameters: {
            k: scaledK,
            c: scaledC,
            p: this.model.p,
            bValue: this.model.bValue,
            m0: this.model.m0,
            alpha: this.model.alpha
          },
          omorisLaw: "n(t) = k / (c + t)^p",
          bathsLaw: "M_largest_aftershock ≈ M_mainshock - 1.0",
          guttenbergRichter: "log10(N) = a - b*M"
        }
      };
      
      this.log('info', `Aftershock prediction completed: ${totalExpectedAftershocks.toFixed(1)} expected aftershocks, max magnitude ~${expectedMaxMagnitude.toFixed(1)}`);
      return predictionResult;
    } catch (error) {
      this.log('error', `Failed to make aftershock prediction: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update model parameters based on a new mainshock
   * @param {Object} mainshock - Mainshock event data
   */
  updateMainshock(mainshock) {
    if (!this.isLoaded) {
      return;
    }
    
    this.model.mainshockMagnitude = mainshock.magnitude || 0;
    this.model.mainshockTime = mainshock.timestamp || Date.now();
    
    // Recalculate parameters based on mainshock
    // These are simplified relationships - real implementation would use empirical formulas
    this.model.k = Math.pow(10, this.model.mainshockMagnitude - 4) * 0.1;
    this.model.c = Math.max(0.001, 0.05 * Math.pow(10, -this.model.mainshockMagnitude / 2));
    
    this.log('info', `Updated aftershock model for M${this.model.mainshockMagnitude} mainshock`);
  }

  /**
   * Get model information
   * @returns {Object} Model metadata
   */
  getInfo() {
    return {
      ...super.getInfo(),
      type: 'Statistical Model (Omori\'s Law)',
      purpose: 'Aftershock rate and magnitude distribution prediction',
      equations: {
        omorisLaw: "n(t) = k / (c + t)^p",
        bathsLaw: "M_largest_aftershock ≈ M_mainshock - 1.0",
        guttenbergRichter: "log10(N) = a - b*M"
      },
      parameters: [
        { name: 'k', description: 'Productivity parameter' },
        { name: 'c', description: 'Offset parameter (days)' },
        { name: 'p', description: 'Decay parameter' },
        { name: 'bValue', description: 'Gutenberg-Richter b-value' },
        { name: 'm0', description: 'Magnitude of completeness' },
        { name: 'alpha', description: 'Productivity-magnitude coupling' }
      ],
      inputs: [
        'mainshock magnitude',
        'mainshock time',
        'mainshock location'
      ],
      outputs: [
        'aftershock rate over time',
        'expected number of aftershocks',
        'maximum expected magnitude',
        'magnitude distribution probabilities'
      ]
    };
  }
}

// Export singleton instance
const aftershockOmoriModel = new AftershockOmoriModel();
export default aftershockOmoriModel;
