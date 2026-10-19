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
- **Priority**: risk ranking for the product, not a promise that all P1 work happens before all P0 work.

### Scope discipline for the next two-week sprint

This document is a planning artifact and should be treated as a delivery proposal, not evidence that every backlog item is already implemented. The committed, must-ship scope for the next sprint is intentionally narrower than the full backlog:

- Must-ship for this sprint: **#1, #2, #4, #3, #5**
- Planned follow-up/deferred: **#6, #7**
- Release gate required in sprint: **#8**, but as a lightweight execution gate rather than a broad operational hardening effort

This keeps the sprint realistic while still preserving the product’s reliability and trust goals. Priority and implementation order are intentionally distinct: a P1 item may be deferred during the sprint if it would increase execution risk or distract from core data safety and workflow reliability.

| Priority | Issue | Impact | Effort | Why now |
|---|---|---|---|---|
| P0 | #1 Harden local data recovery and corruption handling | Very High | Medium | Prevents data loss and app startup failures across all widgets. |
| P0 | #2 Add migration test coverage for widget/dashboard state | Very High | Medium | Protects upgrades and backward compatibility for local-first users. |
| P0 | #3 Validate core task/note/habit workflows end to end | High | Medium | Ensures daily-use workflows are reliable before adding new scope. |
| P0 | #4 Stabilize cross-widget references (Tasks ↔ Focus, Work → Calendar) | High | Medium | Preserves core value prop of connected workflows. |
| P1 | #5 Enforce AI review-before-write guardrails and action previews | High | Medium | Builds trust and limits unintended mutations. |
| P1 | #6 Improve shopping/media resilience and missing-blob recovery | Medium-High | Medium | Reduces failures in complex stateful flows; scheduled after core reliability work. |
| P1 | #7 Accessibility and keyboard interaction pass on core flows | Medium-High | Medium | Important for usability, but not the highest-risk blocker for this sprint. |
| P1 | #8 Release quality gate (lint/test/build + smoke checklist) | Medium | Low-Medium | Provides a repeatable release gate and evidence trail for the sprint. |

### Issue #1 — Harden local data recovery and corruption handling
**Description**  
Implement defensive load/parse/recovery paths for malformed or partial local state (localStorage and IndexedDB-backed flows), with graceful fallback behavior and non-crashing UX.

**Acceptance criteria**
- App boots successfully when persisted dashboard data is empty, partial, or malformed.
- Corrupted widget payloads are isolated and skipped or repaired without triggering full app failure.
- Valid sibling data is preserved; recovery does not silently drop recoverable user records.
- The recovery path is user-visible (non-blocking message) and surfaces a path for manual recovery when automatic repair is impossible.
- Automated tests cover malformed JSON, missing required fields, unsupported widget types, partial nested payloads, and malformed records that coexist with valid sibling data.
- Legacy or partial snapshots are normalized without losing intact data.

### Issue #2 — Add migration test coverage for widget/dashboard state
**Description**  
Create migration-focused tests for historical/legacy state snapshots to verify deterministic normalization and forward compatibility.

**Acceptance criteria**
- Representative legacy snapshots are versioned in test fixtures, including partial and malformed historical state.
- Migration output is stable, schema-valid, and preserves valid data when optional fields are missing.
- Unknown or extra fields do not crash migration and are handled explicitly.
- Legacy records that were previously saved with nested structure differences are normalized deterministically.
- Tests fail on migration regressions in CI and cover the “valid data preserved + invalid branch recovered” scenario.

### Issue #3 — Validate core task/note/habit workflows end to end
**Description**  
Audit and harden add/edit/complete/delete flows for core widgets and ensure persistence + reload correctness.

**Acceptance criteria**
- Tasks, notes, and habits support complete happy-path CRUD without stale UI state.
- Reload preserves recent changes with no silent data loss.
- Empty states and validation errors are clear and actionable.
- At least one automated workflow test per core widget path exists.
- Regression tests cover reload after edit, delete of referenced items, and rehydration after restart.

### Issue #4 — Stabilize cross-widget references (Tasks ↔ Focus, Work → Calendar)
**Description**  
Standardize reference ownership and failure handling when source items/widgets are edited, reordered, or deleted.

**Acceptance criteria**
- Task-to-focus and work-to-calendar links remain consistent after reload.
- Duplicate imports are deduplicated by source reference.
- Missing or deleted source references degrade gracefully with no runtime errors and clear fallback state.
- Regression tests cover deletion, stale references, re-import, and duplicate detection edge cases.

### Issue #5 — Enforce AI review-before-write guardrails and action previews
**Description**  
Strengthen AI safety boundaries by requiring explicit review/approval before writes and adding concise action previews for every mutation.

**Acceptance criteria**
- No destructive, ambiguous, or malformed AI proposal can mutate persisted state without explicit user approval.
- Each proposed write includes a scoped preview that identifies the target widget/item and the before/after intent of the action.
- Denied, cancelled, malformed, or ambiguous proposals make no persisted changes.
- Approval applies only to the reviewed proposal; subsequent edits require re-approval.
- Tests cover allowed, blocked, denied, cancelled, malformed, and ambiguous action scenarios.

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
- Checklist usage is documented for contributors and results are recorded in a PR or issue for each release.
- A release is blocked when any required smoke check fails or cannot be demonstrated.

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

- **Data integrity first** (#1, #2) because every feature depends on safe load/migrate behavior; this is the highest blast-radius risk reduction.
- **Workflow consistency second** (#4, #3) to lock down the app’s daily value paths and prevent broken references across widgets.
- **AI trust boundaries next** (#5) so assistance remains safe and auditable once core state is stable.
- **Operational quality and polish last** (#6, #8, #7) to improve resilience, release confidence, and usability without destabilizing foundations.

This ordering reflects the sprint plan and the risk model, but the backlog still keeps #6 and #7 as valid follow-up work. The difference is that this sprint is intentionally capped to the highest-risk and highest-value work items.

---

## Two-week sprint plan (10 working days)

### Sprint goal
Ship a reliability-focused increment that makes the Personal Organizer safe to trust daily: robust data recovery, migration safety, validated core workflows, and hardened AI write boundaries.

This sprint intends to deliver the must-ship scope only. Items outside the commitment (#6 and #7) are tracked as deferred scope and brought forward only if the prime work is completed early and verified.

### Phase 1 (Days 1–2): Alignment + test scaffolding
**Deliverables**
- Finalized scope for Issues #1, #2, #4, #3, and #5.
- Baseline test fixture strategy for legacy/malformed state snapshots.
- Definition of done and risk register for data-loss scenarios.
- Issue creation or linking for each backlog item, with completed/deferred/blocked status tracked separately.

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
- Release gate run: lint + tests + build + required smoke checklist recorded in the sprint tracking location.

### Planned sprint outcomes
- App startup is resilient to malformed local data.
- Migration behavior is test-backed and regression-resistant.
- Core workflows and cross-widget links are reliable after reload and edit/delete operations.
- AI-assisted mutations are explicit, reviewable, and safer by default.
- Release readiness is based on objective evidence rather than a checklist being present only in planning.

---

## Deliverables vs backlog proposals

This document is a planning artifact, not proof that all items are implemented. As GitHub issues are created for each backlog item, they should be tracked separately for:

- **Completed**: implemented and verified during the sprint.
- **Deferred**: intentionally moved to a later sprint due to scope limits.
- **Blocked**: not yet actionable because of dependency or required design/UX decisions.

The two-week sprint should only claim the must-ship deliverables above; the remainder of the backlog remains actionable follow-up work and should not be treated as already accepted into the sprint commitment.

---

## Release gate: measurable quality bar for the sprint

The sprint closes only when the following are complete:

- CI must pass for lint, test, and production build.
- Required smoke checks must be executed and recorded for the following flows:
  - startup with malformed/partial persisted state
  - migration normalization for legacy snapshot fixtures
  - task/note/habit create/edit/delete/reload path
  - Tasks ↔ Focus and Work → Calendar reference flow
  - AI proposal preview, approval, and denial flow
- When a smoke check fails, the issue is marked as blocked and the release is not considered ready.
- Results are recorded in the PR, GitHub issue, or sprint tracker at the time the release is evaluated.

This makes the release gate clear and auditable instead of relying on a vague checklist artifact.

---

## Suggested PR summary text for this planning artifact

"Add a sprint planning artifact for Personal Organizer that documents the current product foundation, a prioritized GitHub-style backlog (with issue descriptions and acceptance criteria), impact/effort-based sequencing, a narrowed two-week sprint commitment, and a measurable release gate focused on reliability, core workflow validation, and AI trust boundaries."
