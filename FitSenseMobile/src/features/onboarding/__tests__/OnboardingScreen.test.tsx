import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { LocalDb } from '../../../services/native';
import { useOnboardingStore } from '../../../stores/useOnboardingStore';
import { AnimatedSplashScreen } from '../screens/AnimatedSplashScreen';
import { ONBOARDING_SLIDES, OnboardingScreen } from '../screens/OnboardingScreen';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('AnimatedSplashScreen, OnboardingScreen & useOnboardingStore', () => {
  beforeEach(() => {
    useOnboardingStore.setState({
      hasCompletedOnboarding: false,
      hydrated: true,
    });
  });

  it('defines the three required onboarding pages and mascot states from specification', () => {
    expect(ONBOARDING_SLIDES).toHaveLength(3);
    expect(ONBOARDING_SLIDES[0]).toMatchObject({
      title: 'Track Your Fitness Journey',
      description:
        'Monitor your daily activity and discover your fitness progress.',
      mascotState: 'running',
    });
    expect(ONBOARDING_SLIDES[1]).toMatchObject({
      title: 'Understand Your Activity',
      description:
        'Track your steps, distance, calories, and daily movement.',
      mascotState: 'idle',
    });
    expect(ONBOARDING_SLIDES[2]).toMatchObject({
      title: 'Reach Your Health Goals',
      description:
        'Set your goals, stay motivated, and become healthier every day.',
      mascotState: 'celebration',
    });
  });

  it('renders OnboardingScreen Page 1 -> Page 2 -> Page 3 and completes on Get Started', async () => {
    const spy = jest.spyOn(LocalDb, 'setOnboardingCompleted');
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(<OnboardingScreen />);
    });

    // Page 1
    let treeJson = JSON.stringify(renderer!.toJSON());
    expect(treeJson).toContain('Track Your Fitness Journey');
    expect(treeJson).toContain(
      'Monitor your daily activity and discover your fitness progress.',
    );

    const nextButton1 = renderer!.root.findByProps({ title: 'Next' });
    await act(async () => {
      nextButton1.props.onPress();
    });

    // Page 2 (Idle with floating fitness metrics)
    treeJson = JSON.stringify(renderer!.toJSON());
    expect(treeJson).toContain('Understand Your Activity');
    expect(treeJson).toContain(
      'Track your steps, distance, calories, and daily movement.',
    );
    expect(treeJson).toContain('8,420');

    const nextButton2 = renderer!.root.findByProps({ title: 'Next' });
    await act(async () => {
      nextButton2.props.onPress();
    });

    // Page 3 (Celebration with Get Started button)
    treeJson = JSON.stringify(renderer!.toJSON());
    expect(treeJson).toContain('Reach Your Health Goals');
    expect(treeJson).toContain(
      'Set your goals, stay motivated, and become healthier every day.',
    );

    const getStartedButton = renderer!.root.findByProps({
      title: 'Get Started',
    });
    await act(async () => {
      getStartedButton.props.onPress();
    });

    expect(useOnboardingStore.getState().hasCompletedOnboarding).toBe(true);
    expect(spy).toHaveBeenCalledWith(true);

    spy.mockRestore();
    await act(async () => {
      renderer!.unmount();
    });
  });

  it('completes onboarding when Skip is pressed and persists via LocalDb', async () => {
    const spy = jest.spyOn(LocalDb, 'setOnboardingCompleted');
    let completedCallbackFired = false;

    let renderer: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <OnboardingScreen
          onComplete={() => {
            completedCallbackFired = true;
          }}
        />,
      );
    });

    const skipButton = renderer!.root.findByProps({
      accessibilityLabel: 'Skip onboarding',
    });

    await act(async () => {
      skipButton.props.onPress();
    });

    expect(useOnboardingStore.getState().hasCompletedOnboarding).toBe(true);
    expect(completedCallbackFired).toBe(true);
    expect(spy).toHaveBeenCalledWith(true);

    spy.mockRestore();
    await act(async () => {
      renderer!.unmount();
    });
  });

  it('renders AnimatedSplashScreen with FitSense branding, tagline, and running turtle', async () => {
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

    await act(async () => {
      renderer!.unmount();
    });
  });
});
