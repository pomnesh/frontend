import { endpoints } from './endpoints.tsx';

class ApiClient {
  private static instance: ApiClient;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }

  private setCookie(name: string, value: string, maxAge: number): void {
    document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; secure; samesite=strict`;
  }

  private async refreshToken(): Promise<string> {
    const refreshToken = this.getCookie('refresh_token');
    if (!refreshToken) throw new Error('No refresh token');

    const response = await fetch(endpoints.refresh, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) throw new Error('Failed to refresh token');

    const data = await response.json();
    this.setCookie('bearer_token', data.payload.token, 604800);
    this.setCookie('refresh_token', data.payload.refreshToken, 2592000);
    return data.payload.token;
  }

  private async handleResponse(response: Response): Promise<any> {
    if (response.status === 401) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        try {
          const newToken = await this.refreshToken();
          this.isRefreshing = false;
          this.refreshSubscribers.forEach(callback => callback(newToken));
          this.refreshSubscribers = [];
          return this.request(response.url, {
            ...response,
            headers: {
              ...response.headers,
              'Authorization': `Bearer ${newToken}`
            }
          });
        } catch (error) {
          this.isRefreshing = false;
          this.refreshSubscribers = [];
          throw error;
        }
      } else {
        return new Promise(resolve => {
          this.refreshSubscribers.push(token => {
            resolve(this.request(response.url, {
              ...response,
              headers: {
                ...response.headers,
                'Authorization': `Bearer ${token}`
              }
            }));
          });
        });
      }
    }

    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      console.error('Ошибка при разборе ответа:', text);
      throw new Error('Неверный формат ответа от сервера');
    }
  }

  async request(url: string, options: RequestInit = {}): Promise<any> {
    const token = this.getCookie('bearer_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    return this.handleResponse(response);
  }

  async login(username: string, password: string): Promise<any> {
    const response = await fetch(endpoints.login, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (response.ok && data.payload?.token) {
      this.setCookie('bearer_token', data.payload.token, 604800);
      this.setCookie('refresh_token', data.payload.refreshToken, 2592000);
      this.setCookie('pomnesh_user_id', data.payload.id, 2592000);
    }
    return data;
  }

  async getMe(): Promise<any> {
    return this.request(endpoints.getMe, {
      method: 'GET'
    });
  }

  async getUserChats(offset: number = 0, count: number = 2): Promise<any> {
    return this.request(`${endpoints.getUserChats}?offset=${offset}&count=${count}`, {
      method: 'GET'
    });
  }

  async updateUser(userData: { vkToken: string; vkUserId: string }): Promise<any> {
    const userId = this.getCookie('pomnesh_user_id');
    if (!userId) {
      throw new Error('User ID not found');
    }

    return this.request(endpoints.updateUser, {
      method: 'PUT',
      body: JSON.stringify({
        id: parseInt(userId),
        vkId: parseInt(userData.vkUserId),
        vkToken: userData.vkToken
      })
    });
  }
}

export const apiClient = ApiClient.getInstance(); 