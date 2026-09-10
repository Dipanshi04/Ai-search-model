const API_URL = import.meta.env.VITE_API_URL || '';

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
      // Reload within the runner app itself, not the site root — this
      // app is served under /runner/, and '/' would bounce out to the
      // marketing homepage instead of back to this app's own login screen.
      window.location.href = import.meta.env.BASE_URL || '/runner/';
    }

    return data;
  }

  async login(email: string, pin: string) {
    return this.request<any>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, pin }),
    });
  }

  async resetPin(email: string) {
    return this.request<any>('/api/v1/auth/reset-pin', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async changePin(currentPin: string, newPin: string) {
    return this.request<any>('/api/v1/auth/change-pin', {
      method: 'POST',
      body: JSON.stringify({ currentPin, newPin }),
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

  async generateCertificate(participantId: string) {
    return this.request<{ pdfUrl: string }>('/api/v1/certificates/generate', {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    });
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

  async getAnnouncements(eventId: string) {
    return this.request<any[]>(`/api/v1/announcements?eventId=${eventId}`);
  }

  async getSponsors() {
    return this.request<any[]>('/api/v1/sponsors');
  }

  async startCashfreePayment(participantId: string) {
    // window.location.origin + BASE_URL ('/runner/' in prod & dev) so
    // Cashfree sends the runner back into this app after checkout, not
    // the public site's own payment-confirmation page.
    const returnUrl = `${window.location.origin}${import.meta.env.BASE_URL}`;
    return this.request<{ paymentSessionId: string; orderId: string; amount: number; environment: 'sandbox' | 'production' }>(
      '/api/v1/payments/cashfree/start',
      { method: 'POST', body: JSON.stringify({ participantId, returnUrl }) }
    );
  }

  async getCashfreePaymentStatus(orderId: string) {
    return this.request<{ status: string; bibNumber: string }>(
      `/api/v1/payments/cashfree/status?orderId=${orderId}`
    );
  }

  // Bypasses request() — a file upload needs multipart/form-data, not the
  // JSON body + Content-Type header request() always sends.
  async uploadMyPhoto(file: File) {
    const formData = new FormData();
    formData.append('photo', file);
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const response = await fetch(`${API_URL}/api/v1/auth/me/photo`, {
      method: 'POST',
      headers,
      body: formData,
    });
    // A non-JSON error body (nginx/proxy error pages, a dropped connection
    // returning empty text, etc.) would otherwise make response.json()
    // throw a cryptic parser error instead of a message the runner can
    // actually act on.
    try {
      return await response.json();
    } catch {
      return { success: false, message: `Upload failed (HTTP ${response.status}). Please try again.` };
    }
  }
}

export const api = new ApiClient();