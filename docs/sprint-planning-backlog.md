# Personal Organizer — Backlog, Priorities, and 2-Week Sprint Plan

## Current product foundation

Personal Organizer is a local-first productivity dashboard built around configurable widgets (tasks, notes, habits, goals, work, calendar, shopping, focus, and AI chat). The app already delivers:

- A customizable dashboard shell with drag/drop and widget lifecycle controls.
- Browser-first persistence across localStorage and IndexedDB.
- A typed widget registry and schema-driven normalization/validation.
- Cross-widget workflows (including imports into calendar).
- AI-assisted workflows with explicit review patterns.

The next highest-value work is reliability and trust hardening: stabilize data behavior, validate core user flows end to end, and strengthen AI trust boundaries.

---

## Prioritized GitHub-style issue backlog (impact vs effort)

Legend:
- **Impact**: user/product value and risk reduction.
- **Effort**: estimated engineering effort for one team.
- **Priority score**: practical ordering for immediate execution.

| Priority | Issue | Impact | Effort | Why now |
|---|---|---|---|---|
| P0 | #1 Harden local data recovery and corruption handling | Very High | Medium | Prevents data loss and app startup failures across all widgets. |
| P0 | #2 Add migration test coverage for widget/dashboard state | Very High | Medium | Protects upgrades and backward compatibility for local-first users. |
| P0 | #3 Validate core task/note/habit workflows end to end | High | Medium | Ensures daily-use workflows are reliable before adding new scope. |
| P0 | #4 Stabilize cross-widget references (Tasks ↔ Focus, Work → Calendar) | High | Medium | Preserves core value prop of connected workflows. |
| P1 | #5 Enforce AI review-before-write guardrails and action previews | High | Medium | Builds trust and limits unintended mutations. |
| P1 | #6 Improve shopping/media resilience and missing-blob recovery | Medium-High | Medium | Reduces failures in a complex, stateful feature area. |
| P1 | #7 Accessibility and keyboard interaction pass on core flows | Medium-High | Medium | Improves usability and broadens adoption readiness. |
| P1 | #8 Release quality gate (lint/test/build + smoke checklist) | Medium | Low-Medium | Makes reliability repeatable for each release. |

### Issue #1 — Harden local data recovery and corruption handling
**Description**  
Implement defensive load/parse/recovery paths for malformed or partial local state (localStorage and IndexedDB-backed flows), with graceful fallback behavior and non-crashing UX.

**Acceptance criteria**
- App boots successfully when persisted dashboard data is empty, partial, or malformed.
- Corrupted widget payloads are isolated and skipped/repaired without full app failure.
- Recovery path is user-visible (non-blocking message) and does not erase valid unrelated data.
- Automated tests cover at least: malformed JSON, missing required fields, unsupported widget type.

### Issue #2 — Add migration test coverage for widget/dashboard state
**Description**  
Create migration-focused tests for historical/legacy state snapshots to verify deterministic normalization and forward compatibility.

**Acceptance criteria**
- Representative legacy snapshots are versioned in test fixtures.
- Migration output is stable and schema-valid for current widget definitions.
- Unknown/extra fields do not crash migration and are handled explicitly.
- Tests fail on migration regressions in CI.

### Issue #3 — Validate core task/note/habit workflows end to end
**Description**  
Audit and harden add/edit/complete/delete flows for core widgets and ensure persistence + reload correctness.

**Acceptance criteria**
- Tasks, notes, and habits support complete happy-path CRUD without stale UI state.
- Reload preserves recent changes with no silent data loss.
- Empty states and validation errors are clear and actionable.
- At least one automated workflow test per core widget path exists.

### Issue #4 — Stabilize cross-widget references (Tasks ↔ Focus, Work → Calendar)
**Description**  
Standardize reference ownership and failure handling when source items/widgets are edited, reordered, or deleted.

**Acceptance criteria**
- Task-to-focus and work-to-calendar links remain consistent after reload.
- Duplicate imports are deduplicated by source reference.
- Missing/deleted source references degrade gracefully (no runtime error; clear fallback state).
- Regression tests cover deletion and re-import edge cases.

### Issue #5 — Enforce AI review-before-write guardrails and action previews
**Description**  
Strengthen AI safety boundaries by requiring explicit review/approval before writes and adding concise action previews for every mutation.

**Acceptance criteria**
- No destructive or ambiguous AI mutation can execute without explicit user approval.
- Each proposed write includes scoped preview details (target widget/item, before/after intent).
- Denied proposals make no state changes.
- Tests cover allowed, blocked, and denied-action scenarios.

### Issue #6 — Improve shopping/media resilience and missing-blob recovery
**Description**  
Harden receipt/media persistence and cleanup paths to tolerate missing blobs and stale references.

**Acceptance criteria**
- Missing media blobs do not crash widget rendering.
- Deleting receipts/media removes stale references consistently.
- Migration and load flows handle old media metadata safely.
- Tests cover load-with-missing-blob and delete-cleanup cases.

### Issue #7 — Accessibility and keyboard interaction pass on core flows
**Description**  
Improve keyboard navigation, focus handling, labels, and contrast checks for core widgets and dialogs.

**Acceptance criteria**
- Keyboard-only operation supports core create/edit/delete actions.
- Dialog focus trapping and return focus behavior are reliable.
- Interactive controls have accessible labels/roles.
- Theme choices pass practical contrast checks for key text/actions.

### Issue #8 — Release quality gate (lint/test/build + smoke checklist)
**Description**  
Define a lightweight release gate with automated checks and a manual smoke test checklist for critical workflows.

**Acceptance criteria**
- Release workflow requires lint, tests, and build success.
- Smoke checklist exists for data recovery, core widget workflows, cross-widget links, and AI review flow.
- Checklist usage is documented for contributors.

---

## Recommended immediate execution order

1. **Issue #1 (Data recovery hardening)**  
2. **Issue #2 (Migration test coverage)**  
3. **Issue #4 (Cross-widget reference stability)**  
4. **Issue #3 (Core widget workflow validation)**  
5. **Issue #5 (AI review/write guardrails)**  
6. **Issue #6 (Shopping/media resilience)**  
7. **Issue #8 (Release quality gate)**  
8. **Issue #7 (Accessibility pass)**

### Why this order

- **Data integrity first** (#1, #2) because every feature depends on safe load/migrate behavior; this is highest blast-radius risk reduction.
- **Workflow consistency second** (#4, #3) to lock down the app’s daily value paths and prevent broken references across widgets.
- **AI trust boundaries next** (#5) so assistance remains safe and auditable once core state is stable.
- **Operational quality and polish last** (#6, #8, #7) to improve resilience, release confidence, and usability without destabilizing foundations.

---

## Two-week sprint plan (10 working days)

### Sprint goal
Ship a reliability-focused increment that makes the Personal Organizer safe to trust daily: robust data recovery, migration safety, validated core workflows, and hardened AI write boundaries.

### Phase 1 (Days 1–2): Alignment + test scaffolding
**Deliverables**
- Finalized scope for Issues #1, #2, #4, #3, #5.
- Baseline test fixture strategy for legacy/malformed state snapshots.
- Definition of done and risk register for data-loss scenarios.

### Phase 2 (Days 3–5): Data layer hardening
**Deliverables**
- Issue #1 implemented: corruption handling + graceful recovery paths.
- Issue #2 implemented: migration tests and snapshot fixtures in CI.
- Initial verification report for load/migrate edge cases.

### Phase 3 (Days 6–8): Core workflow and integration stabilization
**Deliverables**
- Issue #4 implemented: reference-safe behavior for Tasks ↔ Focus and Work → Calendar.
- Issue #3 implemented for highest-traffic flows in tasks/notes/habits.
- Regression tests for deletion/reload/re-import edge cases.

### Phase 4 (Days 9–10): AI trust boundaries + sprint closeout
**Deliverables**
- Issue #5 implemented: explicit review-before-write enforcement and action previews.
- Targeted QA pass across top user journeys.
- Sprint review artifact: completed vs deferred backlog and next-sprint carryover proposal.

### Planned sprint outcomes
- App startup is resilient to malformed local data.
- Migration behavior is test-backed and regression-resistant.
- Core workflows and cross-widget links are reliable after reload and edit/delete operations.
- AI-assisted mutations are explicit, reviewable, and safer by default.

---

## Suggested PR summary text for this planning artifact

"Add a sprint planning artifact for Personal Organizer that documents the current product foundation, a prioritized GitHub-style backlog (with issue descriptions and acceptance criteria), impact/effort-based sequencing, and a two-week implementation plan focused on reliability, core workflow validation, and AI trust boundaries."
