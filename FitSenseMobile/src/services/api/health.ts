import { apiClient } from './client';
import { ApiError } from './errors';

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, unknown>; timestamp: string };
}

export interface HealthStatus {
  status: 'UP';
  service: string;
  authMode: 'firebase' | 'dev';
  timestamp: string;
}

export async function fetchHealth(): Promise<HealthStatus> {
  const response = await apiClient.get<ApiEnvelope<HealthStatus>>('/api/health');
  if (!response.data.data) {
    throw new ApiError('Health check không trả dữ liệu', { code: 'INVALID_RESPONSE' });
  }
  return response.data.data;
}
