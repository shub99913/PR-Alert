
/**
 * E08: ML Prediction Engine Index
 * Exports all available machine learning models
 */

import rainfallLSTMModel from './RainfallLSTMModel';
import floodXGBoostModel from './FloodXGBoostModel';
import aftershockOmoriModel from './AftershockOmoriModel';
import anomalyDetectionAutoencoder from './AnomalyDetectionAutoencoder';

export {
  rainfallLSTMModel,
  floodXGBoostModel,
  aftershockOmoriModel,
  anomalyDetectionAutoencoder
};

// Utility function to get model by ID
export function getModelById(modelId) {
  const models = {
    rainfall_lstm: rainfallLSTMModel,
    flood_xgboost: floodXGBoostModel,
    aftershock_omori: aftershockOmoriModel,
    anomaly_autoencoder: anomalyDetectionAutoencoder
  };
  
  return models[modelId] || null;
}

// Utility function to get all models
export function getAllModels() {
  return [
    rainfallLSTMModel,
    floodXGBoostModel,
    aftershockOmoriModel,
    anomalyDetectionAutoencoder
  ];
}

// Utility function to get models by type
export function getModelsByType(type) {
  const allModels = getAllModels();
  return allModels.filter(model => {
    const info = model.getInfo();
    return info.type && info.type.toLowerCase().includes(type.toLowerCase());
  });
}
