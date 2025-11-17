# Real-Time Sync Troubleshooting Guide

## What I've Fixed

1. **Prioritized API Route Saves**: The phone now always tries the API route first (server-side Supabase), which is more reliable for triggering real-time events.

2. **Added Polling Fallback**: Even if real-time events are missed, the app will poll every 5 seconds to check for updates. This ensures sync works even if real-time has issues.

3. **Comprehensive Logging**: Added detailed console logs to help diagnose issues.

## Verify Supabase Real-Time Configuration

### Step 1: Check Real-Time is Enabled

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Scroll down to **Realtime** section
5. Make sure **Realtime** is **Enabled**

### Step 2: Verify Tables are in Realtime Publication

1. Go to **Database** → **Publications**
2. Click on `supabase_realtime`
3. Verify that `current_day` table is listed
4. If not, run this SQL in the SQL Editor:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE current_day;
```

### Step 3: Check Row Level Security (RLS)

1. Go to **Database** → **Tables** → `current_day`
2. Click on **Policies**
3. Verify these policies exist:
   - Users can select their own current_day entries
   - Users can insert their own current_day entries
   - Users can update their own current_day entries

If policies are missing, run the SQL from `supabase-schema.sql` again.

### Step 4: Test Real-Time Connection

Open browser console on both devices and look for:
- `✅ Real-time subscription active for current day` - Subscription is working
- `🔔 Raw postgres_changes event` - Events are being received
- `📡 Real-time event received` - Events are being processed

## Debugging Steps

1. **On Phone (when typing)**:
   - Check console for: `✅ API route save successful`
   - This confirms the save is happening

2. **On Laptop (should receive updates)**:
   - Check console for: `🔔 Raw postgres_changes event`
   - If you see this, real-time is working
   - If you don't see this, real-time subscription might not be active

3. **Polling Fallback**:
   - Even if real-time fails, you should see: `🔄 Polling detected remote update`
   - This happens every 5 seconds as a backup

## Common Issues

**Issue**: No real-time events received
- **Solution**: Check if real-time is enabled in Supabase settings
- **Solution**: Verify tables are in the realtime publication
- **Solution**: Check browser console for subscription errors

**Issue**: Events received but not applied
- **Solution**: Check console logs to see why events are being filtered
- **Solution**: Look for `🚫 Ignoring...` messages to understand filtering logic

**Issue**: Only works on hard reload
- **Solution**: This suggests real-time isn't working, but polling should catch it within 5 seconds
- **Solution**: Check if subscription is being set up correctly (look for `🔌 Setting up real-time subscription`)

## Still Not Working?

If sync still doesn't work after checking all of the above:

1. Share the console logs from both devices
2. Check if you see `✅ API route save successful` on phone
3. Check if you see `🔔 Raw postgres_changes event` on laptop
4. Verify both devices are signed in with the same account

