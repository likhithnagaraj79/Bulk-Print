/**
 * Centralized API Client for NEXUS Frontend
 * Handles base URL, authorization headers, and common error handling.
 */

// In production set VITE_API_URL=https://your-backend.onrender.com/api/v1
// In local dev leave unset — Vite proxy forwards /api → localhost:8000
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

export class ApiClient {
  private static async getAuthToken(): Promise<string | null> {
    return localStorage.getItem('nexus_token');
  }

  private static async getCsrfToken(): Promise<string | null> {
    return localStorage.getItem('nexus_csrf_token');
  }

  public static async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers, ...rest } = options;

    // Build URL with query parameters (skip undefined/null values)
    let url = `${BASE_URL}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    const token = await this.getAuthToken();
    const csrfToken = await this.getCsrfToken();

    const defaultHeaders: Record<string, string> = {};

    // Do not set Content-Type for FormData — the browser sets it automatically with the boundary
    if (options.body && !(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    if (csrfToken) {
      defaultHeaders['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(url, {
      ...rest,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: 'An unexpected error occurred' };
      }

      const err = new Error(errorData.message || `Request failed with status ${response.status}`) as Error & { status: number };
      err.status = response.status;
      throw err;
    }

    // Handle empty responses (like 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  public static async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  public static async post<T>(endpoint: string, body?: any): Promise<T> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      method: 'POST',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  }

  public static async patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  public static async delete<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public static getBaseUrl(): string {
    return BASE_URL;
  }
}
