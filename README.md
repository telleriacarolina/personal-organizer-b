# Personal Organizer

A comprehensive personal productivity dashboard with customizable widgets for tasks, notes, habits, goals, calendar, work management, and shopping.

## 🚀 Features

### Widgets

* **Tasks**: Create, prioritize, and track tasks with due dates and categories
* **Notes**: Capture and organize free-form notes
* **Habits**: Track recurring habits with streaks and completion history
* **Goals**: Set and monitor long-term goals with progress tracking
* **Calendar**: View and manage events; import items from Work and other widgets
* **Work Management**: Multiple work routines for different jobs and schedules, with client slots, meals, job deadlines, and errands
* **Shopping**: Build shopping lists with barcode scanning, receipt scanning, and expense comparison
* **Daily Focus**: Surface today's top tasks from a linked Tasks widget with AI-powered prioritization suggestions
* **Record Note**: Capture audio, video, and photo notes using your device microphone and camera
* **AI Chat**: Ask productivity questions and get context-aware suggestions scoped to your existing widgets

### App-wide

* **Drag & Drop**: Rearrange widgets with intuitive drag-and-drop
* **Responsive Design**: Mobile-friendly interface with touch support
* **Theme Customization**: Custom color picker and theme settings
* **Widget Resizing**: Pinch corners to resize widgets
* **Grid Snapping**: Snap widgets to grid for precise alignment
* **Lock/Unlock**: Lock all widgets to prevent accidental changes
* **Work → Calendar Scheduling**: Push client slots, meals, job deadlines, and errands from the Work widget directly into a Calendar widget; duplicate events are automatically deduplicated by source reference
* **Organizer Agent**: Conversational AI assistant (accessible from the toolbar) that reads live widget data, understands natural-language intents, and can create tasks, shopping items, and more with your confirmation

## 🛠️ Development

### Prerequisites

* Node.js 20 or higher
* npm

### Installation

```bash
npm ci
```

### Running Locally

```bash
npm run dev
```

### AI Organizer Configuration

AI is disabled by default. Phase 1 adds the provider boundary, persistence, and review UI shell without enabling live AI mutations.

Optional environment variables:

```bash
VITE_ORGANIZER_AI_MODE=off   # off | mock | api
VITE_ORGANIZER_AI_PROVIDER=OpenAI
VITE_ORGANIZER_AI_API_URL=https://your-ai-service.example.com
```

> `VITE_*` values are client-visible at runtime. Never place long-lived secrets in these variables.

Current behavior:

* `off`: AI panels stay functional for configuration review and do not send data anywhere
* `mock`: demo provider for UI testing without credentials; data stays in the browser
* `api`: marks an external provider as configured, but live provider requests are intentionally deferred beyond Phase 1

The AI review flow is always explicit: generate → review → apply or dismiss. Suggestions are stored separately from widget source data in `organizer-widget-ai` local storage and never modify widget data until you explicitly apply them.

#### Organizer Agent

The Organizer Agent is a conversational assistant accessible from the toolbar (robot icon). It reads real data from all your widgets, understands natural-language requests, and can:

* Answer questions about your tasks, habits, goals, calendar events, and more
* Create tasks and shopping items on your behalf (with confirmation for write actions)
* Surface scheduling conflicts and overdue items

Write actions (create, delete, bulk operations) always show a confirmation step before any data is changed. The agent is structured to support real AI providers in a future phase; it currently uses a built-in mock implementation.

### Calendar External Sync Security

Calendar sync stays local by default even when `VITE_FAMILY_CALENDAR_API_URL` is configured.

External sync requires:

* User opt-in in the Calendar widget
* HTTPS endpoint (HTTP allowed only for localhost/local development)
* Short-lived session token in `sessionStorage` key: `family-calendar-sync-token`

When enabled, the app may transmit: event title, description, dates/times, location, reminders, and attendee metadata to the configured endpoint.
Disable external sync from the Calendar widget at any time.

### Data Storage, Classification, and Retention

Data classes:

* **General settings** (theme/layout/snap/lock): local browser storage
* **Planner content** (tasks, notes, goals, habits, calendar/work/shopping metadata): local browser storage
* **Large media** (recorded audio/video/photos, receipt images): IndexedDB blob storage

Current retention model:

* Data persists until removed by the user.
* Deleting individual records removes their linked media when applicable.
* **Clear Data** in the main toolbar clears organizer data, AI history/config, sync preferences, theme state, and stored media blobs for this origin.

Security limitation:

* Client-side storage is readable by scripts running in the same origin. Treat browser-only persistence as convenience storage, not strong secrecy.

### Content Security Policy (CSP) Strategy

Use CSP as a deployment header (recommended) for production, with explicit allowances for required assets (such as Google Fonts if enabled).  
Example baseline:

* `default-src 'self'`
* `script-src 'self'`
* `style-src 'self' https://fonts.googleapis.com`
* `font-src 'self' https://fonts.gstatic.com`
* `img-src 'self' data: blob:`
* `media-src 'self' blob:`
* `connect-src 'self' https:`

Adjust per deployment environment and verify against application/runtime needs before enforcement.

### Building for Production

```bash
npm run build
```

## 🚢 Deployment Workflows

This project includes automated deployment workflows using GitHub Actions.

### Available Workflows

#### 1. **CI/CD Pipeline** (`ci-cd.yml`)

Runs on every push and pull request to `main` and `develop` branches.

* Lints code with ESLint
* Runs TypeScript checks
* Executes tests
* Builds the application
* Uploads build artifacts

#### 2. **Deploy to Production** (`deploy-production.yml`)

Triggered when a new release is published or manually via workflow dispatch.

* Builds the application
* Deploys to production environment
* Runs health checks
* Sends deployment notifications

**Manual Trigger:**

1. Go to Actions → Deploy to Production
2. Click "Run workflow"
3. Select environment (production/staging)
4. Click "Run workflow"

#### 3. **Create Release** (`create-release.yml`)

Creates a new GitHub release with automated changelog generation.

**To Create a Release:**

1. Go to Actions → Create Release
2. Click "Run workflow"
3. Enter version (e.g., v1.0.0)
4. Select release type (major/minor/patch)
5. Choose if pre-release
6. Click "Run workflow"

#### 4. **Rollback Deployment** (`rollback.yml`)

Rolls back to a previous version in case of issues.

**To Rollback:**

1. Go to Actions → Rollback Deployment
2. Click "Run workflow"
3. Enter version to rollback to (e.g., v1.0.0)
4. Enter reason for rollback
5. Click "Run workflow"

#### 5. **Security and Maintenance** (`security-maintenance.yml`)

Runs weekly security audits and dependency checks.

* Performs security audits
* Checks for outdated dependencies
* Verifies builds
* Reports bundle sizes

**Manual Trigger:**

1. Go to Actions → Security and Maintenance
2. Click "Run workflow"

#### 6. **Copilot Setup Steps** (`copilot-setup-steps.yml`)

Sets up development environment dependencies for Copilot runs.

* Runs by manual workflow dispatch
* Installs dependencies

## 📋 Release Process

### Semantic Versioning

This project follows [Semantic Versioning](https://semver.org/):

* **MAJOR** version for incompatible API changes
* **MINOR** version for new functionality in a backwards compatible manner
* **PATCH** version for backwards compatible bug fixes

### Creating a Production Release

1. **Ensure all tests pass**: Check CI/CD pipeline status
2. **Create release**: Use the "Create Release" workflow
3. **Automatic deployment**: Release publication triggers production deployment
4. **Verify deployment**: Check health checks and deployment summary
5. **Monitor**: Watch for any issues in production

### Emergency Rollback

If a deployment causes issues:

1. **Execute rollback**: Use the "Rollback Deployment" workflow
2. **Specify version**: Enter the last known good version
3. **Document reason**: Provide a clear reason for the rollback
4. **Investigate**: An issue will be automatically created for investigation

## 🔒 Security

* Weekly automated security audits
* Dependency vulnerability scanning
* No secrets or API keys in code
* Security gate fails on high/critical dependency vulnerabilities
* Dependabot updates enabled
* Secret scanning expected in CI/review process

## 📦 Build Artifacts

Build artifacts are automatically:

* Generated on every successful build
* Stored for 7 days (CI/CD builds)
* Stored for 30 days (production builds)
* Available for download from workflow runs

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Ensure all workflows pass
4. Submit a pull request

## 📄 License

See the repository’s license file for information about the applicable license and terms.
