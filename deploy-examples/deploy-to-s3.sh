#!/bin/bash
# Deploy Thred SDK to AWS S3

set -e

echo "🏗️  Building production version..."
npm run build:prod

echo "📦 Uploading to S3..."
aws s3 cp dist/thred-track.umd.js s3://your-bucket/thred-track.js \
  --acl public-read \
  --cache-control "public, max-age=31536000" \
  --content-type "application/javascript"

echo "✅ Deployed to: https://your-bucket.s3.amazonaws.com/thred-track.js"
echo ""
echo "Usage in HTML:"
echo '<script src="https://your-bucket.s3.amazonaws.com/thred-track.js?browserKey=YOUR_KEY"></script>'
