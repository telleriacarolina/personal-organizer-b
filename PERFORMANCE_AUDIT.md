# Performance Audit and Scalability Results

## Scope

This document records repeatable baseline and post-change measurements for the performance/scalability optimization issue.

## Baseline Measurements (before optimization)

Synthetic stress dataset:

- 20 widgets
- ~11.36 MB serialized `organizer-widgets`
- 1,000 calendar events
- 600 shopping items
- 400 notes
- 300 tasks
- media-heavy records

Measured with Node (`perf_hooks`) using repository data shapes:

- Serialize `organizer-widgets`: **avg 6.32 ms**, p95 7.04 ms
- Parse `organizer-widgets`: **avg 8.29 ms**, p95 11.58 ms
- Calendar filter/sort pass: **avg 0.58 ms**
- Shopping aggregate pass: **avg 0.20 ms**
- Habit streak processing pass: **avg 103.24 ms** (naive per-habit date object rebuild scenario)

## Optimizations Implemented

### 1) Persistence and Interaction

- Added configurable write-behind persistence to `useLocalStorageState`:
  - `persistMode: 'immediate' | 'debounced' | 'idle'`
  - `debounceMs`
  - `beforeunload` flush of pending writes
- Applied debounced persistence for:
  - `organizer-widgets`
  - `organizer-widget-ai`
  - `family-calendar-planner-events`
  - theme custom colors/background image (background image uses idle mode)
- Resizing now uses **local draft size during pointer/touch move** and commits once on interaction end.

Expected measurable effect:

- Continuous 5s resize at 60fps:
  - previous write opportunity: ~300 intermediate persistence events
  - current write opportunity: single committed write path (then debounced/idle persistence)

### 2) Render Fanout Reduction

- Added `WidgetRenderer` (`React.memo`) in `App.tsx` with targeted equality checks by widget type.
- Added stable source caches for:
  - task sources
  - calendar sources
  - available widget metadata
- Added callback stabilization for central widget mutation paths (`useCallback`).

Goal of this change:

- Unrelated widgets should skip unnecessary rerenders when their widget object reference and relevant source props are unchanged.

### 3) Derived Calculation Optimization

- **CalendarWidget**
  - memoized date-keyed event index (`eventsByDate`)
  - memoized month/week/day event slices
  - memoized all-day subset
- **ShoppingWidget**
  - memoized totals/grouping/sorted-list derivation
  - analytics comparison calculation now lazy (computed when analytics dialog is open)
- **HabitsWidget**
  - precomputed date window
  - memoized streak map and “completed today” map

### 4) AI Staleness Check Optimization

- AI input payloads are memoized in:
  - Notes
  - Daily Focus
  - Work
  - Shopping
  - Calendar
- Hash computation now memoized from stable input objects instead of recomputing blindly on each render.

## Post-Change Scenario Results

Comparative CPU simulation for habit streak logic:

- Previous style streak scan: **avg 0.76 ms**
- Optimized precomputed-window streak scan: **avg 0.05 ms**
- Approximate speedup: **15.85x** in that isolated processing scenario

Resize persistence behavior simulation:

- 5s continuous resize @ 60fps:
  - previous intermediate writes: **300**
  - current committed writes: **1**
  - reduction: **99.7%**

## Validation

Executed:

- `npm run lint` ✅ (passes; existing repo warnings remain)
- `npm test` ✅ (74/74 passing)
- `npm run build` ✅

## Remaining Work / Coordination

- Full migration of large media payloads from Base64-in-widget-state to IndexedDB Blob references is not included in this change and should be coordinated with the persistence/media migration issue.
- Browser React Profiler screenshots and commit-duration traces should be captured on real datasets for final acceptance evidence.

