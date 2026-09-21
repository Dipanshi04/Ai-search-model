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
  summary?: { total: number; completed: number; failed: number; pending: number };
}

export interface EmailCleanupReport {
  uppercaseEmailCount: number;
  caseCollisionGroups: {
    email: string;
    canAutoMerge: boolean;
    accounts: { id: string; email: string; name: string; phone: string; role: string; participantCount: number }[];
  }[];
  duplicateRegistrationGroups: {
    email: string;
    eventId: string;
    eventName: string;
    recommendedKeepId: string;
    likelySamePerson: boolean;
    participants: {
      id: string; userId: string; bibNumber: string; name: string;
      status: string; paymentStatus: string; createdAt: string;
    }[];
  }[];
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
      ...((options.headers as Record<string, string>) || {}),
    };

    // Don't set Content-Type for FormData - fetch will set it automatically with boundary
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

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

  async getAdmins() {
    return this.request<any[]>('/api/v1/admins');
  }

  async createAdmin(data: { name: string; email: string; phone: string; password: string; role: string }) {
    return this.request<any>('/api/v1/admins', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateAdmin(id: string, data: { role?: string; password?: string }) {
    return this.request<any>(`/api/v1/admins/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteAdmin(id: string) {
    return this.request<void>(`/api/v1/admins/${id}`, { method: 'DELETE' });
  }

  async getParticipants(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/api/v1/participants${query}`);
  }

  async getParticipant(id: string) {
    return this.request<any>(`/api/v1/participants/${id}`);
  }

  async createParticipant(data: any) {
    return this.request<any>('/api/v1/participants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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

  async sendPaymentReminder(id: string) {
    return this.request<void>(`/api/v1/participants/${id}/send-payment-reminder`, { method: 'POST' });
  }

  async sendBulkPaymentReminders(params: { participantIds?: string[]; eventId?: string }) {
    return this.request<{ sent: number; failed: number; total: number }>('/api/v1/participants/send-payment-reminders/bulk', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async resetParticipantPin(id: string) {
    return this.request<{ pin: string; email: string }>(`/api/v1/participants/${id}/reset-pin`, {
      method: 'POST',
    });
  }

  async getParticipantStats(eventId?: string) {
    const query = eventId ? `?eventId=${eventId}` : '';
    return this.request<any>(`/api/v1/participants/stats/summary${query}`);
  }

  async getSharedContacts() {
    return this.request<{
      groups: {
        accountEmail: string; accountPhone: string; accountName: string;
        participants: { id: string; bibNumber: string; name: string | null; category: string; status: string; company: { name: string } | null }[];
      }[];
      totalSharedAccounts: number;
      totalAffectedParticipants: number;
    }>('/api/v1/participants/shared-contacts');
  }

  async getEmailCleanupReport() {
    return this.request<EmailCleanupReport>('/api/v1/participants/email-cleanup');
  }

  async normalizeParticipantEmails() {
    return this.request<{
      normalized: number;
      mergedAccounts: number;
      skipped: { email: string; reason: string }[];
      report: EmailCleanupReport;
    }>('/api/v1/participants/email-cleanup/normalize', { method: 'POST' });
  }

  async mergeDuplicateParticipants(data: {
    keepParticipantId: string;
    duplicateParticipantIds: string[];
    correctName: string;
  }) {
    return this.request<{
      keptBibNumber: string;
      removedBibNumbers: string[];
      report: EmailCleanupReport;
    }>('/api/v1/participants/email-cleanup/merge', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTreeCounter(eventId?: string) {
    const query = eventId ? `?eventId=${eventId}` : '';
    return this.request<{ totalTrees: number; totalKm: number; totalCO2: number }>(`/api/v1/trees${query}`);
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

  async getCompanies(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/api/v1/participants/companies${query}`);
  }

  async createCompany(data: { name: string; contactEmail?: string; contactPhone?: string; status?: 'PREMIUM' | 'NON_PREMIUM'; membershipStartDate?: string; membershipEndDate?: string; renewalPending?: boolean }) {
    return this.request<any>('/api/v1/participants/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompany(id: string, data: { name?: string; contactEmail?: string; contactPhone?: string; status?: 'PREMIUM' | 'NON_PREMIUM'; membershipStartDate?: string; membershipEndDate?: string; renewalPending?: boolean }) {
    return this.request<any>(`/api/v1/participants/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCompany(id: string) {
    return this.request<void>(`/api/v1/participants/companies/${id}`, { method: 'DELETE' });
  }

  async getCoupons() {
    return this.request<any[]>('/api/v1/coupons');
  }

  async getCouponUsages(id: string) {
    return this.request<any[]>(`/api/v1/coupons/${id}/usages`);
  }

  async createCoupon(data: { code: string; discountPercent: number; active?: boolean; usageLimit?: number | null; expiresAt?: string | null; audience?: 'ALL' | 'PREMIUM_ONLY' }) {
    return this.request<any>('/api/v1/coupons', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateCoupon(id: string, data: { code?: string; discountPercent?: number; active?: boolean; usageLimit?: number | null; expiresAt?: string | null; audience?: 'ALL' | 'PREMIUM_ONLY' }) {
    return this.request<any>(`/api/v1/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteCoupon(id: string) {
    return this.request<void>(`/api/v1/coupons/${id}`, { method: 'DELETE' });
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

  async setFeaturedEvent(id: string) {
    return this.request<any>(`/api/v1/events/${id}/feature`, { method: 'POST' });
  }

  async clearFeaturedEvent() {
    return this.request<any>('/api/v1/events/unfeature', { method: 'POST' });
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

  async getBulkTshirtReport() {
    return this.request<{
      sizes: string[];
      rows: { companyName: string; counts: Record<string, number>; total: number }[];
      grandTotal: Record<string, number>;
    }>('/api/v1/bulk-registration/tshirt-report');
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

  async resetBulkRegistrationPassword(id: string, password?: string) {
    return this.request<{ password: string; hrEmail: string }>(`/api/v1/bulk-registration/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(password ? { password } : {}),
    });
  }

  async deleteBulkRegistration(id: string) {
    return this.request<void>(`/api/v1/bulk-registration/${id}`, { method: 'DELETE' });
  }

  async getSponsors(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any[]>(`/api/v1/sponsors${query}`);
  }

  async createSponsor(data: FormData) {
    return this.request<any>('/api/v1/sponsors', {
      method: 'POST',
      body: data,
    });
  }

  async updateSponsor(id: string, data: FormData) {
    return this.request<any>(`/api/v1/sponsors/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteSponsor(id: string) {
    return this.request<void>(`/api/v1/sponsors/${id}`, { method: 'DELETE' });
  }

  async getSponsorCategories() {
    return this.request<any[]>('/api/v1/sponsor-categories');
  }

  async createSponsorCategory(data: { name: string; displayOrder?: number; alwaysSeparate?: boolean }) {
    return this.request<any>('/api/v1/sponsor-categories', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateSponsorCategory(id: string, data: { name?: string; displayOrder?: number; alwaysSeparate?: boolean }) {
    return this.request<any>(`/api/v1/sponsor-categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteSponsorCategory(id: string) {
    return this.request<void>(`/api/v1/sponsor-categories/${id}`, { method: 'DELETE' });
  }

  async getSponsorInquiries(status?: string) {
    const query = status && status !== 'ALL' ? `?status=${status}` : '';
    return this.request<any[]>(`/api/v1/sponsors/inquiries${query}`);
  }

  async updateSponsorInquiryStatus(id: string, status: string) {
    return this.request<any>(`/api/v1/sponsors/inquiries/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getBulkInquiries(status?: string) {
    const query = status && status !== 'ALL' ? `?status=${status}` : '';
    return this.request<any[]>(`/api/v1/bulk-inquiries${query}`);
  }

  async updateBulkInquiryStatus(id: string, status: string) {
    return this.request<any>(`/api/v1/bulk-inquiries/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getPayments(filters?: { status?: string; provider?: string; limit?: number }) {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status);
    if (filters?.provider && filters.provider !== 'ALL') params.set('provider', filters.provider);
    if (filters?.limit) params.set('limit', String(filters.limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/api/v1/payments${query}`);
  }

  async verifyPaymentManual(id: string) {
    return this.request<any>(`/api/v1/payments/${id}/verify`, { method: 'POST' });
  }

  async rejectPaymentManual(id: string, reason: string) {
    return this.request<any>(`/api/v1/payments/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async recheckPayments(params: { bibNumber?: string; email?: string }) {
    return this.request<any>('/api/v1/payments/recheck', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async previewPaymentReconcile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const response = await fetch(`${API_URL}/api/v1/payments/reconcile/preview`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return response.json();
  }

  async applyPaymentReconcile(updates: { paymentId: string; action: 'MARK_PAID' | 'MARK_FAILED'; reason?: string; paidAt?: string }[]) {
    return this.request<any>('/api/v1/payments/reconcile/apply', {
      method: 'POST',
      body: JSON.stringify({ updates }),
    });
  }

  async getSettings(eventId: string) {
    return this.request<Record<string, any>>(`/api/v1/settings/${eventId}`);
  }

  async updateSettings(eventId: string, data: Record<string, any>) {
    return this.request<any>(`/api/v1/settings/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAnnouncements() {
    return this.request<any[]>('/api/v1/announcements?all=true');
  }

  async sendAnnouncement(data: {
    eventId: string;
    title: string;
    message: string;
    location?: string;
    url?: string;
    phone?: string;
    eventDate?: string;
  }) {
    return this.request<any>('/api/v1/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAnnouncement(id: string) {
    return this.request<void>(`/api/v1/announcements/${id}`, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
