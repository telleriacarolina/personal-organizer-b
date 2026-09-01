# GitHub Actions Workflows Documentation

This document provides detailed information about all GitHub Actions workflows configured for this project.

## Workflow Overview

| Workflow | Trigger | Purpose | Duration |
|----------|---------|---------|----------|
| CI/CD Pipeline | Push, PR | Continuous integration | ~2-3 min |
| Deploy to Production | Release, Manual | Production deployment | ~3-5 min |
| Create Release | Manual | Release management | ~2-4 min |
| Rollback Deployment | Manual | Emergency rollback | ~2-3 min |
| Security & Maintenance | Weekly, Manual | Security audits | ~2-3 min |
| Copilot Setup Steps | Push, PR | Dev environment setup | ~1-2 min |

## Workflow Details

### 1. CI/CD Pipeline (`ci-cd.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**

#### Lint Job
- Runs ESLint on codebase
- Performs TypeScript type checking
- Continues on error (non-blocking)

#### Test Job
- Executes test suite
- Runs in parallel with Lint job
- Continues on error (non-blocking)

#### Build Job
- Depends on Lint and Test jobs
- Builds production bundle
- Uploads artifacts (7-day retention)
- Generates build summary

**Artifacts:**
- Name: `build-output`
- Path: `dist/`
- Retention: 7 days

---

### 2. Deploy to Production (`deploy-production.yml`)

**Triggers:**
- Release published
- Manual workflow dispatch

**Manual Inputs:**
- `environment`: Production or Staging (default: production)

**Jobs:**

#### Build Job
- Installs dependencies
- Runs tests (non-blocking)
- Builds application
- Uploads artifacts (30-day retention)

#### Deploy Job
- Downloads build artifacts
- Deploys to selected environment
- Outputs deployment URL
- Requires successful build

#### Verify Job
- Runs health checks
- Sends deployment notifications
- Creates deployment summary

**Artifacts:**
- Name: `production-build`
- Path: `dist/`
- Retention: 30 days

**Environment:**
- Production environment required
- Environment URL captured in deployment

---

### 3. Create Release (`create-release.yml`)

**Triggers:**
- Manual workflow dispatch only

**Manual Inputs:**
- `version`: Release version (e.g., v1.0.0) - Required
- `release_type`: major | minor | patch (default: minor)
- `prerelease`: Boolean (default: false)

**Jobs:**

#### Create Release Job
- Fetches complete git history
- Runs tests (non-blocking)
- Builds application
- Generates changelog from commits
- Creates GitHub release
- Attaches build artifacts to release

**Permissions Required:**
- `contents: write` - Create releases
- `pull-requests: read` - Read PR information

**Changelog Generation:**
- Automatic from git commits since last tag
- Includes commit hashes
- Links to full changelog

---

### 4. Rollback Deployment (`rollback.yml`)

**Triggers:**
- Manual workflow dispatch only (emergency use)

**Manual Inputs:**
- `version`: Version to rollback to (e.g., v1.0.0) - Required
- `reason`: Reason for rollback - Required

**Jobs:**

#### Rollback Job
- Checks out code at specified version
- Rebuilds application
- Deploys rollback version
- Verifies successful rollback
- Creates incident tracking issue
- Generates rollback summary

**Environment:**
- Production environment required

**Automatic Issue Creation:**
- Title: "🔄 Production Rollback to {version}"
- Labels: rollback, production, incident
- Assigned for investigation

---

### 5. Security and Maintenance (`security-maintenance.yml`)

**Triggers:**
- Scheduled: Every Monday at midnight (cron: `0 0 * * 1`)
- Manual workflow dispatch
- Pull requests (dependency review only)

**Jobs:**

#### Security Audit Job
- Runs `npm audit` with moderate severity threshold
- Checks for outdated dependencies
- Generates security report
- Non-blocking (informational)

#### Dependency Review Job
- Only runs on pull requests
- Reviews dependency changes
- Fails on moderate+ severity vulnerabilities
- Uses GitHub's dependency review action

#### Build Check Job
- Verifies application builds successfully
- Reports bundle size
- Tracks build health over time

---

### 6. Copilot Setup Steps (`copilot-setup-steps.yml`)

**Triggers:**
- Manual workflow dispatch
- Push to `main` branch
- Pull requests to `main` branch (opened, synchronized, reopened)

**Jobs:**

#### Setup Job
- Checks out code
- Sets up Node.js 20 with npm caching
- Installs dependencies
- Installs GitHub Copilot CLI extension

**Special Configuration:**
- Uses built-in `GITHUB_TOKEN`
- Prepares development environment

---

## Workflow Secrets and Variables

### Repository Secrets

Currently, no custom secrets are required. All workflows use:
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

### Environment Variables

**Production Build:**
```bash
NODE_ENV=production
```

**No Additional Variables Required:**
This is a static web application with no backend services.

---

## Workflow Permissions

### Default Permissions
Most workflows use default `GITHUB_TOKEN` permissions.

### Special Permissions

**Create Release Workflow:**
- `contents: write` - Required to create releases
- `pull-requests: read` - Required for changelog generation

**Rollback Workflow:**
- Uses `actions/github-script@v7` to create issues

**Security Workflow:**
- `actions/dependency-review-action@v4` on PRs

---

## Best Practices

### When to Trigger Each Workflow

1. **CI/CD Pipeline**: Automatic - runs on every push/PR
2. **Deploy to Production**: After creating a release
3. **Create Release**: When ready to publish a new version
4. **Rollback Deployment**: Only in emergencies
5. **Security & Maintenance**: Automatic weekly, manual as needed
6. **Copilot Setup**: Automatic - runs on code changes

### Release Workflow

Standard release process:

```
1. Development → Commit changes
2. CI/CD → Automatic validation
3. Create Release → Manual trigger
4. Deploy to Production → Automatic on release
5. Verify → Check deployment
```

### Emergency Procedures

If production has issues:

```
1. Identify problem severity
2. If critical: Trigger Rollback Workflow
3. Specify last known good version
4. Provide detailed reason
5. Monitor rollback verification
6. Investigate issue from auto-created GitHub issue
```

---

## Monitoring Workflow Runs

### GitHub Actions Tab

View all workflow runs at:
```
https://github.com/{owner}/{repo}/actions
```

### Workflow Artifacts

Access build artifacts:
1. Navigate to workflow run
2. Scroll to "Artifacts" section
3. Download artifacts (before expiration)

### Workflow Summaries

Each workflow generates a summary with:
- Status indicators
- Key metrics
- Deployment URLs
- Timestamps
- Version information

---

## Troubleshooting

### Common Issues

**Build Fails:**
- Check Node.js version (must be 20)
- Verify dependencies installed
- Review TypeScript errors
- Check ESLint output

**Deployment Fails:**
- Verify build artifacts exist
- Check environment configuration
- Review deployment logs
- Validate health checks

**Rollback Fails:**
- Ensure version tag exists
- Verify repository access
- Check deployment environment
- Review error messages

### Debug Steps

1. **Check Workflow Logs:**
   - Click on failed workflow run
   - Expand failed step
   - Review error messages

2. **Local Reproduction:**
   ```bash
   npm ci
   npm run build
   npm run preview
   ```

3. **Validate Environment:**
   ```bash
   node --version  # Should be 20.x
   npm --version
   ```

---

## Workflow Badges

Add these badges to your README.md:

```markdown
![CI/CD](https://github.com/{owner}/{repo}/workflows/CI%2FCD%20Pipeline/badge.svg)
![Deploy](https://github.com/{owner}/{repo}/workflows/Deploy%20to%20Production/badge.svg)
![Security](https://github.com/{owner}/{repo}/workflows/Security%20and%20Maintenance/badge.svg)
```

---

## Future Enhancements

Potential workflow improvements:

- [ ] E2E testing integration
- [ ] Performance benchmarking
- [ ] Lighthouse CI integration
- [ ] Automated dependency updates
- [ ] Slack/Discord notifications
- [ ] Multi-environment deployments
- [ ] Canary deployments
- [ ] A/B testing support
