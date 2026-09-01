# 🚀 Deployment Quick Reference

Quick commands and procedures for deploying the Personal Organizer application.

## Local Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Build and preview
npm run deploy:preview

# Verify build
npm run verify:build
```

## GitHub Actions Workflows

### Create a New Release

**Via GitHub UI:**
1. Go to `Actions` → `Create Release`
2. Click `Run workflow`
3. Enter version: `v1.2.3`
4. Select type: `minor`
5. Click `Run workflow`

**What it does:**
- ✅ Runs tests
- ✅ Builds application
- ✅ Generates changelog
- ✅ Creates GitHub release
- ✅ Triggers production deployment

---

### Deploy to Production

**Automatic:**
- Triggers when you publish a release

**Manual:**
1. Go to `Actions` → `Deploy to Production`
2. Click `Run workflow`
3. Select environment: `production`
4. Click `Run workflow`

**What it does:**
- ✅ Builds application
- ✅ Deploys to production
- ✅ Runs health checks
- ✅ Sends notifications

---

### Rollback to Previous Version

**Emergency Use Only:**
1. Go to `Actions` → `Rollback Deployment`
2. Click `Run workflow`
3. Enter version: `v1.1.0` (previous working version)
4. Enter reason: `Critical bug in payment processing`
5. Click `Run workflow`

**What it does:**
- ⚠️ Reverts to specified version
- ⚠️ Redeploys previous build
- ⚠️ Creates incident issue
- ⚠️ Notifies team

---

### Run Security Audit

**Manual Check:**
1. Go to `Actions` → `Security and Maintenance`
2. Click `Run workflow`
3. Click `Run workflow`

**Automatic:**
- Runs every Monday at midnight

**What it does:**
- 🔒 Security audit
- 🔒 Dependency check
- 🔒 Build verification
- 🔒 Bundle size report

---

## Release Versioning

### Semantic Versioning

Format: `vMAJOR.MINOR.PATCH`

**Examples:**
- `v1.0.0` → `v2.0.0` (Breaking changes)
- `v1.0.0` → `v1.1.0` (New features)
- `v1.0.0` → `v1.0.1` (Bug fixes)

### When to Bump

**MAJOR** (v1.0.0 → v2.0.0):
- Breaking API changes
- Major UI redesign
- Incompatible updates

**MINOR** (v1.0.0 → v1.1.0):
- New features
- New widgets
- Backwards compatible

**PATCH** (v1.0.0 → v1.0.1):
- Bug fixes
- Security patches
- Performance improvements

---

## Common Deployment Scenarios

### 🎯 Standard Release

```
1. Merge feature branches to main
2. Verify CI/CD passes
3. Run "Create Release" workflow
   - Version: v1.2.0
   - Type: minor
4. Wait for automatic deployment
5. Verify production
```

### 🐛 Hotfix Release

```
1. Create hotfix branch
2. Make fix and test
3. Merge to main
4. Run "Create Release" workflow
   - Version: v1.1.1
   - Type: patch
5. Wait for automatic deployment
6. Verify fix in production
```

### 🚨 Emergency Rollback

```
1. Identify issue in production
2. Find last working version (e.g., v1.1.0)
3. Run "Rollback Deployment" workflow
   - Version: v1.1.0
   - Reason: "Critical bug causing data loss"
4. Verify rollback successful
5. Fix issue in development
6. Create new hotfix release
```

### 🧪 Pre-release Testing

```
1. Run "Create Release" workflow
   - Version: v1.2.0-beta.1
   - Type: minor
   - Pre-release: ✅ Yes
2. Deploy to staging environment
3. Test thoroughly
4. Create final release when ready
   - Version: v1.2.0
   - Pre-release: ❌ No
```

---

## Environment URLs

**Production:**
- URL: `https://your-production-url.com`
- Updated on every release deployment

**Staging:**
- URL: `https://your-staging-url.com`
- Updated on pre-release deployments

---

## Deployment Checklist

### Before Release

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Version number decided
- [ ] Changelog reviewed
- [ ] Breaking changes documented
- [ ] Security audit clean

### During Deployment

- [ ] Create release workflow triggered
- [ ] Build artifacts generated
- [ ] Production deployment started
- [ ] Health checks passing

### After Deployment

- [ ] Production URL accessible
- [ ] All features working
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Mobile responsive
- [ ] Data persistence working

---

## Monitoring

### Check Workflow Status

```bash
# Via GitHub CLI
gh workflow list
gh run list --workflow="deploy-production.yml"
gh run view <run-id>
```

### View Deployment Logs

1. Go to `Actions` tab
2. Click on workflow run
3. Click on job name
4. Expand steps to see logs

### Download Build Artifacts

1. Navigate to workflow run
2. Scroll to "Artifacts" section
3. Click artifact name to download
4. Extract and inspect build

---

## Troubleshooting

### Build Fails

```bash
# Run locally to debug
npm ci
npm run lint
npm run build
```

**Check:**
- TypeScript errors
- ESLint warnings
- Missing dependencies
- Environment variables

### Deployment Fails

**Check:**
- Build artifacts exist
- Environment configured
- Permissions granted
- Network connectivity

### Rollback Fails

**Check:**
- Version tag exists
- Repository access
- Workflow permissions
- Previous build artifacts

---

## Support Commands

### Check Current Version

```bash
# View latest release
gh release list

# View specific release
gh release view v1.0.0
```

### Manual Build Verification

```bash
# Clean install
rm -rf node_modules
npm ci

# Production build
npm run build:production

# Check build size
du -sh dist/

# Preview build
npm run preview
```

### Security Audit

```bash
# Run audit locally
npm audit

# Fix vulnerabilities
npm audit fix

# Check outdated packages
npm outdated
```

---

## Quick Links

- **Actions**: `https://github.com/{owner}/{repo}/actions`
- **Releases**: `https://github.com/{owner}/{repo}/releases`
- **Issues**: `https://github.com/{owner}/{repo}/issues`
- **Deployments**: `https://github.com/{owner}/{repo}/deployments`

---

## Emergency Contacts

**For deployment issues:**
1. Check workflow logs first
2. Review deployment summary
3. Consult WORKFLOWS.md
4. Execute rollback if critical
5. Create incident issue

**Escalation:**
- Check automated issues for rollbacks
- Review deployment history
- Contact repository maintainer
