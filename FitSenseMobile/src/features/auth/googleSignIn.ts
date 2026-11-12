import {
  GoogleSignin,
  isCancelledResponse,
} from '@react-native-google-signin/google-signin';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
} from '@react-native-firebase/auth';

/** OAuth "Web client" of Firebase project fir-eius4 (from google-services.json). */
const WEB_CLIENT_ID =
  '961127591922-ka6707kgrbnafodr7ke399f0eflftn9u.apps.googleusercontent.com';

let configured = false;

function ensureConfigured() {
  if (!configured) {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
    configured = true;
  }
}

/**
 * Opens the Google account picker and signs the user into Firebase Auth.
 * Returns 'cancelled' when the user dismisses the picker; other failures throw.
 */
export async function signInWithGoogle(): Promise<'success' | 'cancelled'> {
  ensureConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();
  if (isCancelledResponse(response)) {
    return 'cancelled';
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error('Google Sign-In did not return an idToken.');
  }

  await signInWithCredential(getAuth(), GoogleAuthProvider.credential(idToken));
  return 'success';
}
