# TODOs - Trucapp

## P2: HistoryScreen decomposition
**What:** Break HistoryScreen.tsx (2,109 lines) into sub-components: MatchList, SeriesView, ClassicsTab, FilterBar.
**Why:** Largest file in the codebase, handles too many responsibilities. Will get harder to maintain as rivalry features add more stats views.
**Context:** rivalryService extraction already reduced some responsibility. The file still owns filters, stats, match editing, series management, and classics bucketing. Start by extracting the tab content into separate components, then the filter bar, then the series detail view.
**Effort:** M (human) → S (CC)
**Priority:** P2
**Depends on:** Rivalry Dashboard implementation (reduces scope of what stays in HistoryScreen)

## P3: UI component tests (React Testing Library)
**What:** Add RTL tests for RivalryCard, PostMatchRivalryCard (in WinnerCelebration), and La Mesa banner.
**Why:** These are screenshot-worthy user-facing features. Service tests cover logic, but component tests verify rendering with edge case data (zero matches, long names, first meeting empty states).
**Context:** Vitest is set up. Need to add @testing-library/react and jsdom. Test files go in __tests__/ directories next to components.
**Effort:** S (human) → S (CC)
**Priority:** P3
**Depends on:** Rivalry Dashboard UI implementation + Vitest setup
