# Personal Organizer

A comprehensive personal productivity dashboard with customizable widgets for tasks, notes, habits, goals, calendar, work management, and shopping.

## 🚀 Features

- **Customizable Widgets**: Tasks, Notes, Habits, Goals, Calendar, Work Management, Shopping
- **Drag & Drop**: Rearrange widgets with intuitive drag-and-drop
- **Responsive Design**: Mobile-friendly interface with touch support
- **Theme Customization**: Custom color picker and theme settings
- **Widget Resizing**: Pinch corners to resize widgets
- **Grid Snapping**: Snap widgets to grid for precise alignment
- **Lock/Unlock**: Lock all widgets to prevent accidental changes
- **Barcode Scanning**: Add shopping items via barcode
- **Receipt Scanning**: Track expenses and compare shopping trips
- **Work Organization**: Multiple work routines for different jobs and schedules

## 🛠️ Development

### Prerequisites

- Node.js 20 or higher
- npm

### Installation

```bash
npm ci
```

### Running Locally

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

## 🚢 Deployment Workflows

This project includes automated deployment workflows using GitHub Actions.

### Available Workflows

#### 1. **CI/CD Pipeline** (`ci-cd.yml`)
Runs on every push and pull request to `main` and `develop` branches.
- Lints code with ESLint
- Runs TypeScript checks
- Executes tests
- Builds the application
- Uploads build artifacts

#### 2. **Deploy to Production** (`deploy-production.yml`)
Triggered when a new release is published or manually via workflow dispatch.
- Builds the application
- Deploys to production environment
- Runs health checks
- Sends deployment notifications

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
- Performs security audits
- Checks for outdated dependencies
- Verifies builds
- Reports bundle sizes

**Manual Trigger:**
1. Go to Actions → Security and Maintenance
2. Click "Run workflow"

#### 6. **Copilot Setup Steps** (`copilot-setup-steps.yml`)
Sets up development environment with GitHub Copilot CLI.
- Runs on pull requests and pushes to main
- Installs dependencies
- Sets up GitHub Copilot CLI

## 📋 Release Process

### Semantic Versioning

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backwards compatible manner
- **PATCH** version for backwards compatible bug fixes

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

- Weekly automated security audits
- Dependency vulnerability scanning
- No secrets or API keys in code
- All data stored locally in browser

## 📦 Build Artifacts

Build artifacts are automatically:
- Generated on every successful build
- Stored for 7 days (CI/CD builds)
- Stored for 30 days (production builds)
- Available for download from workflow runs

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Ensure all workflows pass
4. Submit a pull request

## 📄 License

The Spark Template files and resources from GitHub are licensed under the terms of the MIT license, Copyright GitHub, Inc.
