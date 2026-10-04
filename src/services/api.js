// API Service for PR-Alert Mobile App
// Connects to the PR-Alert backend API

const API_BASE_URL = __DEV__ 
  ? 'http://10.0.2.2:3001/api'  // Android emulator
  : 'https://api.pr-alert.org/api';

class ApiService {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  setAuthToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Events
  async getLiveEvents() {
    return this.request('/events/live');
  }

  async getEvents(params = {}) {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.type) query.set('type', params.type);
    if (params.severity) query.set('severity', params.severity);
    return this.request(`/events?${query.toString()}`);
  }

  async getEvent(id) {
    return this.request(`/events/${id}`);
  }

  // Alerts
  async getAlerts(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.type) query.set('type', params.type);
    if (params.limit) query.set('limit', params.limit.toString());
    return this.request(`/alerts?${query.toString()}`);
  }

  async getAlert(id) {
    return this.request(`/alerts/${id}`);
  }

  // Crowd Reports
  async submitCrowdReport(report) {
    return this.request('/crowd-reports', {
      method: 'POST',
      body: JSON.stringify(report),
    });
  }

  async getCrowdReports(params = {}) {
    const query = new URLSearchParams();
    if (params.lat) query.set('lat', params.lat.toString());
    if (params.lon) query.set('lon', params.lon.toString());
    if (params.radius) query.set('radius', params.radius.toString());
    if (params.type) query.set('type', params.type);
    if (params.severity) query.set('severity', params.severity);
    if (params.status) query.set('status', params.status);
    if (params.limit) query.set('limit', params.limit.toString());
    return this.request(`/crowd-reports?${query.toString()}`);
  }

  async voteCrowdReport(reportId, userId, vote) {
    return this.request(`/crowd-reports/${reportId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ userId, vote }),
    });
  }

  async verifyCrowdReport(reportId, verifiedBy, notes) {
    return this.request(`/crowd-reports/${reportId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ verifiedBy, notes }),
    });
  }

  async escalateCrowdReport(reportId, escalatedBy) {
    return this.request(`/crowd-reports/${reportId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ escalatedBy }),
    });
  }

  // Users
  async getUser(id) {
    return this.request(`/users/${id}`);
  }

  async createUser(user) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async updateUser(id, updates) {
    return this.request(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // Dispatch
  async getDispatchHistory(alertId) {
    return this.request(`/dispatch/history/${alertId}`);
  }

  // Stats
  async getStats() {
    return this.request('/stats');
  }

  // Health
  async healthCheck() {
    return this.request('/health');
  }
}

export const apiService = new ApiService();

export default apiService;