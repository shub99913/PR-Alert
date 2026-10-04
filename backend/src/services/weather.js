// OpenWeatherMap Weather Alerts Service (Placeholder)
export async function fetchWeatherAlerts() {
  try {
    if (!process.env.OPENWEATHER_API_KEY) {
      console.warn('OpenWeather API key not configured');
      return [];
    }
    console.log('OpenWeather service not fully implemented');
    return [];
  } catch (error) {
    console.error('Error fetching weather alerts:', error.message);
    return [];
  }
}