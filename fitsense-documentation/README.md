# FitSense Documentation

This folder splits the original FitSense Day 1 and feature-based work plan into smaller documents.

## Reading order

1. `01_PROJECT_OVERVIEW_AND_OWNERSHIP.md` — project approach, feature ownership, and end-to-end workflow.
2. `02_DAY1_SHARED_FOUNDATION.md` — shared infrastructure and the Day 1 walking skeleton.
3. `03_SHARED_CONTRACTS_AND_HOTSPOTS.md` — API, native, database contracts, ownership boundaries, and conflict prevention.
4. `04_OFFLINE_SYNC_DESIGN.md` — SyncHandler architecture and synchronization responsibilities.
5. `05_IMPLEMENTATION_ROADMAP.md` — the complete day-by-day implementation schedule.
6. `features/F1_AUTH_PROFILE.md` through `features/F9_LOCAL_NOTIFICATIONS_POWER.md` — individual feature work packages.
7. `06_DEMO_ACCEPTANCE_AND_RELEASE.md` — demo responsibilities, acceptance criteria, scope cuts, and release preparation.
8. `07_AI_DEVELOPMENT_WORKFLOW.md` — how to use AI safely and consistently.

## Team ownership

- **Member A:** F1 Auth + Profile, F2 GPS Exercise, F3 Analytics, F4 FCM server notifications.
- **Member B:** F5 Steps + Dashboard, F6 Sensor Monitor, F7 Goals, F8 Offline Sync, F9 Local Notifications + power optimization.

## Source fidelity

These documents reorganize the supplied project plan. They preserve its decisions and terminology; they do not introduce a new technical design. Where the source does not specify an implementation detail, confirm it with both members before coding.
