import axios, { type AxiosError, type AxiosInstance } from "axios";
import type { ApiErrorHttp } from "@/interfaces/http/api-responses";
import { ApiError, NetworkError } from "@/lib/errors";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

type RetriableRequestConfig = {
  headers?: Record<string, string>;
  _retry?: boolean;
  url?: string;
};

class LurabaApiClient {
  private instance: AxiosInstance;
  private refreshClient: AxiosInstance;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      withCredentials: true,
    });

    this.refreshClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private shouldSkipRefresh(url?: string) {
    if (!url) return false;
    return url.includes("/auth/refresh") || url.includes("/auth/login") || url.includes("/auth/register");
  }

  private persistAccessToken(accessToken: string) {
    const authStorage = localStorage.getItem("auth-storage");
    if (!authStorage) return;

    const parsed = JSON.parse(authStorage) as {
      state: Record<string, unknown>;
      version?: number;
    };

    parsed.state = {
      ...parsed.state,
      token: accessToken,
      isAuthenticated: true,
    };

    localStorage.setItem("auth-storage", JSON.stringify(parsed));
  }

  private async getFreshAccessToken() {
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        const refreshResponse = await this.refreshClient.post("/auth/refresh");
        const refreshData = refreshResponse.data;

        if (!refreshData.success || !refreshData.data?.accessToken) {
          return null;
        }

        return refreshData.data.accessToken as string;
      })().finally(() => {
        this.refreshPromise = null;
      });
    }

    return this.refreshPromise;
  }

  private setupInterceptors() {
    this.instance.interceptors.request.use(
      (config) => {
        if (typeof window !== "undefined") {
          try {
            const authStorage = localStorage.getItem("auth-storage");
            if (authStorage) {
              const { state } = JSON.parse(authStorage) as {
                state?: { token?: string | null };
              };
              const token = state?.token;
              if (token) {
                config.headers.Authorization = `Bearer ${token}`;
              }
            }
          } catch (error) {
            console.error("Failed to retrieve auth token", error);
          }
        }

        return config;
      },
      (error) => Promise.reject(error),
    );

    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiErrorHttp>) => {
        if (error.response?.status === 401 && typeof window !== "undefined") {
          const originalRequest = error.config as RetriableRequestConfig | undefined;

          if (originalRequest && !originalRequest._retry && !this.shouldSkipRefresh(originalRequest.url)) {
            originalRequest._retry = true;
            try {
              const accessToken = await this.getFreshAccessToken();

              if (accessToken) {
                this.persistAccessToken(accessToken);
                originalRequest.headers = {
                  ...(originalRequest.headers ?? {}),
                  Authorization: `Bearer ${accessToken}`,
                };
                return this.instance(originalRequest);
              }
            } catch {
              // continue to structured error mapping
            }
          }
        }

        if (error.response?.data && !error.response.data.success) {
          const apiError = error.response.data;
          return Promise.reject(
            new ApiError({
              code: apiError.error.code,
              message: apiError.error.message,
              details: apiError.error.details,
              status: error.response.status,
            }),
          );
        }

        if (!error.response) {
          return Promise.reject(new NetworkError());
        }

        return Promise.reject(
          new ApiError({
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
            status: error.response.status,
          }),
        );
      },
    );
  }

  getInstance() {
    return this.instance;
  }
}

export const lurabaApiClient = new LurabaApiClient().getInstance();
