# Builder.io Configuration Guide

## Overview

This document provides detailed configuration for running the Drugs.ng WhatsApp Bot in Builder.io environment.

---

## builder.config.json Setup

The project includes `builder.config.json` with the following configuration:

```json
{
  "command": "npm run dev",
  "serverUrl": "https://localhost:10000",
  "authenticateProxy": false,
  "commitMode": "commits"
}
```

### Configuration Explained

| Setting             | Value                     | Purpose                                     |
| ------------------- | ------------------------- | ------------------------------------------- |
| `command`           | `npm run dev`             | Command to start dev server with hot reload |
| `serverUrl`         | `https://localhost:10000` | Local server URL for Builder.io to connect  |
| `authenticateProxy` | `false`                   | No proxy authentication needed              |
| `commitMode`        | `commits`                 | Changes are committed to git                |

---

## Initial Setup in Builder.io

### Step 1: Create Project

1. Log in to [builder.io](https://www.builder.io)
2. Click **New Project**
3. Select **Framework**: Custom/Node.js
4. Give it a name: `Drugs.ng WhatsApp Bot`

### Step 2: Connect GitHub Repository

1. Go to **Project Settings**
2. Click **Connect Repository**
3. Select **GitHub**
4. Authorize Builder.io
5. Choose your repository
6. Select branch (e.g., `main`)

### Step 3: Configure Dev Server

1. In **Project Settings**, find **Dev Server**
2. Ensure settings match `builder.config.json`:
   - **Start Command**: `npm run dev`
   - **Server Port**: `10000`
   - **Node Version**: `18.x` or `18.19.0`

### Step 4: Set Environment Variables

In **Project Settings** → **Environment Variables**:

```
NODE_ENV=development
PORT=10000
DATABASE_URL=postgresql://...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...
ENCRYPTION_KEY=...
```

**Important**: Use **Secrets** for sensitive values (API keys, tokens, URLs)

### Step 5: Configure Allowed Hosts

If Builder.io warns about CORS:

1. In index.js, add CORS middleware (if needed):

```javascript
const cors = require("cors");
app.use(
  cors({
    origin: ["https://builder.io", "http://localhost:3000"],
    credentials: true,
  })
);
```

2. Or configure in Builder.io: **Project Settings** → **API Configuration**

---

## Port Configuration

### For Local Development

In `.env`:

```env
PORT=3000
NODE_ENV=development
```

Start: `npm run dev`

### For Builder.io Development

In `.env`:

```env
PORT=10000
NODE_ENV=development
```

Start: `npm run dev`

### For Production (Vercel)

No specific port needed - Vercel manages this. See `vercel.json`.

---

## Database Configuration for Builder.io

### Option 1: Neon PostgreSQL (Recommended)

In `builder.config.json` environment:

```env
DATABASE_URL=postgresql://neondb_owner:password@host:pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
```

### Option 2: Local PostgreSQL (for local development only)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/drugsng_bot
```

---

## Important Files for Builder.io

Make sure these files are in your repository:

```
.
├── builder.config.json          ← Builder.io configuration
├── .nvmrc                        ← Node version (18.19.0)
├── .env.example                  ← Environment variables template
├── package.json                  ← Scripts and dependencies
├── index.js                      ← Main application
├── config/
│   ├── database.js
│   ├── whatsapp.js
│   └── env.js
├── models/
├── services/
└── utils/
```

---

## Troubleshooting Builder.io Connection

### Problem: "Failed to connect to dev server"

**Solution:**

1. Check if dev server is running on port 10000
2. Verify NODE_ENV=development in .env
3. Check firewall isn't blocking port 10000
4. Try restarting: Stop server → `npm run dev`

### Problem: "Cannot find module"

**Solution:**

```bash
# In terminal:
npm install

# Then restart dev server:
npm run dev
```

### Problem: "Environment variable not found"

**Solution:**

1. Check `.env` has all required variables
2. Verify environment variables in Builder.io Project Settings
3. Restart dev server after adding variables
4. Check variable names match exactly (case-sensitive)

### Problem: "Port 10000 already in use"

**Solution:**

```bash
# Kill process using port 10000
# macOS/Linux:
lsof -ti:10000 | xargs kill -9

# Windows:
netstat -ano | findstr :10000
taskkill /PID <PID> /F

# Then restart:
npm run dev
```

### Problem: "Node version mismatch"

**Solution:**

```bash
# Locally
nvm use          # Uses .nvmrc (v18.19.0)
node --version   # Should be v18.19.0

# In Builder.io
# Settings → Node Version → Select 18.x
```

---

## Advanced Configuration

### Custom Build Script

If you need custom build steps, modify package.json:

```json
{
  "scripts": {
    "dev": "npm run setup && nodemon --exec node index.js",
    "setup": "node setup.js && node scripts/migrate-session-columns.js"
  }
}
```

Then in builder.config.json:

```json
{
  "command": "npm run dev"
}
```

### Multiple Environments

Create environment-specific builders:

- `builder.config.development.json` - Development
- `builder.config.staging.json` - Staging
- `builder.config.production.json` - Production

---

## Security Considerations

### Secrets Management

✅ **DO:**

- Use **Secrets** for API keys and tokens
- Never commit `.env` to Git
- Rotate API keys regularly
- Use different keys for different environments

❌ **DON'T:**

- Put secrets in public repositories
- Share `.env` files
- Log sensitive information
- Use production credentials in development

### CORS Configuration

If Builder.io editor doesn't load:

```javascript
// In index.js
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (
    origin &&
    (origin.includes("builder.io") || origin.includes("localhost"))
  ) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type");
  }
  next();
});
```

---

## Development Workflow in Builder.io

### 1. Start Dev Server

```bash
npm run dev
```

Expected output:

```
✓ Environment configuration validated successfully
Drugs.ng WhatsApp Bot server running on port 10000
Webhook endpoint: http://localhost:10000/webhook
PostgreSQL connection established successfully.
Database initialized successfully.
```

### 2. Connect from Builder.io

1. In Builder.io, go to your project
2. Click **Edit**
3. Builder.io discovers local server on port 10000
4. Begin editing your flow/components

### 3. Make Code Changes

Edit files while Builder.io is running:

- nodemon automatically reloads
- Changes appear instantly in Builder.io
- No need to restart dev server

### 4. Commit Changes

```bash
git add .
git commit -m "update: description"
git push origin branch
```

### 5. Create Pull Request (GitHub)

1. Go to GitHub repository
2. Create Pull Request
3. After review, merge to main

---

## Monitoring and Logs

### View Console Logs

In terminal running `npm run dev`:

```
[timestamp] [level] message
```

Levels:

- ✓ Info/Success
- ⚠️ Warning
- ❌ Error

### Enable Debug Mode

```bash
DEBUG=* npm run dev    # Verbose output
```

### Check Server Status

```bash
# Health check endpoint
curl http://localhost:10000/

# Should return:
{
  "status": "ok",
  "message": "Drugs.ng WhatsApp Bot API Server Running"
}
```

---

## Deployment from Builder.io

### To Staging

1. In Builder.io: **Deploy** → **Staging**
2. Code merges to `develop` branch
3. Staging server deploys automatically

### To Production

1. In Builder.io: **Deploy** → **Production**
2. Code merges to `main` branch
3. Vercel auto-deploys (if configured)
4. WhatsApp webhook receives notifications

---

## Quick Reference

```bash
# Development
npm run dev              # Start with hot reload on port 10000

# Without Builder.io
npm run dev:no-watch   # Start without hot reload

# Setup
npm install            # Install dependencies
npm run setup          # Initialize database
npm run migrate-db     # Run migrations

# Testing
npm test               # Run tests (not configured yet)

# Logs
npm run dev 2>&1 | tee dev.log  # Save logs
```

---

## Additional Resources

- [Builder.io Documentation](https://www.builder.io/docs)
- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Express.js Guide](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

For more help, see:

- `DEVELOPMENT_SETUP.md` - Local development guide
- `GITHUB_BUILDERIO_SYNC.md` - GitHub sync guide
- `README.md` - Project overview
