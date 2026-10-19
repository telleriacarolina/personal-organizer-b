# Personal Organizer: Recommended Next-Step Product Backlog

## Goal

The app already has a strong foundation: a dashboard shell, widget system, persistence layer, AI review flow shell, and several feature widgets. The next milestone should focus on making the product dependable, usable, and trustworthy before adding more breadth.

This backlog prioritizes the work that most directly reduces risk, improves the core user experience, and creates confidence in the app as a daily-use personal organizer.

This is a planning document for the next milestone, not the source of truth for tracked GitHub issues. The team should create actual issue tickets and link them here once work begins; until then, this document defines the recommended execution order and acceptance bar.

Recommended tracking states for linked implementation issues: `Ready`, `In progress`, `Blocked`, `Verified`, and `Deferred`.

## Recommended backlog issues

### Issue 1: Harden local persistence and dashboard recovery

- Title: Harden localStorage and IndexedDB recovery for corrupted or legacy organizer data
- Priority: P0
- Impact: High
- Effort: Medium
- Labels: `priority: p0`, `area: data`, `risk: reliability`, `backend`, `storage`

Description:

The organizer stores user data in local browser storage and IndexedDB, and several widgets rely on schema validation and migrations. This is the highest-risk area because a bad save, partial import, or legacy payload can break the entire dashboard. The product should recover gracefully when storage is empty, stale, malformed, or partially written.

Scope:
- `src/lib/persistence.ts`
- `src/lib/widgets/widget-registry.ts`
- `src/hooks/useLocalStorageState.ts`
- `src/App.tsx`

Acceptance criteria:
- App opens successfully when local data is empty, partial, stale, or structurally invalid.
- Malformed widget payloads are normalized or discarded without crashing the dashboard.
- Legacy data can be migrated to the current schema without data loss, with an explicit fallback path for irrecoverable entries.
- Recovery behavior is covered by automated tests for the common upgrade scenarios: empty state, stale schema, malformed payload, and partial write.
- The recovery strategy is documented in the repo, including which malformed records are preserved, discarded, or migrated.

---

### Issue 2: Validate and harden the core task-to-focus workflow

- Title: Validate the task, daily focus, and completion flow across the organizer dashboard
- Priority: P0
- Impact: High
- Effort: Medium
- Labels: `priority: p0`, `area: core-flow`, `user-journey`, `qa`

Description:

The app is most valuable when users can create a task, surface it in their daily focus, and complete it without losing context or data. This workflow is central to the app’s value proposition and should be treated as the product’s primary trust path.

Scope:
- `src/components/widgets/TasksWidget.tsx`
- `src/components/widgets/DailyFocusWidget.tsx`
- `src/App.tsx`
- `src/lib/widgets/widget-registry.ts`

Acceptance criteria:
- A user can create a task, view it in Daily Focus, and complete it without broken state.
- Reloading the app preserves task completion, widget references, and order correctly.
- Empty states, editing, deletion, and completion states are clear and consistent.
- Duplicate or stale references degrade gracefully instead of breaking the widget.
- A regression test or smoke path confirms task creation, focus visibility, and completion on reload.

---

### Issue 3: Fix invalid reference handling between widgets and imported calendar data

- Title: Make cross-widget references resilient when widgets are deleted, reordered, or imported
- Priority: P0
- Impact: High
- Effort: Medium
- Labels: `priority: p0`, `area: integrations`, `bug`, `reliability`

Description:

The app supports rich widget relationships, especially between Work, Calendar, and imported schedule items. When source widgets are removed or data is stale, references can become invalid. The product should degrade gracefully instead of producing broken records or duplicate state.

Scope:
- `src/App.tsx`
- `src/lib/calendar-imports.ts`
- `src/components/widgets/WorkWidget.tsx`
- `src/components/widgets/CalendarWidget.tsx`

Acceptance criteria:
- Imported events retain source metadata and remain deduplicated correctly.
- Removing a source widget does not leave the app in a broken state.
- Invalid or missing references render a safe fallback instead of a crash or blank state.
- Cross-widget updates remain consistent across reloads.
- A test covers stale or deleted source references and verifies the system falls back to a safe, non-breaking state.

---

### Issue 4: Enforce review-before-write AI safety for organizer actions

- Title: Enforce explicit user review before AI writes and unsafe organizer actions
- Priority: P1
- Impact: High
- Effort: Medium
- Labels: `priority: p1`, `area: ai`, `safety`, `trust`

Description:

The organizer agent is a differentiator, but trust depends on strict write controls. AI suggestions should remain explicit, reviewable, and scoped to safe actions. The app should never mutate user data without a clear user confirmation step.

Why this remains P1 in implementation order:

- The workflow is trust-critical and should be protected before broader automation is expanded.
- The product requirement is clear: the user must approve any write-like action before it persists.
- However, this work often depends on broader agent UX and safety design decisions, so it is intentionally scheduled after the core data and workflow reliability fixes are complete.
- This item is sequenced after core data/workflow stabilization, while still preserving a hard release gate: if any AI action can modify or delete user data, unapproved writes must be blocked before release.

Scope:
- `src/lib/organizer-agent-service.ts`
- `src/lib/organizer-agent-broker.ts`
- `src/lib/ai-storage.ts`
- `src/App.tsx`
- `README.md`

Acceptance criteria:
- AI write actions are blocked or require explicit review before persisting.
- The review step clearly states what will change before it is applied.
- Destructive or ambiguous operations require additional confirmation.
- AI-generated suggestions are kept separate from source widget data and remain auditable.
- A release gate requires a manual smoke check confirming that no AI action mutates stored organizer data without explicit user approval.

---

### Issue 5: Finish the product-critical QA pass for daily planner workflows

- Title: QA the most important organizer workflows and fix usability issues in the main widgets
- Priority: P0
- Impact: High
- Effort: Low to Medium
- Labels: `priority: p0`, `area: ux`, `qa`, `workflow`

Description:

The product’s value depends not on raw feature count, but on the quality of the common daily workflows. These include creating tasks, editing notes, maintaining habits, managing goals, and confirming completion states across a realistic use session.

Scope:
- `src/components/widgets/NotesWidget.tsx`
- `src/components/widgets/HabitsWidget.tsx`
- `src/components/widgets/GoalsWidget.tsx`
- `src/components/widgets/TasksWidget.tsx`
- `src/components/widgets/ShoppingWidget.tsx`

Acceptance criteria:
- Add/edit/delete flows are clear and consistent across core widgets.
- Empty states and validation feedback are understandable without guidance.
- User actions that change data save reliably and remain visible after reload.
- Completion and priority states are visually and semantically consistent.
- A QA checklist confirms the top five daily planner flows pass after a reload and after a representative edit session.

---

### Issue 6: Improve accessibility, keyboard controls, and theme readability

- Title: Improve keyboard accessibility and contrast safety across the organizer dashboard
- Priority: P1
- Impact: Medium
- Effort: Medium
- Labels: `priority: p1`, `area: accessibility`, `ux`, `theme`

Description:

The app is a dashboard with many interactive controls, custom widgets, and theme options. A strong accessibility pass is necessary to make the product dependable and inclusive, particularly for keyboard-driven and screen-reader-friendly workflows.

Scope:
- `src/App.tsx`
- UI widgets in `src/components/**`
- Theme and layout controls related to custom styling

Acceptance criteria:
- Keyboard-only users can add, edit, remove, and configure the core widgets.
- Controls have clear focus states and semantic labels.
- Theme and contrast remain readable across customizations and reduced-motion settings.
- No major focus trap or unlabeled action problems remain in the core dashboard flows.

---

### Issue 7: Add a release-quality smoke suite and manual regression checklist

- Title: Establish a release gate for organizer reliability and product-critical flows
- Priority: P1
- Impact: Medium
- Effort: Low
- Labels: `priority: p1`, `area: release`, `qa`, `process`

Description:

This app has enough stateful behavior and widget interdependence that release confidence should be intentional. A lightweight smoke suite and manual regression checklist will help the team catch regressions before they reach real users.

Scope:
- Repository automation and release docs
- Regression checklist for dashboard flows
- CI validation around lint, tests, and build

Acceptance criteria:
- Every release has a short smoke checklist covering storage, dashboard render, task flow, and AI review safety.
- The team can tell if a change is ready to ship based on a repeatable validation flow.
- Core user journeys are tested or manually checked before release.
- Release readiness requires successful lint, test, and build checks plus a smoke check for persistence and task flow.

---

## Ordered milestone delivery plan (dependency-driven)

Implementation order should follow dependency and risk, not calendar duration. If dependencies change during implementation, reorder milestones explicitly in this document and in linked issues with a short rationale.

### Milestone 1 — Data integrity and recovery

Focus:
- Issue 1: Persistence recovery hardening

Exit criteria:
- Automated regression tests pass for empty, partial, stale-schema, malformed, and legacy snapshots.
- Tests prove valid sibling records are preserved when unrelated records are malformed or unrecoverable.
- Normalization/migration behavior is documented with explicit fallback behavior.

Evidence to record:
- Test file references and CI run links for recovery/migration coverage.
- Notes identifying preserved, migrated, and discarded record classes.

### Milestone 2 — Core workflow reliability

Focus:
- Issue 2: Task-to-focus workflow validation
- Issue 5: Core workflow QA pass

Exit criteria:
- Regression coverage verifies create/edit/complete/delete across core workflows.
- Reload persistence is verified for task completion, focus visibility, notes, habits, and goals.
- Stale references in the main workflow render safe fallbacks instead of broken state.

Evidence to record:
- Regression test paths and CI run links.
- Manual smoke checklist results for the main planner journey before/after reload.

### Milestone 3 — Cross-widget consistency

Focus:
- Issue 3: Cross-widget reference handling

Exit criteria:
- Stale/deleted source references resolve safely without crashes or blank states.
- Imported Work → Calendar events remain deduplicated and consistent across reloads.
- Regression coverage includes stale-source and deleted-widget scenarios.

Evidence to record:
- Test paths and CI run links for reference/dedup behavior.
- Repro notes showing fallback behavior for invalid references.

### Milestone 4 — AI trust and write safety

Focus:
- Issue 4: AI write safety enforcement

Exit criteria:
- AI proposals that are rejected, cancelled, malformed, ambiguous, or changed cannot silently persist writes.
- Any write-like action requires explicit approval with a clear preview before persistence.
- Regression and smoke checks verify no unapproved write path remains.

Evidence to record:
- Automated test references and smoke-test checklist entries for approval/denial paths.
- QA notes demonstrating stored state remains unchanged after denied/cancelled writes.

### Milestone 5 — Release readiness

Focus:
- Issue 7: Release gate and smoke validation checklist

Exit criteria:
- Required CI checks (lint, test, build) pass for release candidates.
- Required regression suites for Milestones 1–4 pass.
- Main workflow smoke tests pass and evidence is recorded.
- Release remains blocked while critical acceptance criteria are unmet.

Evidence to record:
- CI run links for required checks.
- Completed smoke checklist and regression summary attached to release notes or issue thread.

### Follow-up milestone — Accessibility and broader resilience

Focus:
- Issue 6: Accessibility and keyboard pass
- Broader resilience improvements (for example, additional shopping/media recovery hardening)

Exit criteria:
- Keyboard accessibility and contrast issues in core flows are verified against the acceptance criteria.
- Additional resilience items are sequenced by risk and dependency and carried forward with explicit status.

## Prioritization by impact and effort

### Highest-priority actions for immediate execution

| Issue | Priority | Impact | Effort | Why now |
| --- | --- | --- | --- | --- |
| Harden local persistence and dashboard recovery | P0 | High | Medium | Prevents data loss and app instability |
| Validate the task-to-focus workflow | P0 | High | Medium | Core value path for daily usage |
| Fix invalid reference handling across widgets | P0 | High | Medium | Prevents broken imported state and stale references |
| QA the main organizer workflows | P0 | High | Low-Medium | Makes the product feel reliable day to day |
| Enforce review-before-write AI safety | P1 | High | Medium | Protects trust and prevents unsafe write behavior |
| Improve accessibility and keyboard controls | P1 | Medium | Medium | Makes product usable and inclusive |
| Release smoke checklist | P1 | Medium | Low | Creates a repeatable quality gate |

### P0 vs. P1 rationale

- P0 items are the product’s reliability backbone: if they fail, the app is unreliable for day-to-day use or loses user data.
- P1 items are still important, but they may depend on broader product/UX design decisions or follow after urgent reliability stabilization.
- AI write safety is high-impact because it affects trust and user data integrity. It remains P1 for sequencing, but release-blocking safety requirements override label ordering: if AI can modify or delete user data, unapproved writes must be prevented before ship.

### Impact vs. effort summary

- High impact / low effort:
  - Release smoke checklist
  - Core workflow QA pass

- High impact / medium effort:
  - Persistence recovery hardening
  - Task-to-focus validation
  - Cross-widget reference handling
  - AI review enforcement

- Medium impact / medium effort:
  - Accessibility and keyboard pass

This means the most effective immediate work is a set of reliability and workflow improvements that close the largest product risks without broadening scope into new feature development.

---

## Milestone execution notes

- Milestones are complete only when their acceptance criteria and evidence requirements are satisfied.
- A successful build alone is not proof that data recovery, core workflow safety, or AI write safety is complete.
- Unfinished work should be carried forward with explicit status (`Blocked` or `Deferred`) rather than marked complete due to schedule pressure.
- Any milestone reorder is allowed only with a dependency-based rationale captured in linked implementation issues.

---

## Release gate definition

The product is not ready to ship until the following checks pass:

- Automated CI checks succeed for lint, test, and build.
- Persistence migration and recovery tests pass for empty, stale, and malformed saved data.
- Core task workflow smoke tests pass: create task, place it in Daily Focus, reload, and complete it without losing state.
- Cross-widget reference smoke tests pass for deleted or stale source items.
- AI review safety smoke test passes: a write-like action is blocked or requires explicit review before persisting.
- A quick manual regression checklist confirms the app renders and behaves correctly for the main planner flows.

If any of the P0 checks fail, the release should be blocked until they are resolved or consciously accepted with a documented exception.

---

## Best immediate execution order

1. Harden local persistence and recovery
2. Stabilize task-to-focus and cross-widget flows
3. Complete the core QA pass for the primary planner workflows
4. Enforce AI review-before-write protections
5. Finish a small accessibility pass
6. Establish the release smoke checklist

This order creates the safest path to product confidence: first prevent data loss, then protect the main user journey, then defend trust-critical features, and finally polish the experience without risking the core foundation.

---

## Recommendation

Do not broaden scope with new widgets during this next milestone. The app already contains a broad feature set. The most valuable next move is to make the current experience dependable, trustworthy, and easy to use in real life.

The best immediate outcome is a product that feels stable enough for daily use: it saves correctly, handles data recovery gracefully, preserves core flows, respects AI safety, and ships with explicit release quality checks.
