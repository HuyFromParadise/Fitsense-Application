# Feature Implementation: FitSense Animated Splash Screen + Turtle Onboarding

## 1. Project Context

You are working on the existing **FitSense Mobile** project.

Technology stack:
- React Native CLI (NOT Expo).
- TypeScript.
- Android as the primary development platform.
- React Native Reanimated.
- React Navigation.
- Existing feature-based architecture.

The project already contains:
- Centralized theme configuration.
- Shared UI components.
- Navigation architecture.
- Authentication providers.
- Existing application state management.
- Native Android modules.

**IMPORTANT: Inspect the existing codebase before making changes. Reuse existing architecture, dependencies, theme tokens, and conventions.**

Do not create a new project or redesign the existing architecture.

## 2. Main Objective

Implement two separate experiences:

1. Animated Splash Screen.
2. Onboarding Screens.

Both experiences must use the same cute turtle mascot as the visual identity of FitSense.

The turtle must follow the attached reference image.

### Mascot Design

Use the uploaded turtle image as the visual reference.

Preserve these characteristics:

- Cute green turtle.
- Large rounded head.
- Small, expressive eyes.
- Friendly smiling face.
- Light green skin.
- Brown shell with geometric segmented patterns.
- Four short legs.
- Small tail.
- Cute 2D cartoon/vector illustration style.

Do NOT create:
- Muscular turtles.
- Realistic reptiles.
- Aggressive characters.
- Completely different 3D character designs.

Recreate the character as an original FitSense mascot suitable for production use.

---

# PART A: ANIMATED SPLASH SCREEN

## 3. Splash Screen Purpose

The Splash Screen appears whenever the application launches.

Its purpose is to:
- Introduce FitSense branding.
- Display the animated turtle mascot.
- Provide a smooth transition while the application initializes.

It is NOT an onboarding page.

It should not require user interaction.

## 4. Splash Screen Design

Visual concept:

- Full-screen background using the existing FitSense theme.
- FitSense logo centered near the top or middle.
- Cute green turtle running on a road.
- Animated smoke/dust behind the turtle.
- Road markings moving continuously.
- Optional subtle background scenery.

Text:

**FitSense**

Tagline:

"Move Better. Live Healthier."

Use the existing typography and color tokens.

## 5. Splash Screen Animations

### 5.1 Turtle Running

The turtle should:
- Move its four legs alternately.
- Move its head slightly.
- Bounce its body gently.
- Animate its tail.
- Maintain consistent proportions.

The running animation should loop continuously.

### 5.2 Smoke Animation

- Smoke particles spawn behind the turtle.
- Particles move backward.
- Particles increase in size.
- Particles gradually fade out.
- Smoke should resemble soft dust clouds.

### 5.3 Road Animation

- Road markings move from right to left.
- Animation loops seamlessly.
- Movement speed matches the turtle running cycle.

### 5.4 Loading Transition

- Display a subtle loading indicator if needed.
- Do not introduce an unnecessarily long artificial loading delay.
- Wait for required application initialization.
- Transition smoothly to the next appropriate screen.

The Splash Screen must not block the application indefinitely.

---

# PART B: ONBOARDING SCREENS

## 6. Onboarding Purpose

Onboarding introduces FitSense features to new users.

It should appear only when the user has not completed onboarding.

Returning users should not need to view onboarding again.

## 7. Onboarding Design

Create three onboarding pages.

### Page 1: Track Your Fitness Journey

Title:
"Track Your Fitness Journey"

Description:
"Monitor your daily activity and discover your fitness progress."

Visual:
- Turtle running on a road.
- Smoke animation behind the turtle.
- Subtle road movement.

### Page 2: Understand Your Activity

Title:
"Understand Your Activity"

Description:
"Track your steps, distance, calories, and daily movement."

Visual:
- Turtle mascot.
- Activity tracking illustration.
- Floating fitness metrics.
- Animated progress indicators.

### Page 3: Reach Your Health Goals

Title:
"Reach Your Health Goals"

Description:
"Set your goals, stay motivated, and become healthier every day."

Visual:
- Turtle celebrating an achievement.
- Animated trophy or goal illustration.
- Positive fitness atmosphere.

## 8. Onboarding Navigation

Implement:
- Next button.
- Skip button.
- Get Started button on the last page.
- Page indicators.
- Smooth horizontal page transitions.

Expected behavior:

Page 1 -> Page 2 -> Page 3 -> Authentication

Skip -> Authentication

Get Started -> Authentication

Persist onboarding completion using the existing storage solution if available.

---

# PART C: APPLICATION FLOW

## 9. Expected Application Flow

The complete flow must be:

Application Launch
        |
        v
Native Splash Screen
        |
        v
Animated FitSense Splash Screen
        |
        v
Check Application Initialization
        |
        v
Check Onboarding Completion
        |
        +---------------------------+
        |                           |
        v                           v
 First-time User              Returning User
        |                           |
        v                           |
 Onboarding Screens                 |
        |                           |
        v                           |
 Authentication <------------------+
        |
        v
 Main Application

Important:

- Native Splash Screen and Animated Splash Screen are different.
- Native Splash Screen handles the initial native launch.
- Animated Splash Screen runs after the React Native application is mounted.
- Do not implement an infinite loading screen.
- Do not show onboarding to returning users who have completed it.
- Preserve the existing authentication flow.

## 10. Navigation Integration

Inspect these existing files:

- src/app/navigation/RootNavigator.tsx
- src/app/navigation/AuthStack.tsx
- src/app/navigation/MainTabs.tsx
- src/app/navigation/types.ts
- src/app/providers/

Determine the correct integration point.

Do not create a separate navigation container.

Follow the existing navigation architecture.

---

# PART D: TECHNICAL IMPLEMENTATION

## 11. Animation Technology

Inspect installed packages before adding dependencies.

Preferred technologies:

**Rive**
- Main turtle character animation.
- Independent body-part animation.
- Running, idle, and celebration states.
- State Machine for controlling character states.

**React Native Reanimated**
- Screen transitions.
- Supplementary movement.
- Road animation.
- UI animations.

**Lottie**
- Optional smoke and supplementary effects if suitable assets are available.

**SVG**
- Lightweight vector illustrations if appropriate.

Choose the simplest maintainable solution that produces high-quality animation.

Do not install incompatible packages.

Do not use Expo-specific APIs.

## 12. Character Animation States

The turtle mascot should support:

### Idle
- Standing naturally.
- Occasional blinking.
- Gentle breathing or body movement.

### Running
- Alternating leg movement.
- Arm movement.
- Body bouncing.
- Head movement.
- Tail movement.
- Dust particles.

### Celebration
- Happy expression.
- Small jump.
- Excited movement.

Make the mascot reusable throughout FitSense.

## 13. Existing Project Architecture

The project already follows a feature-based structure.

Use the existing architecture.

Suggested structure:

src/
  features/
    onboarding/
      components/
        RunningTurtle/
        TurtleSmoke.tsx
        AnimatedRoad.tsx
        OnboardingPagination.tsx
      screens/
        AnimatedSplashScreen.tsx
        OnboardingScreen.tsx
      animations/
      assets/
      index.ts

Adapt this structure if existing project conventions require it.

Do not create duplicate shared components.

## 14. Theme Integration

The project already has centralized theme files under:

src/theme/

The uploaded project structure shows:

- colors.ts
- spacing.ts
- typography.ts
- index.ts

IMPORTANT:

Inspect the actual files and exports before implementation.

Requirements:
- Reuse existing color tokens.
- Reuse typography tokens.
- Reuse spacing tokens.
- Follow existing theme consumption patterns.
- Do not hardcode colors inside individual components.
- Do not create another color configuration.

If a new color is genuinely required, add it to the existing theme system.

## 15. Performance Requirements

- Use native/UI-thread-driven animations where supported.
- Avoid unnecessary React re-renders.
- Clean up animations when screens unmount.
- Pause unnecessary animations when screens lose focus.
- Avoid excessive smoke particle generation.
- Avoid memory leaks.
- Ensure smooth performance on Android physical devices.
- Handle different screen sizes.
- Respect safe areas and system navigation bars.

---

# PART E: IMPLEMENTATION WORKFLOW

## 16. Stage 1: Inspect Existing Project

Before coding:

1. Inspect package.json.
2. Identify React Native version.
3. Inspect installed animation libraries.
4. Inspect Babel configuration.
5. Inspect theme files.
6. Inspect RootNavigator and AuthStack.
7. Inspect existing authentication initialization.
8. Identify the existing persistence solution.
9. Inspect current Splash Screen implementation, if any.

Do not modify files until the implementation approach is clear.

## 17. Stage 2: Implement Mascot

- Create or integrate the cute turtle character.
- Implement running animation.
- Implement idle animation.
- Implement celebration animation.
- Implement smoke particles.
- Implement road movement.

Use the supplied reference image to guide the mascot design.

If an external Rive/Lottie asset is required but unavailable, document the exact asset requirements. Do not pretend that a static placeholder is a completed character animation.

## 18. Stage 3: Implement Animated Splash Screen

- Create AnimatedSplashScreen.
- Integrate FitSense branding.
- Integrate running turtle animation.
- Integrate road and smoke animations.
- Handle application initialization.
- Implement smooth screen transition.

## 19. Stage 4: Implement Onboarding

- Create three onboarding pages.
- Reuse the turtle mascot.
- Implement page transitions.
- Implement Next, Skip, and Get Started.
- Persist onboarding completion.

## 20. Stage 5: Navigation Integration

- Integrate the Splash Screen into the existing application flow.
- Determine whether the user is new or returning.
- Route users correctly.
- Preserve existing authentication functionality.

## 21. Stage 6: Testing

Verify:

1. Application launches successfully.
2. Native Splash Screen displays correctly.
3. Animated Splash Screen starts correctly.
4. Turtle running animation works.
5. Smoke particles work.
6. Road animation loops correctly.
7. Splash transition works.
8. First-time users see onboarding.
9. Returning users skip onboarding.
10. Skip and Get Started navigate correctly.
11. Existing authentication remains functional.
12. No crashes occur during navigation.
13. No memory leaks or unnecessary animation loops.
14. Android physical-device performance is acceptable.

Run TypeScript checks, linting, relevant tests, and Android build commands available in the project.

---

# PART F: FINAL DELIVERABLES

## 22. Expected Deliverables

After implementation, provide:

1. Summary of the Splash Screen.
2. Summary of the Onboarding Screens.
3. Description of the turtle mascot and animation states.
4. Files created.
5. Existing files modified.
6. Dependencies added or reused.
7. Navigation flow explanation.
8. Persistence implementation.
9. Build and test results.
10. Remaining limitations or external assets required.

## 23. Critical Instructions

- This is an existing-project implementation task.
- Do not create a standalone demo.
- Do not replace existing architecture.
- Do not duplicate theme configuration.
- Do not break authentication.
- Do not confuse Splash Screen with Onboarding Screen.
- Do not implement only static UI.
- Do not claim animation is complete if the character is only a static image moving up and down.

**The final result must contain both a functional Animated Splash Screen and functional Onboarding Screens, using one consistent cute turtle mascot as the visual identity of FitSense.**

Inspect first, plan the implementation, implement the feature, and verify it in the existing React Native application.