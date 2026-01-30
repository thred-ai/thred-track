# Deployment Workflow Guide

Quick reference for deploying the Thred SDK from VS Code.

## 🚀 Recommended: One-Click Deploy

**Use VS Code Tasks for the easiest deployment:**

1. **Press:** `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. **Type:** `Tasks: Run Task`
3. **Select:** 
   - `🚀 Deploy: Bump Patch & Push` (bug fixes: 1.0.0 → 1.0.1)
   - `🚀 Deploy: Bump Minor & Push` (new features: 1.0.0 → 1.1.0)
   - `🚀 Deploy: Bump Major & Push` (breaking changes: 1.0.0 → 2.0.0)

**That's it!** This automatically:
- ✅ Bumps version in `package.json`
- ✅ Creates git tag
- ✅ Commits the version change
- ✅ Pushes commits
- ✅ Pushes tags
- ✅ Triggers GitHub Actions deployment

## 📝 Alternative: Manual Steps

If you prefer more control:

### Step 1: Make Your Changes
Edit code in `src/` directory

### Step 2: Commit Changes (Optional)
```bash
git add .
git commit -m "feat: add new feature"
```
Or use VS Code Source Control panel

### Step 3: Bump Version
```bash
# Choose one:
npm version patch   # 1.0.0 → 1.0.1 (bug fixes)
npm version minor   # 1.0.0 → 1.1.0 (new features)
npm version major   # 1.0.0 → 2.0.0 (breaking changes)
```

This command:
- Updates version in `package.json`
- Creates a git commit: `"1.0.1"`
- Creates a git tag: `v1.0.1`

### Step 4: Push
```bash
git push --follow-tags
```
Or click the **Sync** button (↻) in VS Code status bar

## 🎯 What Happens After Push?

1. **GitHub Actions triggers** (see Actions tab in GitHub)
2. **Builds production** (`dist/thred.umd.js`)
3. **Deploys to Cloudflare R2:**
   - `thred-v1.0.1.js` (versioned, immutable)
   - `thred-latest.js` (updated to latest)
4. **Publishes to NPM:** `thredjs@1.0.1`
5. **Creates GitHub Release** with changelog

## ⏱️ Timeline

- **Push to GitHub:** Instant
- **GitHub Actions starts:** ~10 seconds
- **Build completes:** ~1-2 minutes
- **R2 deployment:** ~30 seconds
- **NPM publish:** ~30 seconds
- **Total:** ~3-4 minutes

## ✅ Verify Deployment

### Check GitHub Actions
1. Go to your repo on GitHub
2. Click **Actions** tab
3. Look for "Deploy to R2 and NPM" workflow
4. Should show green checkmark ✅

### Check Cloudflare R2
```bash
# Test versioned URL
curl -I https://cdn.yourdomain.com/thred-v1.0.1.js

# Test latest URL
curl -I https://cdn.yourdomain.com/thred-latest.js
```

### Check NPM
```bash
npm view thredjs
# or
npm view thredjs@1.0.1
```

### Check in Browser
```html
<script src="https://cdn.yourdomain.com/thred-v1.0.1.js?browserKey=YOUR_KEY"></script>
```

## 🔄 Typical Development Workflow

### Working on Features

```bash
# 1. Create feature branch
git checkout -b feature/new-tracking

# 2. Make changes to src/
# Edit files...

# 3. Test locally
npm run build
npm test

# 4. Commit changes
git add .
git commit -m "feat: add custom event tracking"

# 5. Push to branch
git push origin feature/new-tracking

# 6. Create PR on GitHub
# Merge when ready
```

### Deploying to Production

```bash
# 1. Switch to main branch
git checkout main
git pull

# 2. Run VS Code task:
# Cmd+Shift+P → Tasks: Run Task → "Deploy: Bump Patch & Push"

# 3. Wait for GitHub Actions
# 4. Done!
```

## 📦 Version Types Explained

### Patch (1.0.0 → 1.0.1)
- Bug fixes
- Performance improvements
- Documentation updates
- No new features

**Example:**
```bash
npm version patch
```

### Minor (1.0.0 → 1.1.0)
- New features
- Backward compatible changes
- New optional parameters

**Example:**
```bash
npm version minor
```

### Major (1.0.0 → 2.0.0)
- Breaking changes
- API changes
- Removing features
- Incompatible updates

**Example:**
```bash
npm version major
```

## 🚨 Troubleshooting

### "Tag already exists"
```bash
# Check existing tags
git tag

# Delete local tag
git tag -d v1.0.1

# Delete remote tag
git push origin :refs/tags/v1.0.1

# Try version bump again
npm version patch
```

### "GitHub Actions didn't trigger"
```bash
# Verify tag was pushed
git ls-remote --tags origin

# If missing, push tags manually
git push --tags
```

### "Version conflicts"
```bash
# Check current version
cat package.json | grep version

# Check latest tag
git describe --tags --abbrev=0

# Sync if needed
git pull --tags
```

### "VS Code sync doesn't push tags"
```bash
# Check setting
cat .vscode/settings.json

# Should show: "git.followTagsWhenSync": true

# Or set globally
git config --global push.followTags true
```

## 🔐 Pre-Deployment Checklist

Before deploying:

- [ ] All tests passing: `npm test`
- [ ] Code linted: `npm run lint`
- [ ] Builds successfully: `npm run build:prod`
- [ ] Changes committed
- [ ] On correct branch (usually `main`)
- [ ] Pulled latest changes: `git pull`
- [ ] Version type selected (patch/minor/major)

## 🎨 VS Code Keyboard Shortcuts

Make deployment even faster:

### Add to keybindings.json
```json
[
  {
    "key": "cmd+shift+d",
    "command": "workbench.action.tasks.runTask",
    "args": "🚀 Deploy: Bump Patch & Push"
  }
]
```

Now press `Cmd+Shift+D` to deploy instantly!

## 📊 Monitoring Deployments

### GitHub
- **Actions tab:** Real-time build status
- **Releases:** Version history
- **Commits:** Deployment commits

### Cloudflare R2
- **Dashboard:** Storage analytics
- **Logs:** Request logs
- **Metrics:** Bandwidth usage

### NPM
- **Package page:** Downloads, version history
- **npm view thredjs:** CLI stats

## 🔄 Rollback Procedure

If a deployment goes wrong:

### Option 1: Users use previous version
```html
<!-- Just point to older version -->
<script src="https://cdn.yourdomain.com/thred-v1.0.0.js?browserKey=YOUR_KEY"></script>
```

### Option 2: Update "latest" to previous version
```bash
# Via AWS CLI
aws s3 cp s3://thred-static/thred-v1.0.0.js \
  s3://thred-static/thred-latest.js \
  --endpoint-url https://ACCOUNT_ID.r2.cloudflarestorage.com
```

### Option 3: Deprecate NPM version
```bash
npm deprecate thredjs@1.0.1 "Critical bug - use 1.0.2"
```

### Option 4: Deploy fix quickly
```bash
# Fix the bug
# Then:
npm version patch && git push --follow-tags
```

## 📚 Related Documentation

- [DEPLOYMENT_SETUP.md](.github/DEPLOYMENT_SETUP.md) - Initial setup guide
- [DEPLOY.md](DEPLOY.md) - Detailed deployment options
- [CHANGELOG.md](CHANGELOG.md) - Version history
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guidelines

## 🆘 Need Help?

- **GitHub Issues:** Report bugs or ask questions
- **GitHub Discussions:** Community help
- **Email:** support@thred.dev
