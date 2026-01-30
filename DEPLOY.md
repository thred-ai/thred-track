# Deployment Guide

This guide explains how to deploy the compiled Thred SDK as a hosted script.

## Quick Deploy

### 1. Build Production Version

```bash
npm run build:prod
```

This creates an optimized, minified single file:
- **File**: `dist/thred-track.umd.js`
- **Size**: ~7.5 KB (minified)
- **Dependencies**: None (standalone)

### 2. Upload to Your CDN/Server

The `dist/thred-track.umd.js` file is completely self-contained. Upload it to any web server or CDN:

#### Option A: Your Own Server

```bash
# SCP to server
scp dist/thred-track.umd.js user@yourserver.com:/var/www/cdn/thred-track.js

# Or rsync
rsync -avz dist/thred-track.umd.js user@yourserver.com:/var/www/cdn/
```

#### Option B: CDN Services

**Cloudflare R2 / S3:**
```bash
aws s3 cp dist/thred-track.umd.js s3://your-bucket/thred-track.js --acl public-read
```

**Vercel:**
```bash
# Add to /public folder
cp dist/thred-track.umd.js public/thred-track.js
vercel --prod
```

**Netlify:**
```bash
# Add to /public folder
cp dist/thred-track.umd.js public/thred-track.js
netlify deploy --prod
```

### 3. Use in Your HTML

```html
<!-- Replace old script with your hosted version -->
<script src="https://cdn.yourdomain.com/thred-track.js?browserKey=YOUR_KEY"></script>
```

That's it! The script will auto-initialize when loaded.

## File Structure

After building, you get:

```
dist/
├── thred-track.umd.js        # ← Single file to deploy (7.5 KB)
├── thred-track.umd.js.map    # Source map (optional, for debugging)
├── index.js            # CommonJS (for npm package)
├── index.esm.js        # ES Module (for bundlers)
└── index.d.ts          # TypeScript definitions
```

**You only need to upload `thred-track.umd.js`** for script tag usage.

## Versioning Strategy

### Option 1: Version in Filename

```bash
# Rename with version
cp dist/thred-track.umd.js dist/thred-track-v1.0.0.js

# Upload
scp dist/thred-track-v1.0.0.js user@server:/var/www/cdn/
```

Usage:
```html
<script src="https://cdn.thred.dev/thred-v1.0.0.js?browserKey=YOUR_KEY"></script>
```

### Option 2: Version in Path

```bash
# Create version directory
mkdir -p dist/v1.0.0
cp dist/thred-track.umd.js dist/v1.0.0/thred-track.js
```

Usage:
```html
<script src="https://cdn.yourdomain.com/v1.0.0/thred-track.js?browserKey=YOUR_KEY"></script>
```

### Option 3: Use "latest" Symlink

On your server:
```bash
# Upload versioned file
scp dist/thred-track.umd.js user@server:/var/www/cdn/thred-track-v1.0.0.js

# Create/update symlink
ssh user@server "ln -sf /var/www/cdn/thred-track-v1.0.0.js /var/www/cdn/thred-track-latest.js"
```

Usage:
```html
<!-- Always get latest version -->
<script src="https://cdn.thred.dev/thred-track-latest.js?browserKey=YOUR_KEY"></script>
```

## Deployment Checklist

- [ ] Run tests: `npm test`
- [ ] Build production: `npm run build:prod`
- [ ] Verify file size: `ls -lh dist/thred-track.umd.js`
- [ ] Test locally: Open `test-compiled.html?utm_source=chatgpt`
- [ ] Upload to server/CDN
- [ ] Update HTML to use new URL
- [ ] Test in production
- [ ] Monitor console for errors

## Cache Headers

When hosting, set appropriate cache headers:

### Nginx
```nginx
location /thred-track.js {
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Access-Control-Allow-Origin "*";
}
```

### Apache
```apache
<FilesMatch "thred\.js$">
    Header set Cache-Control "public, max-age=31536000, immutable"
    Header set Access-Control-Allow-Origin "*"
</FilesMatch>
```

### CloudFlare
- Enable "Cache Everything" page rule
- Set Browser Cache TTL to 1 year
- Enable "Edge Cache TTL"

## Rollback Strategy

Always keep previous versions:

```bash
# On server
/var/www/cdn/
├── thred-track-v1.0.0.js
├── thred-track-v1.0.1.js
├── thred-track-v1.0.2.js
└── thred-track-latest.js -> thred-track-v1.0.2.js
```

To rollback:
```bash
ssh user@server "ln -sf /var/www/cdn/thred-track-v1.0.1.js /var/www/cdn/thred-track-latest.js"
```

## Monitoring

After deployment, monitor:

1. **Browser Console**: Check for JavaScript errors
2. **Network Tab**: Verify script loads (200 status)
3. **API Logs**: Confirm tracking events are received
4. **File Size**: Ensure reasonable bandwidth usage

## Security

### Subresource Integrity (SRI)

Generate SRI hash:
```bash
openssl dgst -sha384 -binary dist/thred-track.umd.js | openssl base64 -A
```

Use in HTML:
```html
<script 
  src="https://cdn.yourdomain.com/thred-track.js?browserKey=YOUR_KEY"
  integrity="sha384-YOUR_HASH_HERE"
  crossorigin="anonymous">
</script>
```

### CORS Headers

Ensure your CDN allows cross-origin requests:
```
Access-Control-Allow-Origin: *
```

## Automated Deployment

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy CDN

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm ci
      - run: npm run build:prod
      
      - name: Deploy to S3
        uses: jakejarvis/s3-sync-action@master
        with:
          args: --acl public-read --follow-symlinks
        env:
          AWS_S3_BUCKET: ${{ secrets.AWS_S3_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          SOURCE_DIR: 'dist'
```

## Testing After Deploy

```bash
# Test script loads
curl -I https://cdn.yourdomain.com/thred-track.js

# Test with browserKey
curl "https://cdn.yourdomain.com/thred-track.js?browserKey=test" | head -n 5

# Check file size
curl -s https://cdn.yourdomain.com/thred-track.js | wc -c
```

## Troubleshooting

### Script doesn't load
- Check CORS headers
- Verify file permissions (644 or public-read)
- Check CDN cache status

### SDK doesn't initialize
- Add `?utm_source=chatgpt` to test URL
- Open browser console for error messages
- Verify browserKey is correct

### Large file size
- Ensure you ran `npm run build:prod` (not just `build`)
- Check if source maps are included (should be separate file)

## Support

For issues or questions:
- GitHub Issues: [your-repo]/issues
- Email: support@thred.dev
