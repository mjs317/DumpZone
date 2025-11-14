# Supabase Setup Guide for Dumpzone

This guide will help you set up Supabase for real-time cross-platform sync.

## Step 1: Create a Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

## Step 3: Set Up Environment Variables

1. Create a `.env.local` file in the root of your project (if it doesn't exist)
2. Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace `your_project_url_here` and `your_anon_key_here` with the values from Step 2.

## Step 4: Create the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `supabase-schema.sql` into the editor
4. Click **Run** to execute the SQL

This will create:
- `current_day` table for storing today's dump
- `dump_entries` table for storing history
- Row Level Security (RLS) policies to keep data private
- Real-time subscriptions enabled

## Step 5: Enable Email Authentication (Optional)

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Enable **Email** provider
3. Configure email templates if desired

## Step 6: Test the Setup

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Click "Sign In" in the top right
4. Create an account or sign in
5. Start typing - your data should sync in real-time!

## How It Works

- **Without Sign In**: App works locally using localStorage (device-specific)
- **With Sign In**: Data syncs in real-time across all your devices via Supabase
- **Real-time Sync**: Changes on one device appear instantly on all other devices
- **Privacy**: Each user's data is isolated using Row Level Security

## Troubleshooting

### "Invalid API key" error
- Make sure your `.env.local` file has the correct keys
- Restart your dev server after changing `.env.local`

### Real-time not working
- Make sure you ran the SQL schema in Step 4
- Check that real-time is enabled in Supabase dashboard (Settings → API → Realtime)

### Can't sign in
- Check that Email provider is enabled in Authentication → Providers
- Make sure you confirmed your email (check spam folder)

## Next Steps

Once set up, your app will:
- ✅ Sync data across iPhone, MacBook, Windows, and any device
- ✅ Update in real-time as you type
- ✅ Keep your data secure and private
- ✅ Work offline and sync when online

Enjoy seamless cross-platform dumping! 🗑️

