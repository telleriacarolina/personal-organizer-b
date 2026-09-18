# Widget Architecture (Phase 1)

This repository now uses a common architecture for widget domain state and mutations.

## 1) WidgetDefinition contract

Location: `/home/runner/work/personal-organizer-b/personal-organizer-b/src/lib/widgets/widget-definition.ts`

Each widget type implements:

- `type`
- `schema` (runtime validation with Zod)
- `defaultState`
- `normalize`
- `validate`
- `migrate`
- `capabilities`

Registry location: `/home/runner/work/personal-organizer-b/personal-organizer-b/src/lib/widgets/widget-registry.ts`

## 2) Command ownership boundary

Location: `/home/runner/work/personal-organizer-b/personal-organizer-b/src/lib/widgets/widget-commands.ts`

All widget-level domain mutations should flow through the typed command boundary:

- `create`
- `update`
- `delete`
- `import`
- `sync`

Command execution validates and normalizes data before persistence updates.

## 3) App orchestration extraction

Location: `/home/runner/work/personal-organizer-b/personal-organizer-b/src/hooks/useWidgetDashboardState.ts`

`App.tsx` now focuses on composition/rendering while orchestration logic lives in a focused hook.

## 4) Domain reducers for complex widgets

Phase 1 introduces reducer-style domain helpers:

- Calendar: `/home/runner/work/personal-organizer-b/personal-organizer-b/src/lib/domain/calendar-domain.ts`
- Work: `/home/runner/work/personal-organizer-b/personal-organizer-b/src/lib/domain/work-domain.ts`
- Shopping: `/home/runner/work/personal-organizer-b/personal-organizer-b/src/lib/domain/shopping-domain.ts`

These reducers establish clear domain-state mutation boundaries while transient UI state remains local in each widget component.

## 5) Standardized widget container contract

All widgets now consume consistent container inputs for:

- `snapToGrid`
- `globalLock`
- widget sizing (`size`, `onSizeChange`)

This keeps lock/sizing behavior consistent while avoiding unnecessary abstraction in simple widgets.
