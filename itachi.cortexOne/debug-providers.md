# Provider Configuration Debug Guide

## Recent Fixes Applied

✅ **Auto-cleanup of invalid model assignments** - The app now automatically removes references to deleted providers
✅ **Better error messages** - More specific error messages for different failure scenarios  
✅ **Provider validation** - Visual indicators (green/red dots) show provider status
✅ **Test connection button** - Test provider configurations directly in settings
✅ **Auto-select working providers** - Quick "Auto" button to select first working provider
✅ **Status messages** - Real-time feedback when fetching models or encountering errors

## Common Issues and Solutions

### 1. "Provider not found or missing credentials"

This error occurs when:
- A model assignment references a provider that no longer exists
- The provider is missing required credentials (Base URL or API Key)

**Solution:**
1. Open Settings → Models tab
2. Check if any assignments show red error messages
3. Either fix the provider configuration or reassign to a working provider

### 2. "Failed to fetch models"

This error occurs when:
- The Base URL is incorrect
- The API Key is invalid or expired
- The provider's API is down
- CORS issues (less common in Electron)

**Solution:**
1. Open Settings → Providers tab
2. Select the problematic provider
3. Use the "Test Connection" button to diagnose the issue
4. Check the error message for specific details

### 3. Background models work but main models fail

This typically means:
- The main model assignment points to a broken provider
- The background assignment points to a working provider (like Pollinations)

**Solution:**
1. Go to Settings → Models
2. Check the main assignment - it likely shows an error
3. Select a working provider for the main assignment

## Provider-Specific Troubleshooting

### OpenAI
- Base URL: `https://api.openai.com/v1/chat/completions`
- Ensure API key starts with `sk-`

### Ollama
- Local: `http://localhost:11434/api/chat`
- Cloud: `https://ollama.com/api/chat`
- Make sure Ollama is running if using local

### Anthropic
- Base URL: `https://api.anthropic.com/v1/messages`
- Different format than OpenAI - handled automatically

### Custom Providers
- Use "Test Connection" to verify configuration
- Check if the provider supports the OpenAI-compatible format
- Some providers may need custom models endpoints

## Auto-Cleanup Features

The app now automatically:
- Removes invalid model assignments on startup
- Shows provider status indicators (green/red dots)
- Provides detailed error messages
- Clears broken references

## Manual Reset

If issues persist:
1. Go to Settings → Providers
2. Delete problematic providers
3. Re-add them using templates
4. Reassign models in the Models tab