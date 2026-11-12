import { getAuth } from '@react-native-firebase/auth';
import axios, { type InternalAxiosRequestConfig } from 'axios';

import { useAuthStore } from '../../stores/useAuthStore';
import { API_BASE_URL, API_TIMEOUT_MS } from './config';
import { toApiError } from './errors';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// getIdToken() returns the cached token and refreshes it automatically when expired.
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token =
    (await getAuth().currentUser?.getIdToken()) ?? useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  error => Promise.reject(toApiError(error)),
);
