# Getting a Valid Gemini API Key

## Step-by-Step Instructions

### Method 1: Google AI Studio (Recommended - Free & Easy)

1. **Visit**: https://aistudio.google.com/app/apikey
2. **Sign in** with your Google account
3. **Click "Get API Key"** or "Create API Key"
4. **Select** "Create API key in new project" or choose existing project
5. **Copy** the generated key (starts with AIza, ~39 characters)
6. **Test it** - the site has a test playground to verify it works

### Method 2: Google Cloud Console (For Production)

1. **Visit**: https://console.cloud.google.com/
2. **Create or select** a project
3. **Enable** the "Generative Language API"
4. **Go to** APIs & Services > Credentials
5. **Create** an API key
6. **(Optional)** Add restrictions for security

## Common Issues

### "API key not valid" Error
- **Key expired**: Generate a new one
- **API not enabled**: Enable "Generative Language API" in your project
- **Restrictions**: Remove or adjust API restrictions
- **Billing**: Some features require billing enabled (but basic Gemini is free)

### Free Tier Limits
- Gemini 2.0 Flash: 15 requests per minute
- Gemini 1.5 Flash: 15 requests per minute
- More than enough for testing!

## Security Tips

✅ DO:
- Keep your API key in `.env` file (it's gitignored)
- Rotate keys periodically
- Use different keys for dev/prod

❌ DON'T:
- Commit API keys to git
- Share keys publicly
- Use the same key across multiple apps

## Testing Your Key

Once you have a new key, test it with:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

If you see a response with text, your key works!
