const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('isa_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('isa_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('isa_token');
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }
      return { success: true, data: undefined as T };
    }

    const data = await response.json();

    if (response.status === 401) {
      this.clearToken();
      window.location.href = '/login';
    }

    if (!response.ok) {
      throw new Error(data.message || `Request failed: ${response.status}`);
    }

    return data;
  }

  async adminLogin(email: string, password: string) {
    return this.request<{ user: any; tokens: { accessToken: string; refreshToken: string } }>(
      '/api/v1/auth/admin-login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
  }

  async getMe() {
    return this.request<any>('/api/v1/auth/me');
  }

  async getParticipants(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/api/v1/participants${query}`);
  }

  async getParticipant(id: string) {
    return this.request<any>(`/api/v1/participants/${id}`);
  }

  async updateParticipant(id: string, data: any) {
    return this.request<any>(`/api/v1/participants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteParticipant(id: string) {
    return this.request<void>(`/api/v1/participants/${id}`, { method: 'DELETE' });
  }

  async getParticipantStats(eventId?: string) {
    const query = eventId ? `?eventId=${eventId}` : '';
    return this.request<any>(`/api/v1/participants/stats/summary${query}`);
  }

  async exportParticipantsCSV() {
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const response = await fetch(`${API_URL}/api/v1/participants/export/csv`, { headers });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'participants.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async scanCheckin(qrData: string) {
    return this.request<any>('/api/v1/checkin/scan', {
      method: 'POST',
      body: JSON.stringify({ qrData }),
    });
  }

  async undoCheckin(id: string) {
    return this.request<any>(`/api/v1/checkin/undo/${id}`, { method: 'POST' });
  }

  async getCheckinStats(eventId?: string) {
    const query = eventId ? `?eventId=${eventId}` : '';
    return this.request<any>(`/api/v1/checkin/stats${query}`);
  }

  async startRace(eventId: string) {
    return this.request<any>('/api/v1/race/start', {
      method: 'POST',
      body: JSON.stringify({ eventId }),
    });
  }

  async pauseRace(eventId: string) {
    return this.request<any>('/api/v1/race/pause', {
      method: 'POST',
      body: JSON.stringify({ eventId }),
    });
  }

  async endRace(eventId: string) {
    return this.request<any>('/api/v1/race/end', {
      method: 'POST',
      body: JSON.stringify({ eventId }),
    });
  }

  async getRaceStatus(eventId?: string) {
    const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
    return this.request<any>(`/api/v1/race/status${query}`);
  }

  async getCompanies() {
    return this.request<any[]>('/api/v1/participants/companies');
  }

  async createCompany(data: { name: string; contactEmail?: string; contactPhone?: string }) {
    return this.request<any>('/api/v1/participants/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompany(id: string, data: { name: string }) {
    return this.request<any>(`/api/v1/participants/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCompany(id: string) {
    return this.request<void>(`/api/v1/participants/companies/${id}`, { method: 'DELETE' });
  }

  async getEvents() {
    return this.request<any[]>('/api/v1/events');
  }

  async getEvent(id: string) {
    return this.request<any>(`/api/v1/events/${id}`);
  }

  async createEvent(data: { name: string; description?: string; date: string; maxParticipants?: number; registrationOpen?: boolean }) {
    return this.request<any>('/api/v1/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEvent(id: string, data: Record<string, any>) {
    return this.request<any>(`/api/v1/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEvent(id: string) {
    return this.request<void>(`/api/v1/events/${id}`, { method: 'DELETE' });
  }

  async getRaceDistances(eventId: string) {
    return this.request<any[]>(`/api/v1/routes/event/${eventId}`);
  }

  async getRoute(raceDistanceId: string) {
    return this.request<any>(`/api/v1/routes/${raceDistanceId}`);
  }

  async saveRoute(raceDistanceId: string, points: { lat: number; lng: number }[]) {
    return this.request<any>('/api/v1/routes', {
      method: 'POST',
      body: JSON.stringify({ raceDistanceId, points }),
    });
  }

  async createDistance(eventId: string, data: { name: string; distanceKm: number }) {
    return this.request<any>(`/api/v1/events/${eventId}/distances`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDistance(eventId: string, distanceId: string, data: Record<string, any>) {
    return this.request<any>(`/api/v1/events/${eventId}/distances/${distanceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDistance(eventId: string, distanceId: string) {
    return this.request<void>(`/api/v1/events/${eventId}/distances/${distanceId}`, { method: 'DELETE' });
  }

  async getBulkRegistrations() {
    return this.request<any[]>('/api/v1/bulk-registration');
  }

  async createBulkRegistration(data: {
    companyName: string;
    hrName: string;
    hrEmail: string;
    hrPassword: string;
    numberOfRegistrations: number;
    notes?: string;
    companyId?: string;
  }) {
    return this.request<any>('/api/v1/bulk-registration', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBulkRegistration(id: string, data: Record<string, any>) {
    return this.request<any>(`/api/v1/bulk-registration/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBulkRegistration(id: string) {
    return this.request<void>(`/api/v1/bulk-registration/${id}`, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
