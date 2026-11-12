import { isAxiosError } from 'axios';

export interface ApiErrorBody {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

/** Lỗi API đã chuẩn hóa: mọi tầng trên chỉ cần đọc `code`/`message`. */
export class ApiError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    options: { code?: string; status?: number; details?: Record<string, unknown> } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.status = options.status;
    this.details = options.details;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (isAxiosError(error)) {
    const body = error.response?.data as
      | { error?: ApiErrorBody; message?: string }
      | undefined;
    const apiError = body?.error;

    return new ApiError(apiError?.message ?? error.message, {
      code: apiError?.code ?? (error.response ? `HTTP_${error.response.status}` : 'NETWORK_ERROR'),
      status: error.response?.status,
      details: apiError?.details,
    });
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError(String(error));
}
