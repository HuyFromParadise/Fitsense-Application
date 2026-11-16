/**
 * Máy thật gọi backend trên laptop qua IP Wi-Fi (192.168.1.12:8080)
 * hoặc qua: adb reverse tcp:8080 tcp:8080 (http://localhost:8080)
 * hoặc qua Android Emulator (http://10.0.2.2:8080)
 */
export const API_BASE_URL = __DEV__
  ? 'http://192.168.1.12:8080'
  : 'https://api.fitsense.app';

export const API_TIMEOUT_MS = 15_000;
