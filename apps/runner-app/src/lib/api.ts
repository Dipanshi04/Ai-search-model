const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('runner_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('runner_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('runner_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
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

    const data = await response.json();

    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      this.clearToken();
      window.location.href = '/';
    }

    return data;
  }

  async login(email: string, password: string) {
    return this.request<any>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<any>('/api/v1/auth/me');
  }

  async getMyParticipant(eventId?: string) {
    const query = eventId ? `?eventId=${eventId}` : '';
    return this.request<any>(`/api/v1/participants/me${query}`);
  }

  async getMyQrCode(participantId: string) {
    return this.request<any>(`/api/v1/participants/${participantId}/qr`);
  }

  async getRaceStatus() {
    return this.request<any>('/api/v1/race/status');
  }

  async getLeaderboard(category?: string) {
    const query = category ? `?category=${category}` : '';
    return this.request<any[]>(`/api/v1/participants/leaderboard${query}`);
  }

  async getTreeCounter() {
    return this.request<any[]>('/api/v1/trees/counter');
  }

  async getEvent(eventId: string) {
    return this.request<any>(`/api/v1/events/${eventId}`);
  }

  async getRoute(raceDistanceId: string) {
    return this.request<any>(`/api/v1/routes/${raceDistanceId}`);
  }
}

export const api = new ApiClient();