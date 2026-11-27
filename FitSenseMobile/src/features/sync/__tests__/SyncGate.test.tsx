import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { useAuthStore } from '../../../stores/useAuthStore';
import { syncManager } from '../../../services/sync';
import { SyncGate } from '../SyncGate';

jest.mock('@react-native-firebase/auth');
jest.mock('../../../services/sync', () => ({
  syncManager: {
    start: jest.fn(),
    stop: jest.fn(),
    clearLocalData: jest.fn(async () => {}),
  },
}));

const manager = syncManager as jest.Mocked<typeof syncManager>;

beforeEach(async () => {
  jest.clearAllMocks();
  await act(async () => {
    useAuthStore.setState({ isAuthenticated: false, token: null, user: null });
  });
});

test('starts syncing once the user is authenticated', async () => {
  await act(async () => {
    useAuthStore.setState({ isAuthenticated: true });
  });

  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(<SyncGate />);
  });

  expect(manager.start).toHaveBeenCalled();
  expect(manager.clearLocalData).not.toHaveBeenCalled();
  await act(async () => {
    tree.unmount();
  });
});

test('stops syncing and clears local data on logout', async () => {
  await act(async () => {
    useAuthStore.setState({ isAuthenticated: true });
  });

  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(<SyncGate />);
  });

  await act(async () => {
    useAuthStore.setState({ isAuthenticated: false });
  });

  expect(manager.stop).toHaveBeenCalled();
  expect(manager.clearLocalData).toHaveBeenCalledTimes(1);
  await act(async () => {
    tree.unmount();
  });
});

test('does not clear local data while logged out on cold start', async () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(<SyncGate />);
  });

  expect(manager.start).not.toHaveBeenCalled();
  expect(manager.clearLocalData).not.toHaveBeenCalled();
  await act(async () => {
    tree.unmount();
  });
});
