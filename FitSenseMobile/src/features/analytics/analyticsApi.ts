import { apiClient } from '../../services/api/client';
import { ApiResponse } from '../../services/api/types';
import { PeriodAnalytics } from './types';

export const analyticsApi = {
  getWeekly: async (weekStart?: string): Promise<PeriodAnalytics> => {
    const params = weekStart ? { weekStart } : undefined;
    const res = await apiClient.get<ApiResponse<PeriodAnalytics>>(
      '/api/analytics/weekly',
      { params }
    );
    return res.data.data;
  },

  getMonthly: async (month?: string): Promise<PeriodAnalytics> => {
    const params = month ? { month } : undefined;
    const res = await apiClient.get<ApiResponse<PeriodAnalytics>>(
      '/api/analytics/monthly',
      { params }
    );
    return res.data.data;
  },
};
