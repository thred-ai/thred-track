# Cloudflare R2 Deployment Fix

## ❌ The Problem

GitHub Actions was failing with:
```
Error: getaddrinfo ENOTFOUND sts.auto.amazonaws.com
```

## 🔍 Why This Happened

The workflow was using `aws-actions/configure-aws-credentials@v4` which:
1. Tries to authenticate with AWS STS (Security Token Service)
2. Connects to `sts.auto.amazonaws.com` 
3. **But we're using Cloudflare R2, not AWS S3!**

Cloudflare R2 uses S3-compatible API but doesn't need AWS STS authentication.

## ✅ The Fix

Changed from using the AWS configure action to directly setting environment variables:

### Before (❌ Causes AWS connection)
```yaml
- name: Configure AWS CLI for R2
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.R2_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.R2_SECRET_ACCESS_KEY }}
    aws-region: auto

- name: Deploy to Cloudflare R2
  env:
    R2_ENDPOINT: ${{ secrets.R2_ENDPOINT }}
  run: |
    aws s3 cp ...
```

### After (✅ Direct to R2)
```yaml
- name: Deploy to Cloudflare R2
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
    R2_ENDPOINT: ${{ secrets.R2_ENDPOINT }}
  run: |
    aws s3 cp ... --endpoint-url $R2_ENDPOINT
```

## 📝 What Changed

1. ✅ Removed `aws-actions/configure-aws-credentials` action
2. ✅ Set credentials directly as environment variables
3. ✅ AWS CLI now talks directly to R2 endpoint (no STS)

## 🚀 Now It Works

The `aws` CLI will:
- Use the R2 credentials from environment variables
- Connect directly to `--endpoint-url $R2_ENDPOINT`
- Skip AWS STS authentication completely
- Deploy straight to Cloudflare R2

## 🔐 Required Secrets (Unchanged)

You still need these GitHub secrets:
- `R2_ACCESS_KEY_ID` - Your Cloudflare R2 access key
- `R2_SECRET_ACCESS_KEY` - Your Cloudflare R2 secret key
- `R2_ENDPOINT` - Your R2 endpoint URL (e.g., `https://abc123.r2.cloudflarestorage.com`)
- `NPM_TOKEN` - Your NPM automation token

## ✅ Ready to Deploy

Now you can deploy without AWS errors:

```bash
npm version patch && git push --follow-tags
```

GitHub Actions will deploy directly to Cloudflare R2! 🎉
