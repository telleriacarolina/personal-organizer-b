# Vercel Workflow SDK Setup

## What Vercel Workflow is
Vercel Workflow SDK (`workflow`) adds durable workflow execution primitives to JavaScript/TypeScript apps, so long-running orchestration can pause/resume safely instead of relying on one in-memory process.

## Why Personal Organizer is using it
Personal Organizer needs durable infrastructure for future Organizer AI Agent flows that may run for long periods, retry safely, and remain observable.

## Where workflows live
Workflow definitions live in `/home/runner/work/personal-organizer-b/personal-organizer-b/src/workflows`.

## How `"use workflow"` works
`"use workflow"` marks the orchestration function. It should coordinate steps and deterministic control flow only.

## How `"use step"` works
`"use step"` marks a step function. Steps are the place for side effects and operational work while the workflow coordinates them.

## Running workflows locally
Current repository setup now compiles workflow/step directives via `workflow/vite` in `vite.config.ts`.

To run the app locally:

```bash
npm run dev
```

To inspect workflow runtime data in local development:

```bash
npx workflow web
# or
npx workflow inspect runs
```

Note: this repository currently does not include a server-side workflow trigger route yet, so local execution observability becomes meaningful once a server/API trigger is added.

## Inspecting workflow runs
- Local: `npx workflow web` or `npx workflow inspect runs`
- On Vercel: use the Workflows view in the Vercel dashboard for the project

## Allowed code inside workflows
Keep orchestration deterministic:
- deterministic branching/loops
- calling step functions
- composing returned values

Do not perform direct side effects inside `"use workflow"` functions:
- network requests
- filesystem access
- browser APIs
- `localStorage` access
- media APIs

## What belongs inside steps
Put side-effectful logic in `"use step"` functions, such as:
- external HTTP calls
- database reads/writes
- filesystem operations
- integration calls
- other non-deterministic operations
