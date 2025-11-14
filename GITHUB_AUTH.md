# GitHub Authentication Setup

GitHub no longer accepts passwords for Git operations. You need to use a Personal Access Token (PAT).

## Quick Fix: Use Personal Access Token

### Step 1: Create a Personal Access Token

1. Go to GitHub.com and sign in
2. Click your profile picture → **Settings**
3. Scroll down to **Developer settings** (bottom left)
4. Click **Personal access tokens** → **Tokens (classic)**
5. Click **Generate new token** → **Generate new token (classic)**
6. Give it a name like "Dumpzone Project"
7. Select scopes:
   - ✅ **repo** (full control of private repositories)
8. Click **Generate token**
9. **COPY THE TOKEN IMMEDIATELY** - you won't see it again!

### Step 2: Use the Token Instead of Password

When Git asks for your password, paste the token instead.

Or update your remote URL to include the token:

```bash
git remote set-url origin https://YOUR_TOKEN@github.com/mjs317/DumpZone.git
```

Replace `YOUR_TOKEN` with your actual token.

---

## Alternative: Use SSH (More Secure)

### Step 1: Generate SSH Key

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

Press Enter to accept default location. You can set a passphrase or leave it empty.

### Step 2: Add SSH Key to GitHub

1. Copy your public key:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

2. Go to GitHub → Settings → SSH and GPG keys
3. Click **New SSH key**
4. Paste your key and save

### Step 3: Change Remote URL to SSH

```bash
git remote set-url origin git@github.com:mjs317/DumpZone.git
```

Then push:
```bash
git push -u origin main
```

---

## Quickest Solution Right Now

1. Create token (see Step 1 above)
2. Run this command (replace YOUR_TOKEN):
   ```bash
   git remote set-url origin https://YOUR_TOKEN@github.com/mjs317/DumpZone.git
   ```
3. Then push:
   ```bash
   git push -u origin main
   ```

No password prompt needed!

