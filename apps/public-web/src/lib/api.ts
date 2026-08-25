const API_URL = import.meta.env.VITE_API_URL || '';

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

  async hrLogin(email: string, password: string) {
    const response = await fetch(`${API_URL}/api/v1/hr/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  }

  async hrGetMe() {
    const headers: Record<string, string> = {};
    const hrToken = localStorage.getItem('hr_token');
    if (hrToken) headers['Authorization'] = `Bearer ${hrToken}`;
    const response = await fetch(`${API_URL}/api/v1/hr/me`, { headers });
    return response.json();
  }

  async hrGetParticipants(params?: { page?: number; limit?: number }) {
    const headers: Record<string, string> = {};
    const hrToken = localStorage.getItem('hr_token');
    if (hrToken) headers['Authorization'] = `Bearer ${hrToken}`;
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString();
    const response = await fetch(`${API_URL}/api/v1/hr/participants${qs ? '?' + qs : ''}`, { headers });
    return response.json();
  }

  async hrGetCurrentEvent() {
    const headers: Record<string, string> = {};
    const hrToken = localStorage.getItem('hr_token');
    if (hrToken) headers['Authorization'] = `Bearer ${hrToken}`;
    const response = await fetch(`${API_URL}/api/v1/hr/event/current`, { headers });
    return response.json();
  }

  async hrAddParticipant(data: {
    name: string; email: string; phone: string; category: string; gender: string;
    emergencyContact?: string; emergencyPhone?: string; bloodGroup?: string; tshirtSize?: string;
    eventId?: string;
  }) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const hrToken = localStorage.getItem('hr_token');
    if (hrToken) headers['Authorization'] = `Bearer ${hrToken}`;
    const response = await fetch(`${API_URL}/api/v1/hr/participants`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async hrUploadCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const headers: Record<string, string> = {};
    const hrToken = localStorage.getItem('hr_token');
    if (hrToken) headers['Authorization'] = `Bearer ${hrToken}`;
    const response = await fetch(`${API_URL}/api/v1/hr/participants/csv`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return response.json();
  }

  async hrDownloadSampleCSV() {
    const hrToken = localStorage.getItem('hr_token');
    const headers: Record<string, string> = {};
    if (hrToken) headers['Authorization'] = `Bearer ${hrToken}`;
    const response = await fetch(`${API_URL}/api/v1/hr/participants/csv/sample`, { headers });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-participants.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async hrForgotPassword(email: string) {
    const response = await fetch(`${API_URL}/api/v1/hr/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return response.json();
  }

  async hrResetPassword(token: string, password: string) {
    const response = await fetch(`${API_URL}/api/v1/hr/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    return response.json();
  }
}

export const api = new ApiClient();