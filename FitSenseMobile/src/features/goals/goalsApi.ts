import type { ApiResponse } from '../../services/api/types';
import { apiClient } from '../../services/api/client';
import type { Goal, GoalUpsertRequest } from './types';

export const goalsApi = {
  listGoals: async (): Promise<Goal[]> => {
    const { data } = await apiClient.get<ApiResponse<Goal[]>>('/api/goals');
    return data.data;
  },

  createGoal: async (request: GoalUpsertRequest): Promise<Goal> => {
    const { data } = await apiClient.post<ApiResponse<Goal>>('/api/goals', request);
    return data.data;
  },

  updateGoal: async (id: string, request: GoalUpsertRequest): Promise<Goal> => {
    const { data } = await apiClient.put<ApiResponse<Goal>>(`/api/goals/${id}`, request);
    return data.data;
  },

  deleteGoal: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/goals/${id}`);
  },
};
