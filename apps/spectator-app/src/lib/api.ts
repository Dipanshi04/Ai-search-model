const API_URL = import.meta.env.VITE_API_URL || '';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

class ApiClient {
  async request<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${API_URL}${endpoint}`);
    return response.json();
  }

  async getLeaderboard(category?: string) {
    const query = category ? `?category=${category}` : '';
    return this.request<any[]>(`/api/v1/participants/leaderboard${query}`);
  }

  async getRaceStatus() {
    return this.request<any>('/api/v1/race/status');
  }

  async getAnnouncements() {
    return this.request<any[]>('/api/v1/announcements');
  }

  async searchRunner(query: string) {
    return this.request<any[]>(`/api/v1/participants/search?q=${query}`);
  }
}

export const api = new ApiClient();