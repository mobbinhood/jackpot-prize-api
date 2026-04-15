# Jackpot Puzzles - Prize Claim API

Backend API for Jackpot Puzzles prize claim system.

## Features

- ✅ NFC code validation
- ✅ Puzzle photo verification (GPT-4 Vision)
- ✅ Prize assignment system
- ✅ Email notifications (TODO)
- ✅ Admin dashboard (TODO)

## Tech Stack

- **Vercel** - Serverless hosting
- **Supabase** - PostgreSQL database
- **OpenAI GPT-4o** - Puzzle verification

## Setup

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the schema:
   ```bash
   # Copy contents of supabase/schema.sql
   # Paste into Supabase SQL Editor and run
   ```
3. Get your credentials:
   - Project URL: `https://YOUR-PROJECT.supabase.co`
   - Anon key: Settings → API → anon public
   - Service key: Settings → API → service_role (keep secret!)

### 2. Vercel Setup

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   npm install
   vercel --prod
   ```

4. Add environment variables in Vercel dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `OPENAI_API_KEY`
   - `ADMIN_KEY` (create a random string for admin auth)

### 3. Connect to Shopify

Update the prize claim page to point to your Vercel API:

```javascript
const res = await fetch('https://your-app.vercel.app/api/claim/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

## API Endpoints

### POST /api/claim/submit
Submit a prize claim.

**Request:**
```json
{
  "nfc_code": "ABC123XYZ",
  "email": "user@example.com",
  "photo": "data:image/jpeg;base64,...",
  "timestamp": "2026-04-15T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "prize": "$25 Starbucks Gift Card",
  "verified": true,
  "claim_id": "uuid"
}
```

### GET /api/claim/status?code=ABC123
Check claim status for a code.

**Response:**
```json
{
  "code": "ABC123",
  "prize": "$25 Gift Card",
  "is_claimed": false,
  "claimed_at": null
}
```

### POST /api/admin/assign-prizes
Bulk assign prizes to NFC codes (admin only).

**Request:**
```json
{
  "codes": ["CODE1", "CODE2", "CODE3"],
  "admin_key": "your-secret-key"
}
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "prizes": [...]
}
```

## Prize Distribution

Edit `api/admin/assign-prizes.js` to customize prize weights:

```javascript
const PRIZE_DISTRIBUTION = [
  { type: 'gift_card', value: '$5 Starbucks', weight: 40 },
  { type: 'jackpot', value: '$10,000', weight: 0.5 },
  // ...
];
```

## Development

Run locally:
```bash
npm run dev
```

Deploy to production:
```bash
npm run deploy
```

## Next Steps

- [ ] Email notification system (SendGrid/Resend)
- [ ] Admin dashboard (view claims, manual verification)
- [ ] Photo storage (Supabase Storage or Cloudinary)
- [ ] Analytics (track claim rates, popular prizes)

## License

MIT
