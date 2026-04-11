import axios, { type AxiosError, type AxiosInstance } from "axios";
import type { ApiErrorHttp } from "@/interfaces/http/api-responses";
import { ApiError, NetworkError } from "@/lib/errors";
import { useAuthStore } from "@/stores/auth.store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

class LurabaApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });

    this.setupInterceptors();
  }

  private isAuthRoute(url?: string) {
    if (!url) return false;
    return url.includes("/auth/login") || url.includes("/auth/register");
  }

  private setupInterceptors() {
    this.instance.interceptors.request.use(
      (config) => {
        if (typeof window !== "undefined") {
          try {
            const token = useAuthStore.getState().token;
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
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
        if (error.response?.status === 401 && typeof window !== "undefined" && !this.isAuthRoute(error.config?.url)) {
          useAuthStore.getState().logout();

          const isAuthPage = window.location.pathname === "/login" || window.location.pathname === "/register";
          if (!isAuthPage) {
            window.location.replace("/login");
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
