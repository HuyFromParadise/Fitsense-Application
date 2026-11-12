import { apiClient } from '../../services/api/client';
import type {
  ApiResponse,
  UserProfile,
  UserUpdateRequest,
} from '../../services/api/types';

export async function getMyProfile(): Promise<UserProfile> {
  const { data } = await apiClient.get<ApiResponse<UserProfile>>('/api/users/me');
  return data.data;
}

export async function updateMyProfile(
  request: UserUpdateRequest,
): Promise<UserProfile> {
  const { data } = await apiClient.put<ApiResponse<UserProfile>>(
    '/api/users/me',
    request,
  );
  return data.data;
}

/**
 * Guarantees the MySQL `users` row exists for the signed-in Firebase user.
 * The backend creates it lazily on the first /api/users/me call, so login alone
 * never writes to MySQL. Failures are non-fatal (offline / backend down).
 */
export async function syncProfileToBackend(user: {
  displayName: string | null;
}): Promise<void> {
  try {
    if (user.displayName) {
      await updateMyProfile({ displayName: user.displayName });
    } else {
      await getMyProfile();
    }
  } catch (error) {
    console.warn('Could not sync user profile with backend:', error);
  }
}
