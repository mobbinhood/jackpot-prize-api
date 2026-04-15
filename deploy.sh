#!/bin/bash

echo "🚀 Deploying Jackpot Prize API to Vercel..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Deploy to Vercel
echo "🌐 Deploying to production..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Add environment variables in Vercel dashboard"
echo "2. Run Supabase schema (supabase/schema.sql)"
echo "3. Update Shopify claim page with your Vercel URL"
