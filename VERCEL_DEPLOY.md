# Deploy to Vercel - Quick Steps

Your code is on GitHub! Now let's make it live.

## Step 1: Go to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login (use GitHub to sign in - easiest!)

## Step 2: Import Your Project

1. Click **"Add New Project"**
2. Find your **DumpZone** repository
3. Click **"Import"**

## Step 3: Configure (Vercel auto-detects Next.js!)

- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)

**Just click "Deploy" - Vercel handles everything!**

## Step 4: Add Environment Variables (CRITICAL!)

**Before the deployment finishes**, add your environment variables:

1. In your Vercel project, go to **Settings** → **Environment Variables**
2. Add these two:

   **Variable 1:**
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://ojeoecppigvimdfugjsj.supabase.co`
   - Environment: Production, Preview, Development (check all)

   **Variable 2:**
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZW9lY3BwaWd2aW1kZnVnanNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNDYxNzUsImV4cCI6MjA3ODcyMjE3NX0.D6nTvde_Hnn_BgHHK4ADPYYGXlz4_PP2bpDVPRLMVw4`
   - Environment: Production, Preview, Development (check all)

3. Click **Save**

4. Go back to **Deployments** tab
5. Click the **three dots** on the latest deployment → **Redeploy**

## Step 5: Update Supabase Settings

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/ojeoecppigvimdfugjsj
2. Go to **Authentication** → **URL Configuration**
3. Add to **Redirect URLs**:
   - `https://your-project-name.vercel.app/auth/callback`
   - (Replace `your-project-name` with your actual Vercel project name)
4. Set **Site URL**:
   - `https://your-project-name.vercel.app`
5. Click **Save**

## Step 6: Test Your Live Site!

Your site will be live at: `https://your-project-name.vercel.app`

Test:
- ✅ Sign up/Sign in
- ✅ Create a dump
- ✅ Check real-time sync

## 🎉 You're Live!

Every time you push to GitHub, Vercel automatically redeploys your site!

