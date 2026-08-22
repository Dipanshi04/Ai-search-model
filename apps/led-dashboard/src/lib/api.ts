const API_URL = import.meta.env.VITE_API_URL || '';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
}

class ApiClient {
  async request<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${API_URL}${endpoint}`);
    return response.json();
  }

  async getRaceStatus() {
    return this.request<any>('/api/v1/race/status');
  }

  async getLeaderboard(category?: string) {
    const query = category ? `?category=${category}` : '';
    return this.request<any[]>(`/api/v1/participants/leaderboard${query}`);
  }

  async getTreeCounter() {
    return this.request<any>('/api/v1/trees/counter');
  }

  async getAnnouncements() {
    return this.request<any[]>('/api/v1/announcements');
  }
}

export const api = new ApiClient();