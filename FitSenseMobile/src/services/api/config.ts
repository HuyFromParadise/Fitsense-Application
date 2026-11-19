import { Platform } from 'react-native';

/**
 * Tự động chọn địa chỉ Backend phù hợp:
 * - Android Emulator: luôn dùng http://10.0.2.2:8080 (kết nối trực tiếp máy tính chủ)
 * - Thiết bị thật: dùng IP Wi-Fi của máy tính (http://10.60.243.158:8080) hoặc qua adb reverse (http://localhost:8080)
 */
const isAndroidEmulator =
  Platform.OS === 'android' &&
  ((Platform.constants as any)?.Model?.toLowerCase().includes('sdk') ||
    (Platform.constants as any)?.Fingerprint?.toLowerCase().includes('generic') ||
    (Platform.constants as any)?.Brand?.toLowerCase().includes('google'));

export const API_BASE_URL = __DEV__
  ? isAndroidEmulator
    ? 'http://10.0.2.2:8080'
    : 'http://10.30.230.86:8080'
  : 'https://api.fitsense.app';

export const API_TIMEOUT_MS = 6_000;
