# Deployment Summary

Quick reference for thred-track deployment URLs and structure.

## 📦 Package Name

**NPM:** `thred-track`

## 🌐 Cloudflare R2 URLs

After deployment, your files will be available at:

### Versioned (Recommended for Production)
```html
<script src="https://your-cdn-domain.com/thred-track-v1.0.1.js?browserKey=YOUR_KEY"></script>
```

**Benefits:**
- ✅ Immutable (never changes)
- ✅ Cache forever (max-age=31536000)
- ✅ Safe for production
- ✅ Can rollback easily

### Latest (Always Current Version)
```html
<script src="https://your-cdn-domain.com/thred-track.js?browserKey=YOUR_KEY"></script>
```

**Benefits:**
- ✅ Auto-updates to latest version
- ✅ Good for development/testing
- ⚠️ Cache short-lived (max-age=3600)

## 📁 R2 Bucket Structure

After deploying multiple versions:

```
thred-static/
├── thred-track-v1.0.0.js       # Version 1.0.0
├── thred-track-v1.0.0.js.map   # Source map
├── thred-track-v1.0.1.js       # Version 1.0.1
├── thred-track-v1.0.1.js.map   # Source map
├── thred-track-v1.1.0.js       # Version 1.1.0
├── thred-track-v1.1.0.js.map   # Source map
├── thred-track.js              # ← Always points to latest version
└── manifest.json               # Deployment metadata
```

## 🚀 How to Deploy

### Quick Deploy
```bash
npm version patch && git push --follow-tags
```

### What Happens
1. Version bumps (e.g., 1.0.1 → 1.0.2)
2. GitHub Actions triggers
3. Builds `dist/thred.umd.js`
4. Deploys to R2:
   - `thred-track-v1.0.2.js` (new versioned file)
   - `thred-track.js` (updated to v1.0.2)
5. Publishes to NPM: `thred-track@1.0.2`

## 📋 Usage Examples

### Production (Versioned)
```html
<!DOCTYPE html>
<html>
<head>
  <!-- Use specific version for production -->
  <script src="https://cdn.thred.dev/thred-track-v1.0.1.js?browserKey=YOUR_KEY"></script>
</head>
<body>
  <form id="form">
    <input name="name" required>
    <input name="email" type="email" required>
    <input name="company">
    <button type="submit">Submit</button>
  </form>
</body>
</html>
```

### Development (Latest)
```html
<!DOCTYPE html>
<html>
<head>
  <!-- Always get latest for development -->
  <script src="https://cdn.thred.dev/thred-track.js?browserKey=YOUR_KEY"></script>
</head>
<body>
  <!-- Your form here -->
</body>
</html>
```

### NPM (Module Import)
```typescript
import { ThredSDK } from 'thred-track';

const thred = new ThredSDK({
  browserKey: 'your-browser-key',
  debug: true,
});

await thred.trackPageView();
```

## 🔄 Version Strategy

### Use Versioned URLs When:
- ✅ In production
- ✅ Need stability
- ✅ Want to control updates
- ✅ Need cache efficiency

### Use Latest URL When:
- ✅ In development
- ✅ Testing new features
- ✅ Want auto-updates
- ✅ Internal tools

## 📊 Deployment Timeline

```
npm version patch
      ↓
git push --follow-tags
      ↓
GitHub Actions triggered (30s)
      ↓
Build dist/thred.umd.js (1-2 min)
      ↓
Upload to R2 (30s)
├── thred-track-v1.0.1.js
└── thred-track.js (updated)
      ↓
Publish to NPM (30s)
      ↓
✅ Done! (~3-4 min total)
```

## 🔍 Verify Deployment

### Check R2
```bash
# Test versioned
curl -I https://cdn.thred.dev/thred-track-v1.0.1.js

# Test latest
curl -I https://cdn.thred.dev/thred-track.js

# Check manifest
curl https://cdn.thred.dev/manifest.json
```

### Check NPM
```bash
npm view thred-track
npm view thred-track@1.0.1
```

### Check GitHub
- Go to **Actions** tab
- Look for green checkmark ✅
- Check **Releases** for new version

## 🎯 Quick Commands

```bash
# Check current version
cat package.json | grep version

# List all versions in R2
aws s3 ls s3://thred-static/ \
  --endpoint-url https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com

# Deploy patch version
npm version patch && git push --follow-tags

# Deploy minor version
npm version minor && git push --follow-tags

# Deploy major version
npm version major && git push --follow-tags
```

## 📞 Support

- **GitHub Issues:** Report bugs
- **NPM:** https://www.npmjs.com/package/thred-track
- **Email:** support@thred.dev
