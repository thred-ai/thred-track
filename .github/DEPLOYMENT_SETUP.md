# GitHub Actions Deployment Setup

This guide explains how to configure GitHub Actions to deploy to Cloudflare R2 and NPM.

## Required Secrets

You need to add these secrets to your GitHub repository:

### Cloudflare R2 Secrets

1. Go to: **Settings → Secrets and variables → Actions → New repository secret**

2. Add these secrets:

   - **`R2_ACCESS_KEY_ID`**
     - Your Cloudflare R2 access key ID
     - Get from: Cloudflare Dashboard → R2 → Manage R2 API Tokens
   
   - **`R2_SECRET_ACCESS_KEY`**
     - Your Cloudflare R2 secret access key
     - Get from: Same location as above
   
   - **`R2_ENDPOINT`**
     - Your R2 endpoint URL
     - Format: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
     - Example: `https://abc123def456.r2.cloudflarestorage.com`

### NPM Secret

   - **`NPM_TOKEN`**
     - Your NPM automation token
     - Get from: https://www.npmjs.com/settings/~/tokens
     - Click "Generate New Token" → Choose "Automation"

## Cloudflare R2 Setup

### 1. Create R2 Bucket

```bash
# Using Wrangler CLI
npx wrangler r2 bucket create thred-static

# Or via Cloudflare Dashboard:
# R2 → Create bucket → Name: "thred-static"
```

### 2. Create API Token

1. Go to: **Cloudflare Dashboard → R2 → Manage R2 API Tokens**
2. Click **Create API token**
3. Permissions:
   - **Object Read & Write** on bucket `thred-static`
4. Copy the credentials:
   - Access Key ID → `R2_ACCESS_KEY_ID`
   - Secret Access Key → `R2_SECRET_ACCESS_KEY`

### 3. Configure Public Access (Optional)

If you want files publicly accessible:

```bash
# Using Wrangler
npx wrangler r2 bucket update thred-static --public-url
```

Or create a Custom Domain in Cloudflare Dashboard:
1. **R2 → thred-static → Settings → Public access**
2. Connect a custom domain (e.g., `cdn.yourdomain.com`)

### 4. Get Endpoint URL

Your endpoint format:
```
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

Find your Account ID:
- Cloudflare Dashboard → Click any domain → Right sidebar shows Account ID
- Or in URL: `dash.cloudflare.com/<ACCOUNT_ID>/`

## NPM Setup

### 1. Create NPM Account

If you don't have one: https://www.npmjs.com/signup

### 2. Generate Automation Token

1. Go to: https://www.npmjs.com/settings/~/tokens
2. Click **Generate New Token**
3. Select **Automation**
4. Copy the token → Add as `NPM_TOKEN` secret in GitHub

### 3. Update package.json

Ensure these fields are correct:

```json
{
  "name": "thred-track",
  "version": "1.0.0",
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yourusername/thred-track.git"
  }
}
```

## Deployment Workflows

### 1. Full Deployment (R2 + NPM)

**File:** `.github/workflows/deploy.yml`

**Triggers:**
- Push tags like `v1.0.0`, `v1.2.3`
- Manual trigger via GitHub Actions UI

**Usage:**
```bash
# 1. Update version in package.json
npm version patch  # or minor, major

# 2. Push with tags
git push --follow-tags

# Or manually:
git tag v1.0.0
git push origin v1.0.0
```

**What it does:**
1. Runs tests
2. Builds production
3. Deploys to R2 as:
   - `thred-track-v1.0.0.js` (versioned, immutable)
   - `thred-track.js` (always latest)
4. Publishes to NPM
5. Creates GitHub Release

### 2. R2 Only Deployment

**File:** `.github/workflows/deploy-r2-only.yml`

**Triggers:**
- Push to `main` branch
- Manual trigger

**Usage:**
```bash
git push origin main
```

### 3. NPM Only Deployment

**File:** `.github/workflows/deploy-npm-only.yml`

**Triggers:**
- Manual trigger only

**Usage:**
- Go to **Actions → Deploy to NPM Only → Run workflow**

## Versioning Strategy

### Semantic Versioning

We use semantic versioning (semver):

- **MAJOR** (1.x.x): Breaking changes
- **MINOR** (x.1.x): New features, backward compatible
- **PATCH** (x.x.1): Bug fixes

### Update Version

```bash
# Patch (1.0.0 → 1.0.1)
npm version patch

# Minor (1.0.0 → 1.1.0)
npm version minor

# Major (1.0.0 → 2.0.0)
npm version major

# Push with tags
git push --follow-tags
```

## Deployment URLs

After deployment, files are available at:

### Cloudflare R2

```html
<!-- Versioned (recommended for production) -->
<script src="https://cdn.yourdomain.com/thred-track-v1.0.0.js?browserKey=YOUR_KEY"></script>

<!-- Latest (auto-updates, use for testing) -->
<script src="https://cdn.yourdomain.com/thred-track.js?browserKey=YOUR_KEY"></script>
```

### NPM

```bash
# Install specific version
npm install thred-track@1.0.0

# Install latest
npm install thred-track
```

## Verify Deployment

### Check R2

```bash
# List files in bucket
aws s3 ls s3://thred-static/ \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com

# Download and verify
curl https://cdn.yourdomain.com/thred-track-v1.0.0.js | head -c 100
```

### Check NPM

```bash
# View published package
npm view thred-track

# Check specific version
npm view thred-track@1.0.0
```

### Check GitHub Release

Go to: **Releases** tab in your GitHub repository

## Rollback

### R2 Rollback

Old versions remain accessible:

```html
<!-- Rollback to v1.0.0 -->
<script src="https://cdn.yourdomain.com/thred-track-v1.0.0.js?browserKey=YOUR_KEY"></script>
```

### NPM Rollback

```bash
# Users can install old version
npm install thred-track@1.0.0
```

You can also deprecate a bad version:
```bash
npm deprecate thred-track@1.0.1 "Bug found, use 1.0.2 instead"
```

## Troubleshooting

### R2 Upload Fails

**Error:** `Could not connect to the endpoint URL`

**Fix:** Check `R2_ENDPOINT` format:
```bash
# Correct
https://abc123def456.r2.cloudflarestorage.com

# Incorrect (missing https://)
abc123def456.r2.cloudflarestorage.com
```

### NPM Publish Fails

**Error:** `You must be logged in to publish packages`

**Fix:** Check `NPM_TOKEN`:
1. Token type should be "Automation" (not "Publish")
2. Token should start with `npm_`
3. Secret name in GitHub should be exactly `NPM_TOKEN`

### Version Already Exists

**Error:** `Cannot publish over existing version`

**Fix:**
```bash
# Update version first
npm version patch
git push --follow-tags
```

## Manual Deployment

If you need to deploy manually:

```bash
# 1. Build
npm run build:prod

# 2. Deploy to R2
VERSION=$(node -p "require('./package.json').version")
aws s3 cp dist/thred-track.umd.js \
  s3://thred-static/thred-track-v$VERSION.js \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com \
  --acl public-read

# 3. Deploy to NPM
npm publish
```

## Security Best Practices

1. **Never commit secrets** to git
2. **Use Automation tokens** for NPM (not your password)
3. **Rotate tokens** periodically
4. **Limit R2 token permissions** to only `thred-static` bucket
5. **Enable 2FA** on NPM account

## Support

For issues:
- GitHub Issues: [your-repo]/issues
- NPM Package: https://www.npmjs.com/package/thred-track
- Email: support@thred.dev
