# LOGIT

A personal photo diary app — one moment per day.

## Overview

LOGIT is a mobile app that encourages mindful daily journaling through photos. Upload one photo a day, add a comment, star your favorites, and watch your collection grow into a living archive. A virtual tree grows with your streak, and a calendar tracks your consistency.

## Features

- **One photo per day** — daily upload limit keeps it intentional
- **Archive** — browse moments in random, chronological, or starred order
- **Calendar** — see which days you captured a moment at a glance
- **Album** — moments grouped by month in a masonry grid
- **Tree stage** — a visual tree that grows as your collection builds (stages 1–6, or "dead" if you stop)
- **Quote feed** — inspirational quotes woven into your archive
- **Google OAuth + email/password** sign-in
- **Edit & star** moments, bulk delete from albums

## Stack

| Layer | Technology |
|---|---|
| Mobile | React Native (Expo) |
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| Storage | Supabase Storage |
| Auth | JWT (access + refresh tokens) |
| Deployment | Railway (backend) |

## Project Structure

```
logit/
├── backend/
│   ├── app/
│   │   ├── models/        # SQLAlchemy models
│   │   ├── routers/       # API endpoints
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Auth, storage logic
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── (tabs)/        # Archive, Profile screens
    │   ├── album/         # Album detail
    │   ├── moment/        # Moment detail
    │   ├── login.tsx
    │   └── signup.tsx
    ├── components/
    ├── services/
    │   └── api.ts         # All API calls
    └── assets/
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/auth/signin` | Sign in |
| POST | `/auth/sign_up` | Sign up |
| POST | `/auth/google` | Google OAuth |
| GET | `/me/` | Get current user |
| PATCH | `/me/update` | Update username / password |
| DELETE | `/me/delete` | Delete account |
| GET | `/me/tree` | Get tree stage |
| GET | `/moments/` | List moments |
| POST | `/moments/` | Upload a moment |
| PATCH | `/moments/{id}/star` | Toggle star |
| PATCH | `/moments/{id}/edit` | Edit comment |
| DELETE | `/moments/{id}` | Delete moment |
| GET | `/moments/can-upload` | Check daily upload limit |
| GET | `/album/` | List albums by month |
| GET | `/album/{year}/{month}` | Moments for a month |
| GET | `/album/calendar/{year}/{month}` | Calendar day marks |
| GET | `/quotes/random` | Random quote |
| GET | `/quotes/batch` | Batch of quotes |

## Setup

### Backend

```bash
cd backend
uv sync
```

Create a `.env` file (see `.env.example`):

```env
DATABASE_URL=your-postgres-url
SECRET_KEY=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-key
```

Run migrations and start:

```bash
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` in `frontend/.env` to your backend URL.

### Supabase Storage

Create a public bucket named `moments` in your Supabase project under **Storage**.

## Deployment

Backend is deployed on [Railway](https://railway.app). Set all environment variables listed above in the Railway project settings.

## Web journal

The React/TypeScript web client lives in `web/`. Run `npm ci --prefix web` and `npm run dev --prefix web`, then open http://127.0.0.1:5174. See [web setup](web/README.md) for API configuration and deployment. The original Expo app remains in `frontend/`.
