#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${GREEN}🔑 Gemini API Key Setup${NC}"
echo "=================================="
echo ""
echo "To get a FREE Gemini API key:"
echo "1. Visit: https://aistudio.google.com/app/apikey"
echo "2. Sign in with your Google account"
echo "3. Click 'Create API Key'"
echo "4. Copy the generated key"
echo ""
echo -e "${YELLOW}⚠️  Your API key will be stored securely in .env (not committed to git)${NC}"
echo ""
read -p "Paste your Gemini API key here: " API_KEY

# Remove any whitespace
API_KEY=$(echo "$API_KEY" | tr -d '[:space:]')

# Validate key format (basic check - Gemini keys start with 'AIza')
if [[ ! $API_KEY =~ ^AIza ]]; then
  echo ""
  echo -e "${YELLOW}⚠️  Warning: This doesn't look like a Gemini API key (should start with 'AIza')${NC}"
  read -p "Continue anyway? (y/n): " CONTINUE
  if [[ ! $CONTINUE =~ ^[Yy] ]]; then
    echo "Setup cancelled."
    exit 1
  fi
fi

# Update .env file
ENV_FILE="backend/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}Error: .env file not found at $ENV_FILE${NC}"
  exit 1
fi

# Backup original .env
cp "$ENV_FILE" "$ENV_FILE.backup"
echo -e "${GREEN}✓${NC} Backed up .env to .env.backup"

# Replace the API key
if grep -q "^GEMINI_API_KEY=" "$ENV_FILE"; then
  # Key exists, replace it
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/^GEMINI_API_KEY=.*/GEMINI_API_KEY=$API_KEY/" "$ENV_FILE"
  else
    # Linux
    sed -i "s/^GEMINI_API_KEY=.*/GEMINI_API_KEY=$API_KEY/" "$ENV_FILE"
  fi
  echo -e "${GREEN}✓${NC} Updated GEMINI_API_KEY in .env"
else
  # Key doesn't exist, add it
  echo "" >> "$ENV_FILE"
  echo "GEMINI_API_KEY=$API_KEY" >> "$ENV_FILE"
  echo -e "${GREEN}✓${NC} Added GEMINI_API_KEY to .env"
fi

echo ""
echo -e "${GREEN}✅ API key configured successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. The backend server will auto-reload with the new key"
echo "2. Open http://localhost:5173 in your browser"
echo "3. Click the microphone button or type a question"
echo "4. Ask something like: 'What formation is this?'"
echo ""
