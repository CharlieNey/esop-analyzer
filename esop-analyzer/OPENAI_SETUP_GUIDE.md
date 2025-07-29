# 🚀 OpenAI Integration Setup Guide

## Step 1: Get Your OpenAI API Key

1. **Visit**: https://platform.openai.com/api-keys
2. **Sign in** or create an OpenAI account
3. **Click**: "Create new secret key"
4. **Name it**: "ESOP Analyzer" (for organization)
5. **Copy the key** - it starts with `sk-...`

## Step 2: Add API Key to Environment

**Edit this file**: `/Users/charlieney/village_labs/esop-analyzer/backend/.env`

**Replace this line:**
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

**With your actual key:**
```bash
OPENAI_API_KEY=sk-your-actual-key-here
```

## Step 3: Switch to Real OpenAI Services

I'll help you switch from the mock services to real OpenAI integration.

### Current Status:
- ✅ Mock services working (basic responses)
- 🔄 Need to switch to real OpenAI (intelligent responses)
- 🔄 Need to fix PDF text extraction

### What Real OpenAI Will Give You:
- 🧠 **Intelligent Q&A**: GPT-4 powered responses
- 📊 **Smart Metrics**: AI extracts financial data from PDFs
- 🔍 **Better Search**: Real embedding vectors for similarity
- 📝 **Accurate Citations**: Precise document references

## Step 4: Test the Integration

After adding your API key, we'll test:
1. PDF text extraction from real documents
2. Embedding generation for vector search
3. GPT-4 powered question answering
4. Automatic metrics extraction

## Pricing Information

**OpenAI Costs for Testing:**
- **GPT-4**: ~$0.03 per 1K tokens (input), ~$0.06 per 1K tokens (output)
- **Embeddings**: ~$0.0001 per 1K tokens
- **Typical PDF**: ~$0.10-0.50 per upload/analysis
- **Q&A Session**: ~$0.05-0.20 per question

**For demo/testing**: Expect $2-5 total cost

---

**Ready?** Add your API key and let me know - I'll switch everything over to real OpenAI! 🎉