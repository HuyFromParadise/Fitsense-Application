import axios, { type InternalAxiosRequestConfig } from 'axios';

import { useAuthStore } from '../../stores/useAuthStore';
import { API_BASE_URL, API_TIMEOUT_MS } from './config';
import { toApiError } from './errors';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// Khung: F1 (A) đổ token vào useAuthStore, mọi request tự có Bearer.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  error => Promise.reject(toApiError(error)),
);
