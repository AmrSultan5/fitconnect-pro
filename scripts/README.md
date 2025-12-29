# Seed Script

## ⚠️ DEVELOPMENT ONLY

This seed script is for **development and demo purposes only**. Do NOT run in production.

## Prerequisites

1. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```

2. Install `tsx` if not already installed:
   ```bash
   npm install -D tsx
   ```

## Usage

Run the seed script with your Supabase credentials:

```bash
SUPABASE_URL=your_supabase_url SUPABASE_SERVICE_ROLE_KEY=your_service_role_key npm run seed
```

Or with bun:

```bash
SUPABASE_URL=your_supabase_url SUPABASE_SERVICE_ROLE_KEY=your_service_role_key bun run seed
```

## What It Creates

- **1 Admin user**: `admin@fitconnect.demo` / `demo123456`
- **1 Approved Coach**: `coach@fitconnect.demo` / `demo123456`
  - Full coach profile with bio, specialties, experience
- **1 Client**: `client@fitconnect.demo` / `demo123456`
  - Full client profile with age, height, weight, goal
- **Coach-Client Assignment**: Coach assigned to client
- **14+ Attendance Records**: Mix of trained/rest/missed across current month
- **1 Structured Workout Plan**: 5-day program with exercises
- **1 Structured Diet Plan**: 4 meals per day with foods
- **3 Coach Notes**: Private notes about the client

## Getting Your Service Role Key

1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the `service_role` key (NOT the `anon` key)
4. Use it as `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **WARNING**: The service role key bypasses RLS. Keep it secret and never commit it to version control.

## Notes

- The script uses `upsert` operations, so it's safe to run multiple times
- Existing users will be reused if they already exist
- All data is marked as active and ready for demo use

