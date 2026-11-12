import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { useAuthStore } from '../../../stores/useAuthStore';
import { AuthProvider } from '../AuthProvider';

jest.mock('@react-native-firebase/auth');

const authMock = jest.requireMock('@react-native-firebase/auth') as any;

function renderProvider() {
  return ReactTestRenderer.create(
    <AuthProvider>
      <></>
    </AuthProvider>,
  );
}

beforeEach(() => {
  authMock.__reset();
  useAuthStore.setState({
    token: null,
    user: null,
    isAuthenticated: false,
    initializing: true,
  });
});

test('hydrates the store from the persisted Firebase user', async () => {
  authMock.__setUser({
    uid: 'uid-1',
    email: 'a@fitsense.app',
    displayName: 'An',
    getIdToken: async () => 'token-1',
  });

  await ReactTestRenderer.act(async () => {
    renderProvider();
  });

  expect(useAuthStore.getState()).toMatchObject({
    token: 'token-1',
    isAuthenticated: true,
    initializing: false,
    user: { uid: 'uid-1', email: 'a@fitsense.app', displayName: 'An' },
  });
});

test('finishes initializing with no session when Firebase has no user', async () => {
  await ReactTestRenderer.act(async () => {
    renderProvider();
  });

  expect(useAuthStore.getState()).toMatchObject({
    token: null,
    isAuthenticated: false,
    initializing: false,
  });
});

test('signOut ends the Firebase session and clears the store', async () => {
  authMock.__setUser({
    uid: 'uid-1',
    email: 'a@fitsense.app',
    displayName: 'An',
    getIdToken: async () => 'token-1',
  });
  await ReactTestRenderer.act(async () => {
    renderProvider();
  });

  await ReactTestRenderer.act(async () => {
    await useAuthStore.getState().signOut();
  });

  expect(authMock.getAuth().signOut).toHaveBeenCalled();
  expect(useAuthStore.getState()).toMatchObject({
    token: null,
    isAuthenticated: false,
  });
});
