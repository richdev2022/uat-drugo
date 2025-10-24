# Development Setup Guide

## Prerequisites

### Node.js Version

This project requires **Node.js ≥ 16** (recommended **Node.js 18.19.0+**)

**Check your Node version:**

```bash
node --version
```

**Should output:** `v18.19.0` or higher

### Node Version Manager (Recommended)

#### Using nvm (Node Version Manager)

```bash
# Install nvm if you don't have it
# macOS/Linux: https://github.com/nvm-sh/nvm
# Windows: https://github.com/coreybutler/nvm-windows

# Switch to the correct Node version
nvm use

# If the version isn't installed, install it first
nvm install 18.19.0
```

#### Using fnm (Fast Node Manager)

```bash
fnm use --cwd
```

The project includes a `.nvmrc` file that specifies Node v18.19.0

---

## Installation Steps

### 1. Clone or Pull from GitHub

```bash
git clone https://github.com/your-repo/drugsng-whatsapp-bot.git
cd drugsng-whatsapp-bot
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including nodemon for development with hot-reload.

### 3. Configure Environment Variables

#### Option A: Using the example file

```bash
# Copy the example env file
cp .env.example .env

# Edit with your actual values
nano .env  # or use your preferred editor
```

#### Option B: Generate env file

```bash
npm run generate-env
```

#### Required Environment Variables

Create `.env` with these minimum values:

```env
NODE_ENV=development
PORT=3000

# WhatsApp Configuration
WHATSAPP_ACCESS_TOKEN=your_token_here
WHATSAPP_PHONE_NUMBER_ID=your_id_here
WHATSAPP_VERIFY_TOKEN=your_verify_token_here

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# Encryption (minimum 16 characters)
ENCRYPTION_KEY=your_32_char_encryption_key_here

# Optional: Payment Gateways
FLUTTERWAVE_PUBLIC_KEY=your_key_here
FLUTTERWAVE_SECRET_KEY=your_key_here
PAYSTACK_SECRET_KEY=your_key_here

# Voice Processing (optional)
VOICE_PROVIDER=whisper
OPENAI_API_KEY=sk-proj-your_key_here
```

### 4. Initialize Database (Optional for local development)

```bash
# Run setup script
npm run setup

# Or run migrations
npm run migrate-db
```

---

## Starting the Development Server

### Option 1: With Hot Reload (Recommended)

```bash
npm run dev
```

This uses **nodemon** to automatically restart the server when you make code changes.

**Output:**

```
✓ Environment configuration validated successfully
Drugs.ng WhatsApp Bot server running on port 3000
Webhook endpoint: http://localhost:3000/webhook
PostgreSQL connection established successfully.
Database initialized successfully.
```

### Option 2: Without Hot Reload

```bash
npm run dev:no-watch
```

Or:

```bash
npm start
```

---

## Troubleshooting

### Issue: "Node version not supported"

**Solution:**

```bash
# Check Node version
node --version

# If < 16, upgrade:
nvm install 18.19.0
nvm use 18.19.0

# Verify
node --version  # Should be v18.19.0
```

### Issue: "Cannot find module 'nodemon'"

**Solution:**

```bash
npm install --save-dev nodemon
```

Or reinstall all dependencies:

```bash
rm -rf node_modules
npm install
```

### Issue: "Port 3000 already in use"

**Solution:**

```bash
# Use a different port
PORT=3001 npm run dev

# Or kill the process using port 3000
# macOS/Linux:
lsof -ti:3000 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Issue: "Cannot connect to database"

**Solution:**

```bash
# Verify DATABASE_URL in .env
# Try with individual DB variables:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=drugsng_bot
DB_USER=postgres
DB_PASSWORD=your_password

# Test connection
npm run setup
```

### Issue: "Environment validation failed"

**Solution:**
Check .env file for:

1. Missing required variables
2. ENCRYPTION_KEY less than 16 characters
3. Invalid PORT or DB_PORT (must be numbers)

Run in verbose mode:

```bash
NODE_ENV=development npm run dev
```

---

## API Documentation

Once the server is running, access API documentation at:

- **Swagger UI**: http://localhost:3000/api/docs
- **OpenAPI JSON**: http://localhost:3000/api/docs/swagger.json
- **Postman Collection**: http://localhost:3000/api/docs/postman

---

## Development Tips

### 1. Viewing Logs

Logs are printed to console. For persistent logging:

```bash
npm run dev > dev.log 2>&1 &
tail -f dev.log
```

### 2. Testing Webhooks Locally

Use ngrok to expose local server:

```bash
# Install ngrok: https://ngrok.com/download

ngrok http 3000

# Your webhook URL becomes:
# https://your-ngrok-id.ngrok.io/webhook
```

### 3. Database Management

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d drugsng_bot

# View tables
\dt

# Exit
\q
```

### 4. Hot Reload Not Working?

Restart nodemon:

```bash
# Press Ctrl+C to stop the server
# Then run:
npm run dev
```

---

## Builder.io Integration

### For Builder.io Development Server

The `builder.config.json` is configured to run:

```json
{
  "command": "npm run dev",
  "serverUrl": "https://localhost:10000"
}
```

**To start with Builder.io:**

1. Set PORT in .env:

```env
PORT=10000
NODE_ENV=development
```

2. Start dev server:

```bash
npm run dev
```

3. Builder.io will connect to http://localhost:10000

---

## Next Steps

- Review `.env.example` for all available configuration options
- Check API endpoints at `/api/docs`
- Run tests: `npm test` (not yet implemented)
- Deploy to production with `npm start`

For production deployment, see: [DEPLOYMENT.md](./DEPLOYMENT.md)
