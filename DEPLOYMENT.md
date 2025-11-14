# Deployment Guide for Dumpzone

## Option 1: Vercel (Recommended - Easiest for Next.js)

Vercel is made by the creators of Next.js and offers the easiest deployment experience.

### Step 1: Prepare Your Code

1. Make sure your code is committed to Git:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   ```

2. Push to GitHub (if not already):
   ```bash
   git remote add origin your-github-repo-url
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login (free account)

2. Click **"Add New Project"**

3. Import your GitHub repository (or connect GitHub if first time)

4. Vercel will auto-detect Next.js settings - just click **"Deploy"**

5. **IMPORTANT**: Before deployment completes, add your environment variables:
   - Go to **Settings** → **Environment Variables**
   - Add:
     - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   - Click **Save**

6. Your site will be live at `your-project-name.vercel.app`!

### Step 3: Update Supabase for Production

1. Go to your Supabase dashboard
2. Go to **Authentication** → **URL Configuration**
3. Add your Vercel URL to **Redirect URLs**:
   - `https://your-project-name.vercel.app/auth/callback`
4. Add your Vercel URL to **Site URL**:
   - `https://your-project-name.vercel.app`

### Step 4: Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS setup instructions

---

## Option 2: Netlify

### Step 1: Prepare Build Settings

Create `netlify.toml` in your project root:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### Step 2: Deploy

1. Go to [netlify.com](https://netlify.com) and sign up
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your GitHub repo
4. Set build command: `npm run build`
5. Set publish directory: `.next`
6. Add environment variables (same as Vercel)
7. Deploy!

---

## Option 3: Railway

1. Go to [railway.app](https://railway.app)
2. Create new project from GitHub repo
3. Add environment variables
4. Deploy!

---

## Environment Variables Needed

Make sure these are set in your hosting platform:

```
NEXT_PUBLIC_SUPABASE_URL=https://ojeoecppigvimdfugjsj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**Note**: Never commit `.env.local` to Git - it's already in `.gitignore`

---

## Post-Deployment Checklist

- [ ] Environment variables set in hosting platform
- [ ] Supabase redirect URLs updated
- [ ] Test sign up/login flow
- [ ] Test real-time sync
- [ ] Test on mobile device
- [ ] Set up custom domain (optional)

---

## Troubleshooting

**"Invalid API key" error:**
- Make sure environment variables are set correctly
- Redeploy after adding environment variables

**Auth not working:**
- Check Supabase redirect URLs are set correctly
- Make sure callback URL matches your domain

**Build fails:**
- Check build logs in hosting platform
- Make sure all dependencies are in `package.json`
- Try `npm run build` locally first

---

## Quick Deploy Commands

If you have Vercel CLI installed:
```bash
npm i -g vercel
vercel
```

This will guide you through deployment interactively!

