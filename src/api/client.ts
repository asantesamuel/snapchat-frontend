import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenUtils } from '@/utils/token';

/**
 * Extend ImportMeta to include Vite's env properties
 */
interface ImportMeta {
  readonly env: {
    readonly [key: string]: string | undefined;
  };
}

// ── Base instance ────────────────────────────────────────────────────
export const apiClient = axios.create({
  baseURL: (import.meta as unknown as ImportMeta).env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request interceptor ──────────────────────────────────────────────
// attaches the access token to every outgoing request automatically
// the component that calls an API function never needs to think about headers
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenUtils.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Refresh state ────────────────────────────────────────────────────
// tracks whether a refresh is already in progress
// prevents multiple simultaneous refresh attempts when
// several requests fail with 401 at the same time
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else if (token) resolve(token);
  });
  failedQueue = [];
};

// ── Response interceptor ─────────────────────────────────────────────
// catches 401 responses, attempts token refresh, retries original request
// if refresh also fails, clears tokens and redirects to login
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // only attempt refresh on 401 and only once per request
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // if a refresh is already running, queue this request
    // it will be retried once the refresh completes
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = tokenUtils.getRefreshToken();

    if (!refreshToken) {
      tokenUtils.clearTokens();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(
        `${(import.meta as unknown as ImportMeta).env.VITE_API_BASE_URL}/api/auth/refresh`,
        { refreshToken }
      );

      const newAccessToken: string = data.accessToken;

      tokenUtils.setAccessToken(newAccessToken);
      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);

    } catch (refreshError) {
      processQueue(refreshError, null);
      tokenUtils.clearTokens();
      window.location.href = '/login';
      return Promise.reject(refreshError);

    } finally {
      isRefreshing = false;
    }
  }
);