/**
 * Máy thật gọi backend trên laptop qua: adb reverse tcp:8080 tcp:8080
 * => localhost trên điện thoại trỏ về cổng 8080 của máy tính.
 */
export const API_BASE_URL = __DEV__
  ? 'http://localhost:8080'
  : 'https://api.fitsense.app';

export const API_TIMEOUT_MS = 15_000;
