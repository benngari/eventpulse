# EventPulse — AI Event Discovery for Nairobi

Full-stack Vite + React event discovery app on a 100% free stack.

## Structure

```
eventpulse/
├── src/                     ← React + Vite frontend
│   ├── components/          ← EventCard, EventModal, AISearchBar, NotificationBell, StatsBar
│   ├── hooks/               ← useEvents, useAISearch
│   ├── lib/                 ← Supabase client, mock data
│   └── pages/               ← Home page
├── backend/
│   ├── db/schema.sql        ← Run in Supabase SQL editor first
│   ├── fetcher/fetcher.py   ← Pulls events from Eventbrite, Google Places, scraping
│   ├── classifier/          ← Claude AI categorisation + pgvector embeddings
│   └── .github/workflows/  ← GitHub Actions cron (free, every 30 min)
└── .env.example
```

## Quick start

```bash
# 1. Frontend
cp .env.example .env   # fill in keys (app works without them using mock data)
npm install
npm run dev

# 2. Backend
cd backend
pip install supabase requests beautifulsoup4 anthropic python-dotenv openai
python fetcher/fetcher.py
python classifier/classifier.py
```

## Free tier limits

| Service | What it handles | Free limit |
|---|---|---|
| Supabase | Postgres + pgvector + Auth | 500 MB DB |
| GitHub Actions | Automated fetch cron | 2,000 min/month |
| Anthropic Claude | AI classification | Free tier |
| Vercel | Frontend hosting | Unlimited |
| Firebase FCM | Push notifications | Unlimited |
