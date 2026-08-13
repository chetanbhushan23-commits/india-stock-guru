# Gemini API setup

Gemini is the primary cloud AI provider for the AI Assistant and research workflow. The real API key must stay outside the repository.

## Environment variables

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-2.5-flash
```

## What Gemini does

- Powers the AI Assistant reasoning layer.
- Uses Google Search grounding for fresh web research and cross-checking.
- Receives the normalized NSE/BSE research context as the authoritative evidence layer.
- Produces a bilingual English + Hindi summary.
- Includes the latest observed evidence date in the summary.
- Does not expose the API key to frontend code.

## Research safety

Official NSE/BSE and company disclosures remain higher-priority evidence than general web discovery. Gemini Search can discover fresh information, but the application must not fabricate evidence IDs or unsupported market facts.

Do not commit `.env` or a real API key. Configure `GEMINI_API_KEY` in the local environment or deployment secret manager.
