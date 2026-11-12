import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import auth from '@react-native-firebase/auth';
import { ApiResponse, UserProfile, UserUpdateRequest } from './types';

// Default to Android Emulator 10.0.2.2:8080, easily configurable
export const API_BASE_URL = 'http://10.0.2.2:8080';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Firebase ID Token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // Fallback for dev mode if not logged in via Firebase
        config.headers.Authorization = 'Bearer dev-token';
      }
    } catch (err) {
      console.warn('Could not get Firebase token, using dev-token fallback:', err);
      config.headers.Authorization = 'Bearer dev-token';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to unwrap data and normalize errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<any>>) => {
    if (error.response?.status === 401) {
      console.warn('Unauthorized API call detected');
    }
    return Promise.reject(error);
  }
);

export const userApi = {
  getMe: async (): Promise<UserProfile> => {
    const res = await apiClient.get<ApiResponse<UserProfile>>('/api/users/me');
    return res.data.data;
  },
  updateProfile: async (data: UserUpdateRequest): Promise<UserProfile> => {
    const res = await apiClient.put<ApiResponse<UserProfile>>('/api/users/me', data);
    return res.data.data;
  },
  deleteAccount: async (): Promise<void> => {
    await apiClient.delete<ApiResponse<void>>('/api/users/me');
  },
};
