import { Platform } from 'react-native';

let cachedDeviceId: string | null = null;

/** Id tạm cho thiết bị (dùng chung cho register device + sync reconcile). */
export function getDeviceId(): string {
  if (!cachedDeviceId) {
    cachedDeviceId = `${Platform.OS}-${Math.random().toString(36).substring(2, 10)}`;
  }
  return cachedDeviceId;
}
