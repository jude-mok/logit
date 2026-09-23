# Logit Web

React and TypeScript photo journal using the existing FastAPI backend. The original Expo application remains in `frontend/`.

## Run

```sh
npm ci
npm run dev
npm test
npm run build
```

Open http://127.0.0.1:5174. The sample journal runs without a server, uses owner-provided photos stored in `public/demo/` (optimized WebP copies with metadata removed; dates and captions are illustrative), and is read-only. Sample content cannot be added, edited, deleted, or starred. Search, albums, favorites filtering, and details remain available. Sign in or create an account to use the API. Local `/api` requests are proxied to the deployed Railway API. Set `API_PROXY_TARGET=http://127.0.0.1:8000` in `.env.local` to use a local backend. Signing in or creating an account against Railway uses real data.

## Features

Responsive masonry journal, caption search, favorites, monthly albums, photo upload with preview, caption editing, confirmed deletion, username/password sign-in and registration. The backend enforces one upload per day, resetting at 8 AM in the user's timezone. Access tokens are scoped to the browser tab session; expired sessions require sign-in because the current backend does not provide token refresh.

## Deploy

Set Vercel Root Directory to `web`, build to `npm run build`, and output to `dist`. Leave `VITE_API_URL` unset: `vercel.json` forwards `/api/*` to the Railway API over HTTPS. This keeps browser requests on the same origin. If overriding `VITE_API_URL` with a different backend origin, add the website origin to that backend's `CORS_ORIGINS` and redeploy. No backend credentials belong in Vite environment variables.

Offline creation/sync, persistent image caching and web Google OAuth are not implemented. Account operations require an online backend. Existing mobile features are preserved in the Expo project, but this web version is not full platform parity. Production deployment and real-account end-to-end checks still require a configured backend.
