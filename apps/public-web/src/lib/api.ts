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
    this.token = localStorage.getItem('runner_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('runner_token', token);
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
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

    return response.json();
  }

  async register(data: any) {
    return this.request<any>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPaymentConfig() {
    return this.request<any>('/api/v1/payments/config');
  }

  async createPaymentOrder(registrationId: string, amount: number) {
    return this.request<any>('/api/v1/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ registrationId, amount }),
    });
  }

  async verifyPayment(data: {
    razorpayOrderId?: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    registrationId?: string;
  }) {
    return this.request<any>('/api/v1/payments/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async reportPaymentFailure(data: {
    razorpayOrderId: string;
    failureReason: string;
  }) {
    return this.request<any>('/api/v1/payments/failure', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getLeaderboard(category?: string, limit?: number) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (limit) params.set('limit', limit.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/api/v1/participants/leaderboard${query}`);
  }

  async getTreeCounter() {
    return this.request<any>('/api/v1/trees/counter');
  }

  async getAnnouncements() {
    return this.request<any[]>('/api/v1/announcements');
  }

  async getEventInfo() {
    return this.request<any>('/api/v1/events/current');
  }
}

export const api = new ApiClient();