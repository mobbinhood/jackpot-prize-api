# Quick Setup Guide

## Step 1: Push to GitHub

```bash
cd ~/.openclaw/workspace/jackpot-prize-api

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR-USERNAME/jackpot-prize-api.git
git push -u origin main
```

## Step 2: Supabase Setup (5 minutes)

1. Go to [supabase.com](https://supabase.com) and create account
2. Click "New Project"
   - Name: `jackpot-puzzles`
   - Database Password: (save this!)
   - Region: Choose closest to you
3. Wait for project to provision (~2 minutes)
4. Go to **SQL Editor** (left sidebar)
5. Click "New query"
6. Copy contents of `supabase/schema.sql` and paste
7. Click "Run" (bottom right)
8. Go to **Settings → API**
   - Copy **Project URL** 
   - Copy **anon public** key
   - Copy **service_role** key (⚠️ keep secret!)

## Step 3: Vercel Setup (5 minutes)

### Option A: Deploy via CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd ~/.openclaw/workspace/jackpot-prize-api
npm install
vercel --prod
```

### Option B: Deploy via GitHub (easier!)

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repo
4. Click "Deploy"

### Add Environment Variables

In Vercel dashboard → Settings → Environment Variables:

| Variable | Value | Where to get it |
|----------|-------|-----------------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | `eyJxxx...` | Supabase → Settings → API (anon public) |
| `SUPABASE_SERVICE_KEY` | `eyJxxx...` | Supabase → Settings → API (service_role) |
| `OPENAI_API_KEY` | `sk-proj-xxx` | Your OpenAI key |
| `ADMIN_KEY` | `random-secret-123` | Make up a random string |

Click "Deploy" after adding variables.

## Step 4: Update Shopify Claim Page

Once deployed, Vercel will give you a URL like:
`https://jackpot-prize-api.vercel.app`

Update the Shopify page:

```javascript
// In templates/page.prize-claim.liquid
// Find this line:
const res = await fetch('/apps/prize-claim/submit', {

// Replace with:
const res = await fetch('https://YOUR-APP.vercel.app/api/claim/submit', {
```

## Step 5: Test It!

1. Generate a test code:
   ```bash
   curl -X POST https://YOUR-APP.vercel.app/api/admin/assign-prizes \
     -H "Content-Type: application/json" \
     -d '{
       "codes": ["TEST123"],
       "admin_key": "your-admin-key"
     }'
   ```

2. Visit: `https://jackpotpuzzles.com/pages/claim-prize?code=TEST123`

3. Fill out form, take photo, submit

4. Check Supabase → Table Editor → `prize_claims` to see the entry!

## Troubleshooting

### "Invalid prize code"
- Make sure code exists in Supabase `nfc_codes` table
- Check Vercel logs for errors

### "Camera access denied"
- Must be HTTPS (Vercel provides this automatically)
- Check browser permissions

### "Failed to submit"
- Check Vercel logs (Dashboard → Logs)
- Verify all environment variables are set
- Make sure Supabase schema was run

## Next: Bulk Code Generation

To generate 1000 codes at once:

```bash
# Generate codes
node -e "console.log(Array.from({length:1000}, (_,i) => 'JP-' + (i+1).toString().padStart(5,'0')).join('\\n'))" > codes.txt

# Assign prizes (requires jq)
cat codes.txt | jq -R -s -c 'split("\n") | map(select(length > 0))' | \
  curl -X POST https://YOUR-APP.vercel.app/api/admin/assign-prizes \
    -H "Content-Type: application/json" \
    -d @- \
    -d '{"admin_key": "your-admin-key"}'
```

## Done! 🎉

Your prize claim system is live. Start programming NFC chips with:
`https://jackpotpuzzles.com/pages/claim-prize?code=UNIQUE-CODE`
