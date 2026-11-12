import { signInWithGoogle } from '../googleSignIn';

jest.mock('@react-native-google-signin/google-signin');
jest.mock('@react-native-firebase/auth');

const googleMock = jest.requireMock(
  '@react-native-google-signin/google-signin',
) as any;
const authMock = jest.requireMock('@react-native-firebase/auth') as any;

beforeEach(() => {
  googleMock.__reset();
  authMock.__reset();
});

test('exchanges the Google idToken for a Firebase session', async () => {
  googleMock.__setSignInResponse({
    type: 'success',
    data: { idToken: 'google-id-token', user: { email: 'g@fitsense.app' } },
  });

  await expect(signInWithGoogle()).resolves.toBe('success');

  expect(authMock.GoogleAuthProvider.credential).toHaveBeenCalledWith(
    'google-id-token',
  );
  expect(authMock.signInWithCredential).toHaveBeenCalledTimes(1);
});

test('returns cancelled without calling Firebase when the picker closes', async () => {
  googleMock.__setSignInResponse({ type: 'cancelled', data: null });

  await expect(signInWithGoogle()).resolves.toBe('cancelled');
  expect(authMock.signInWithCredential).not.toHaveBeenCalled();
});

test('fails loudly when Google returns no idToken', async () => {
  googleMock.__setSignInResponse({
    type: 'success',
    data: { idToken: null, user: { email: 'g@fitsense.app' } },
  });

  await expect(signInWithGoogle()).rejects.toThrow(/idToken/);
  expect(authMock.signInWithCredential).not.toHaveBeenCalled();
});
