import { getAuth, type User } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  setBackgroundMessageHandler,
  type Messaging,
  type RemoteMessage,
} from '@react-native-firebase/messaging';

/** Khung Firebase (SDK v27 modular): F1 (A) dùng auth, B dùng messaging + Firestore profile. */
export function firebaseAuth() {
  return getAuth();
}

export function firestore() {
  return getFirestore();
}

export function messaging(): Messaging {
  return getMessaging();
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user: User | null = getAuth().currentUser;
  return user ? user.getIdToken(forceRefresh) : null;
}

export async function getFcmToken(): Promise<string | null> {
  const instance = getMessaging();
  await registerDeviceForRemoteMessages(instance);
  return getToken(instance);
}

export function onMessagingMessage(
  listener: (message: RemoteMessage) => void | Promise<void>,
): () => void {
  return onMessage(getMessaging(), listener);
}

export function onMessagingTokenRefresh(
  listener: (token: string) => void | Promise<void>,
): () => void {
  return onTokenRefresh(getMessaging(), listener);
}

export function registerBackgroundMessageHandler(
  handler: (message: RemoteMessage) => Promise<void>,
): void {
  setBackgroundMessageHandler(getMessaging(), handler);
}
