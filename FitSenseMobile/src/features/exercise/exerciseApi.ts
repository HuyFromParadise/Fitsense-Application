import { apiClient } from '../../services/api/client';
import { ApiResponse } from '../../services/api/types';
import {
  ExerciseCreateRequest,
  ExerciseDetail,
  ExerciseSummary,
  ExerciseType,
  ExerciseUpdateRequest,
  GpsPoint,
  PageResponse,
} from './types';

const GPS_BATCH_SIZE = 500;

export const exerciseApi = {
  createExercise: async (request: ExerciseCreateRequest): Promise<ExerciseSummary> => {
    const points = request.gpsPoints ?? [];

    // Send first batch (up to 500 points) with POST /api/exercises
    const firstBatch = points.slice(0, GPS_BATCH_SIZE);
    const createRes = await apiClient.post<ApiResponse<ExerciseSummary>>(
      '/api/exercises',
      {
        ...request,
        gpsPoints: firstBatch,
      }
    );

    // If session has more than 500 points, upload remaining batches via PUT /api/exercises/{id}
    for (let offset = GPS_BATCH_SIZE; offset < points.length; offset += GPS_BATCH_SIZE) {
      const batch: GpsPoint[] = points.slice(offset, offset + GPS_BATCH_SIZE);
      await apiClient.put<ApiResponse<ExerciseSummary>>(
        `/api/exercises/${request.id}`,
        {
          status: request.status,
          endedAt: request.endedAt,
          pausedSeconds: request.pausedSeconds,
          gpsPoints: batch,
          metrics: request.metrics,
        }
      );
    }

    return createRes.data.data;
  },

  getExercises: async (
    page = 0,
    size = 20,
    type?: ExerciseType
  ): Promise<PageResponse<ExerciseSummary>> => {
    const params: Record<string, any> = { page, size };
    if (type) params.type = type;
    const res = await apiClient.get<ApiResponse<PageResponse<ExerciseSummary>>>(
      '/api/exercises',
      { params }
    );
    return res.data.data;
  },

  getExerciseDetail: async (id: string): Promise<ExerciseDetail> => {
    const res = await apiClient.get<ApiResponse<ExerciseDetail>>(`/api/exercises/${id}`);
    return res.data.data;
  },

  updateExercise: async (
    id: string,
    request: ExerciseUpdateRequest
  ): Promise<ExerciseSummary> => {
    const res = await apiClient.put<ApiResponse<ExerciseSummary>>(
      `/api/exercises/${id}`,
      request
    );
    return res.data.data;
  },
};
