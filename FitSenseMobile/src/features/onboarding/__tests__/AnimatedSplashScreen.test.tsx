import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AnimatedSplashScreen } from '../screens/AnimatedSplashScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('AnimatedSplashScreen', () => {
  it('renders FitSense branding, tagline, status message, and RunnerAnimation', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <AnimatedSplashScreen message="Đang kiểm tra đăng nhập..." />,
      );
    });

    const treeJson = JSON.stringify(renderer!.toJSON());
    expect(treeJson).toContain('FitSense');
    expect(treeJson).toContain('Move Better. Live Healthier.');
    expect(treeJson).toContain('Đang kiểm tra đăng nhập...');
    expect(treeJson).toContain(
      'FitSense animated runner sprinting on a fitness track',
    );

    await act(async () => {
      renderer!.unmount();
    });
  });
});
