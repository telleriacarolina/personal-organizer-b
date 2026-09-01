# Personal Organizer

Personal Organizer is a browser-based productivity dashboard for tasks, notes, habits, goals, calendar items, work planning, and shopping lists.

## Project Status

- Active development
- Client-side only
- No backend sync yet
- State persists locally in the browser

## Core Functionality

- Add dashboard widgets
- Reorder widgets with drag-and-drop
- Resize widgets
- Lock individual widgets or all widgets
- Snap widgets to a grid
- Customize themes and background styling
- Capture work preferences with a setup questionnaire

## Available Widgets

- Tasks
- Notes
- Habits
- Goals
- Calendar
- Work
- Shopping

## Data / Storage Architecture

The app stores organizer data in browser storage using `@github/spark` KV hooks and `localStorage`-backed preferences.

Persisted state includes:

- widget layout and order
- widget sizes and lock state
- theme selection
- custom colors
- background image settings
- snap-to-grid and global lock settings

There is currently no server-side database.

## Architecture

This is a Vite + React + TypeScript single-page application.

- `src/App.tsx` owns dashboard state and widget orchestration
- `src/components/widgets/` contains the feature widgets
- `src/components/ui/` contains shared UI primitives
- `src/types/` defines the dashboard and widget data models
- `src/components/WidgetContainer.tsx` handles widget chrome, dragging, resizing, and locking

The app is designed as a composition of independent widgets that all share the same dashboard shell.

## Widget Development

To add a new widget:

1. Define the widget type and data shape in `src/types/index.ts`
2. Create the widget component in `src/components/widgets/`
3. Wrap it with `WidgetContainer`
4. Register it in `src/components/AddWidgetDialog.tsx`
5. Add creation/update logic in `src/App.tsx`

Keep widget state serializable so it can be persisted in browser storage.

## Development Conventions

- Use TypeScript and functional React components
- Keep widget-specific state inside the widget component when possible
- Use shared UI primitives from `src/components/ui/`
- Keep persisted data shapes in `src/types/`
- Prefer small, composable components over large monoliths
- Use `useKV` for dashboard preferences that should persist locally

## Environment Variables

No environment variables are currently required.

## Browser / Platform Requirements

- Modern Chromium-based browsers, Firefox, and Safari are expected to work
- Desktop is the primary experience
- The layout is responsive and also supports tablet and mobile use
- No explicit Node.js engine version is pinned in the repo; a current LTS release is recommended

## Responsive / Mobile Behavior

- Desktop: full experience
- Tablet: supported with responsive layout adjustments
- Mobile: supported, but dense widgets are easier to use on larger screens

## Accessibility

The app uses standard buttons, dialogs, inputs, and form controls where possible.

Notes:

- Keyboard interaction works for form entry and dialog actions
- Drag-and-drop is primarily pointer-driven
- Resizable and draggable interfaces should be tested with assistive technology before production use

## Security / Privacy

Organizer data stays locally in the browser by default.

The app does not currently include cloud sync or authentication, and it does not send dashboard content to a backend service.

External resources may still be loaded by the browser, such as web fonts and package assets.

## Testing

No automated test suite is currently defined in this repository.

Available checks:

- `npm run build`
- `npm run lint`

## Roadmap

Potential future enhancements:

- Cloud sync
- Authentication
- Calendar integrations
- Reminders
- Recurring tasks
- Search
- Import/export
- Backup/restore
- Mobile/PWA support

## Contributing

Contributions are welcome.

Suggested workflow:

1. Fork or branch from `main`
2. Make focused changes
3. Run the build and lint checks
4. Open a pull request with a clear summary

## License

See the repository’s license file for the applicable license and terms.
