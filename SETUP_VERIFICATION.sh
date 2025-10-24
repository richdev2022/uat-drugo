#!/bin/bash

# Drugs.ng WhatsApp Bot - Setup Verification Script
# This script verifies that all configurations are correct

echo "🔍 Verifying Drugs.ng WhatsApp Bot Setup..."
echo "=============================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for issues
ISSUES=0

# 1. Check Node.js version
echo "1️⃣  Checking Node.js version..."
NODE_VERSION=$(node -v)
MIN_VERSION="v16.0.0"
if command -v node &> /dev/null; then
    echo -e "${GREEN}✓${NC} Node.js installed: $NODE_VERSION"
    # Simple version check (v18+ is recommended)
    if [[ $NODE_VERSION == v18* ]] || [[ $NODE_VERSION == v19* ]] || [[ $NODE_VERSION == v20* ]]; then
        echo -e "${GREEN}✓${NC} Recommended version (18+)"
    elif [[ $NODE_VERSION == v16* ]] || [[ $NODE_VERSION == v17* ]]; then
        echo -e "${YELLOW}⚠${NC} Minimum version met, but 18+ recommended"
    fi
else
    echo -e "${RED}✗${NC} Node.js not found. Install from https://nodejs.org/"
    ISSUES=$((ISSUES+1))
fi
echo ""

# 2. Check npm version
echo "2️⃣  Checking npm version..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓${NC} npm installed: v$NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
    ISSUES=$((ISSUES+1))
fi
echo ""

# 3. Check .nvmrc file
echo "3️⃣  Checking .nvmrc file..."
if [ -f .nvmrc ]; then
    NVMRC_VERSION=$(cat .nvmrc)
    echo -e "${GREEN}✓${NC} .nvmrc found with version: $NVMRC_VERSION"
else
    echo -e "${RED}✗${NC} .nvmrc file not found"
    ISSUES=$((ISSUES+1))
fi
echo ""

# 4. Check .env file
echo "4️⃣  Checking .env file..."
if [ -f .env ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
    # Check for required variables
    REQUIRED_VARS=("WHATSAPP_ACCESS_TOKEN" "WHATSAPP_PHONE_NUMBER_ID" "WHATSAPP_VERIFY_TOKEN" "ENCRYPTION_KEY")
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$var=" .env; then
            echo -e "${GREEN}✓${NC} $var is set"
        else
            echo -e "${YELLOW}⚠${NC} $var may not be set"
        fi
    done
else
    echo -e "${RED}✗${NC} .env file not found"
    echo "   Create one by copying: cp .env.example .env"
    ISSUES=$((ISSUES+1))
fi
echo ""

# 5. Check .env.example file
echo "5️⃣  Checking .env.example file..."
if [ -f .env.example ]; then
    echo -e "${GREEN}✓${NC} .env.example template found"
else
    echo -e "${YELLOW}⚠${NC} .env.example template not found"
fi
echo ""

# 6. Check package.json
echo "6️⃣  Checking package.json..."
if [ -f package.json ]; then
    echo -e "${GREEN}✓${NC} package.json found"
    if grep -q '"dev": "nodemon' package.json; then
        echo -e "${GREEN}✓${NC} Dev script uses nodemon (hot reload)"
    else
        echo -e "${YELLOW}⚠${NC} Dev script may not use nodemon"
    fi
else
    echo -e "${RED}✗${NC} package.json not found"
    ISSUES=$((ISSUES+1))
fi
echo ""

# 7. Check node_modules
echo "7️⃣  Checking node_modules..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Dependencies installed (node_modules found)"
else
    echo -e "${YELLOW}⚠${NC} node_modules not found. Run: npm install"
fi
echo ""

# 8. Check builder.config.json
echo "8️⃣  Checking builder.config.json..."
if [ -f "builder.config.json" ]; then
    echo -e "${GREEN}✓${NC} builder.config.json found"
    if grep -q '"command": "npm run dev"' builder.config.json; then
        echo -e "${GREEN}✓${NC} Builder.io config points to dev script"
    fi
else
    echo -e "${RED}✗${NC} builder.config.json not found"
    ISSUES=$((ISSUES+1))
fi
echo ""

# 9. Check index.js
echo "9️⃣  Checking index.js..."
if [ -f "index.js" ]; then
    echo -e "${GREEN}✓${NC} index.js (main file) found"
    FILE_SIZE=$(wc -c < index.js)
    echo "   File size: $((FILE_SIZE / 1024)) KB"
else
    echo -e "${RED}✗${NC} index.js not found"
    ISSUES=$((ISSUES+1))
fi
echo ""

# 10. Check documentation files
echo "🔟 Checking documentation..."
DOCS=("README.md" "DEVELOPMENT_SETUP.md" "BUILDER_CONFIGURATION.md" "GITHUB_BUILDERIO_SYNC.md")
for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✓${NC} $doc found"
    else
        echo -e "${YELLOW}⚠${NC} $doc not found"
    fi
done
echo ""

# Summary
echo "=============================================="
echo "Summary:"
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Your setup is ready.${NC}"
    echo ""
    echo "Next step, run:"
    echo "  npm run dev"
    echo ""
else
    echo -e "${RED}⚠️  Found $ISSUES issue(s) to fix${NC}"
    echo ""
    echo "Quick fixes:"
    echo "  npm install              # Install dependencies"
    echo "  cp .env.example .env     # Create .env from template"
    echo "  node --version           # Check Node.js version"
fi
echo ""