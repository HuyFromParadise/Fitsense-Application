import NetInfo from '@react-native-community/netinfo';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { ThemeProvider } from '../../../app/providers/ThemeProvider';
import { LocalDb } from '../../../services/native';
import { useSyncStatus } from '../../../stores/useSyncStatus';
import { useTodayActivity } from '../../../stores/useTodayActivity';
import { DashboardScreen } from '../screens/DashboardScreen';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../profile/useProfile', () => ({
  useProfile: () => ({ profile: { dailyStepGoal: 10000, weightKg: 70 } }),
}));

jest.mock('../useStepCounter', () => ({
  useStepCounter: () => ({
    snapshot: null,
    status: 'AVAILABLE',
    permission: 'GRANTED',
    requestPermission: jest.fn(),
    isListening: true,
  }),
}));

describe('DashboardScreen offline Room DB rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTodayActivity.setState({
      date: '',
      steps: 0,
      distanceM: 0,
      calories: 0,
      activeMinutes: 0,
      isLoading: false,
      error: null,
    });
    useSyncStatus.setState({
      pending: 2,
      syncing: false,
      lastSyncAtMs: null,
      lastError: null,
    });
    (NetInfo.useNetInfo as jest.Mock).mockReturnValue({
      type: 'none',
      isConnected: false,
      isInternetReachable: false,
    });
    jest.spyOn(LocalDb, 'getTodayActivity').mockResolvedValue({
      date: '2026-11-27',
      timezoneId: 'Asia/Ho_Chi_Minh',
      steps: 4321,
      distanceM: 3100,
      calories: 185,
      activeMinutes: 42,
      updatedAtMs: 1700000000000,
      syncState: 'PENDING',
    });
  });

  it('renders Room DB steps immediately and shows Offline • 2 chờ in SyncStatusPill', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 375, height: 812 },
            insets: { top: 44, left: 0, right: 0, bottom: 34 },
          }}>
          <ThemeProvider>
            <DashboardScreen />
          </ThemeProvider>
        </SafeAreaProvider>,
      );
    });

    const textContent = renderer.root
      .findAllByType(require('react-native').Text)
      .map(node => node.props.children)
      .flat()
      .join(' ');

    expect(LocalDb.getTodayActivity).toHaveBeenCalled();
    expect(textContent).toContain('4,321');
    expect(textContent).toContain('Offline • 2 chờ');
  });
});
