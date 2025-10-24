# GitHub to Builder.io Sync Guide

## Overview

This guide explains how to sync the Drugs.ng WhatsApp Bot project from GitHub to Builder.io and manage updates.

---

## Prerequisites

1. **GitHub Account** with the repository
2. **Builder.io Account** (https://www.builder.io)
3. **Node.js 18+** installed locally
4. **Git** installed locally
5. **Builder.io CLI** (optional, for advanced workflows)

---

## Method 1: Automatic Builder.io Connection (Recommended)

### Step 1: Set Up Builder.io Project

1. Log in to [builder.io](https://www.builder.io)
2. Go to **Projects** → **Create New Project**
3. Select **Custom Repository Integration**
4. Choose **GitHub**

### Step 2: Connect GitHub Repository

1. Click **Connect to GitHub**
2. Authorize Builder.io to access your GitHub account
3. Select the repository: `your-username/drugsng-whatsapp-bot`
4. Select the branch (e.g., `main` or `develop`)

### Step 3: Configure Builder.io Settings

1. Set **Command to start dev server**:

   ```
   npm run dev
   ```

2. Set **Server URL**:

   ```
   http://localhost:3000
   ```

3. Set **Environment Variables** in Builder.io dashboard:

   - Add all required `.env` variables
   - Keep sensitive keys secure
   - Use Environment Secrets for API keys

4. Click **Save**

### Step 4: Test the Connection

1. Builder.io will run: `npm install` + `npm run dev`
2. Wait for "Server started successfully" message
3. Build in Builder.io will now connect to your local dev server

---

## Method 2: Manual Sync Workflow

### For Local Development → Builder.io

#### Step 1: Prepare Code Changes

```bash
# Make sure on correct branch
git checkout main

# Create feature branch
git checkout -b feature/your-feature

# Make your changes
# Update code as needed

# Install dependencies if needed
npm install

# Test locally
npm run dev
```

#### Step 2: Commit and Push to GitHub

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add feature description"

# Push to GitHub
git push origin feature/your-feature
```

#### Step 3: Create Pull Request (Optional)

```
1. Go to GitHub repository
2. Click "Compare & pull request"
3. Review changes
4. Click "Create pull request"
5. Wait for code review
6. Merge to main branch
```

#### Step 4: Pull Latest in Builder.io

1. Open Builder.io Dashboard
2. Go to **Project Settings** → **Repository**
3. Click **Sync from GitHub** or **Pull Latest**
4. Wait for deployment

---

## Method 3: Builder.io CLI Integration

### Installation

```bash
npm install -g @builder.io/cli
```

### Authentication

```bash
builder auth
# Follow prompts to authenticate with Builder.io
```

### Deploy to Builder.io

```bash
# Push current state to Builder.io
builder deploy

# Or sync specific folder
builder sync --path ./services
```

### Pull from Builder.io

```bash
builder pull
```

---

## Typical Workflow

### 1. Local Development

```bash
# Start with latest code
git pull origin main

# Install dependencies
npm install

# Start dev server (Builder.io watches this)
npm run dev
```

### 2. Make Changes

```bash
# Edit files as needed
# nodemon automatically reloads
```

### 3. Test in Builder.io

1. Open Builder.io Editor
2. Your changes appear in real-time
3. Preview/test features
4. Make further adjustments if needed

### 4. Commit Changes

```bash
git add .
git commit -m "feat: description of changes"
git push origin feature/your-feature
```

### 5. Merge to Main

```bash
# On GitHub, create and merge Pull Request
# Or merge locally:
git checkout main
git pull origin main
git merge feature/your-feature
git push origin main
```

### 6. Deploy to Production

```bash
# On production server
git pull origin main
npm install
npm run migrate-db  # if needed
npm start           # start production server
```

---

## Environment Variables in Builder.io

### Setting Up Secrets

1. **Go to Project Settings** → **Environment Variables**
2. **Add Variable** for each required env var
3. Choose **Secret** for sensitive values (API keys, tokens)

### Required Variables in Builder.io

```
NODE_ENV=production
PORT=10000
DATABASE_URL=<your-neon-postgres-url>
WHATSAPP_ACCESS_TOKEN=<your-token>
WHATSAPP_PHONE_NUMBER_ID=<your-id>
WHATSAPP_VERIFY_TOKEN=<your-verify-token>
ENCRYPTION_KEY=<your-encryption-key>
FLUTTERWAVE_SECRET_KEY=<your-key>
PAYSTACK_SECRET_KEY=<your-key>
```

---

## Syncing Strategy

### Option A: Development Branch

```
main (stable) → develop (staging) → feature branches
```

**Workflow:**

1. Create feature branch from `develop`
2. Test in Builder.io with `develop` branch
3. Create PR to `develop`
4. After testing, create PR from `develop` to `main`

### Option B: Direct to Main

```
main (production)
```

**Workflow:**

1. Create feature branch from `main`
2. Test in Builder.io with feature branch
3. Once ready, merge directly to `main`
4. Builder.io auto-deploys

---

## Handling Merge Conflicts

If you have conflicts during sync:

```bash
# Get latest from GitHub
git fetch origin

# Check what's different
git diff main origin/main

# Resolve conflicts manually
# Then:
git add .
git commit -m "resolve: merge conflicts"
git push origin your-branch

# Or abort merge if you want to rethink
git merge --abort
```

---

## Rollback Procedure

### If Something Breaks in Production

```bash
# On production server
git log --oneline  # See recent commits

# Revert to previous version
git revert <commit-hash>
# OR
git reset --hard <previous-commit-hash>

# Restart server
npm start

# Or if using Builder.io, click "Rollback" in dashboard
```

---

## Continuous Integration/Deployment (CI/CD)

### GitHub Actions Workflow (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: "18"

      - run: npm install
      - run: npm run setup

      - name: Notify Builder.io
        run: |
          curl -X POST https://api.builder.io/v2/deploy \
            -H "Authorization: Bearer ${{ secrets.BUILDER_API_KEY }}" \
            -H "Content-Type: application/json"
```

---

## Troubleshooting

### Issue: Builder.io can't connect to local server

**Solution:**

1. Check if dev server is running: `npm run dev`
2. Verify PORT in .env matches Builder.io config
3. Check firewall isn't blocking connections
4. Restart dev server

### Issue: Changes not appearing in Builder.io

**Solution:**

1. Restart dev server (Ctrl+C, then `npm run dev`)
2. Clear Builder.io cache: Ctrl+Shift+Delete
3. Force sync from GitHub: Project Settings → Sync

### Issue: Merge conflicts in package-lock.json

**Solution:**

```bash
# Rebuild lock file
rm package-lock.json
npm install
git add package-lock.json
git commit -m "fix: rebuild package-lock.json"
```

### Issue: Node version mismatch between local and Builder.io

**Solution:**

```bash
# Ensure same version locally
nvm use  # Uses .nvmrc

# Verify
node --version

# In Builder.io, set Node version to 18.x in Project Settings
```

---

## Best Practices

✅ **DO:**

- Test locally before pushing
- Use descriptive commit messages
- Keep branches up-to-date with main
- Use `.env.example` for required vars
- Run `npm install` after pulling changes
- Test webhooks with ngrok locally

❌ **DON'T:**

- Commit `.env` file to Git
- Force push to main branch
- Deploy without testing
- Mix feature changes with bug fixes
- Leave long-running dev servers idle

---

## Quick Commands Reference

```bash
# Local Development
npm run dev              # Start with hot reload
npm run dev:no-watch    # Start without watch
npm run setup           # Initialize database
npm run migrate-db      # Run migrations

# Git Operations
git pull origin main    # Get latest code
git push origin branch  # Push to GitHub
git merge develop       # Merge branch
git status             # Check changes

# Builder.io
builder auth           # Authenticate CLI
builder deploy         # Deploy changes
builder pull           # Pull from Builder.io
builder sync           # Sync files
```

---

## Support

For issues with:

- **GitHub**: See GitHub Docs
- **Builder.io**: Visit https://builder.io/support
- **Node/npm**: See Node.js Docs
- **This Project**: Create issue in GitHub repository
