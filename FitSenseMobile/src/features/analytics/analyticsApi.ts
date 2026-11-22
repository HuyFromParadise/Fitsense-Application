import { apiClient } from '../../services/api/client';
import { ApiResponse } from '../../services/api/types';
import { PeriodAnalytics } from './types';

export const analyticsApi = {
  getWeekly: async (weekStart?: string, timezoneId?: string): Promise<PeriodAnalytics> => {
    const params: Record<string, string> = {};
    if (weekStart) params.weekStart = weekStart;
    if (timezoneId) params.timezoneId = timezoneId;
    const res = await apiClient.get<ApiResponse<PeriodAnalytics>>(
      '/api/analytics/weekly',
      { params: Object.keys(params).length > 0 ? params : undefined }
    );
    return res.data.data;
  },

  getMonthly: async (month?: string, timezoneId?: string): Promise<PeriodAnalytics> => {
    const params: Record<string, string> = {};
    if (month) params.month = month;
    if (timezoneId) params.timezoneId = timezoneId;
    const res = await apiClient.get<ApiResponse<PeriodAnalytics>>(
      '/api/analytics/monthly',
      { params: Object.keys(params).length > 0 ? params : undefined }
    );
    return res.data.data;
  },
};
