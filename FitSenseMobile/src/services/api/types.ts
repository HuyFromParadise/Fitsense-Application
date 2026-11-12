export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: ApiError;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  birthDate: string | null;
  heightCm: number | null;
  weightKg: number | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  avatarUrl: string | null;
  bmi: number | null;
  createdAt: string;
}

export interface UserUpdateRequest {
  displayName?: string;
  birthDate?: string;
  heightCm?: number;
  weightKg?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
  avatarUrl?: string;
}
