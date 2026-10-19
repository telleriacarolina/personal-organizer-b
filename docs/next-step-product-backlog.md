# Personal Organizer: Recommended Next-Step Product Backlog

## Goal

The app already has a strong foundation: a dashboard shell, widget system, persistence layer, AI review flow shell, and several feature widgets. The next milestone should focus on making the product dependable, usable, and trustworthy before adding more breadth.

This backlog prioritizes the work that most directly reduces risk, improves the core user experience, and creates confidence in the app as a daily-use personal organizer.

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
- Legacy data can be migrated to the current schema without data loss.
- A recovery path is clearly documented and test-covered for at least the common upgrade scenarios.

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
- Reloading the app preserves task completion and widget references correctly.
- Empty states, editing, deletion, and completion states are clear and consistent.
- Duplicate or stale references degrade gracefully rather than breaking the widget.

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

---

### Issue 4: Enforce review-before-write AI safety for organizer actions

- Title: Enforce explicit user review before AI writes and unsafe organizer actions
- Priority: P1
- Impact: High
- Effort: Medium
- Labels: `priority: p1`, `area: ai`, `safety`, `trust`

Description:

The organizer agent is a differentiator, but trust depends on strict write controls. AI suggestions should remain explicit, reviewable, and scoped to safe actions. The app should never mutate user data without a clear user confirmation step.

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

---

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

## Recommended 2-week sprint plan

### Sprint goal

Ship the app’s reliability and trust foundation in a way that reduces risk for all future feature work. The team should finish the product-critical workflows and establish a defensible release gate before broader polish or expansion.

### Week 1: Reliability and workflow stabilization

#### Focus areas

1. Storage and recovery hardening
   - Implement graceful handling for corrupt or legacy local data.
   - Add migration and validation tests for widget payloads.
   - Define a canonical dashboard snapshot and normalization strategy.

2. Core workflow QA
   - Validate task creation, completion, deletion, and reload behavior.
   - Improve Daily Focus integration and empty states.
   - Confirm notes, habits, and goals remain stable after reload.

3. Cross-widget reference cleanup
   - Fix stale source references.
   - Ensure imported Work → Calendar data deduplicates correctly.
   - Confirm widget removal does not leave broken references behind.

#### Deliverables by end of Week 1

- Data migration and recovery tests passed
- Core task + focus workflow validated
- Cross-widget state remains sane after reload and deletion
- Known edge cases documented in the team backlog

### Week 2: AI trust, UX quality, and release readiness

#### Focus areas

1. AI safety enforcement
   - Finalize review-before-write controls.
   - Add explicit permission and preview flows for write actions.
   - Ensure suggestion history remains auditable and separate from source data.

2. Accessibility and keyboard pass
   - Check key dialog, button, and widget actions for keyboard support.
   - Confirm focus states and labels are present in main flows.
   - Review color contrast and reduced-motion policies.

3. Release gate and regression checklist
   - Define a smoke checklist for daily organizer flows.
   - Validate the build/test/lint process for the release branch.
   - Confirm the app is stable enough for a small release candidate.

#### Deliverables by end of Week 2

- AI writes are reviewable and safe by default
- Core accessibility issues are addressed in the main app shell
- A release checklist is in place and used by the team
- The app is ready for a minimal but trustworthy release candidate

---

## Best immediate execution order

1. Harden local persistence and recovery
2. Stabilize task-to-focus and cross-widget flows
3. Enforce AI review-before-write protections
4. Finish a small accessibility pass
5. Establish the release smoke checklist

This order creates the safest path to product confidence: first prevent data loss, then protect the main user journey, then defend trust-critical features, and finally polish the experience without risking the core foundation.

---

## Recommendation

Do not broaden scope with new widgets during this next milestone. The app already contains a broad feature set. The most valuable next move is to make the current experience dependable, trustworthy, and easy to use in real life.

The best immediate outcome is a product that feels stable enough for daily use: it saves correctly, handles data recovery gracefully, preserves core flows, respects AI safety, and ships with explicit release quality checks.
