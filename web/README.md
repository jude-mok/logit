# Logit Web

React and TypeScript photo journal using the existing FastAPI backend. The original Expo application remains in `frontend/`.

## Run

```sh
npm ci
npm run dev
npm test
npm run build
```

Open http://127.0.0.1:5174. The sample journal runs without a server, uses Unsplash sample photos, and keeps changes in memory until reload. Sample content never writes to the real account. Sign in or create an account to use the API. Local `/api` requests are proxied to port 8000.

## Features

Responsive masonry journal, caption search, favorites, monthly albums, photo upload with preview, caption editing, confirmed deletion, username/password sign-in and registration. The backend enforces one upload per day, resetting at 8 AM in the user's timezone. Access tokens are scoped to the browser tab session; expired sessions require sign-in because the current backend does not provide token refresh.

## Deploy

Set Vercel Root Directory to `web`, build to `npm run build`, and output to `dist`. Set `VITE_API_URL` to the public HTTPS API origin. Add the website's origin to the backend `CORS_ORIGINS` comma-separated environment variable, then redeploy both. No backend credentials belong in Vite environment variables.

Offline creation/sync, persistent image caching and web Google OAuth are not implemented. Account operations require an online backend. Existing mobile features are preserved in the Expo project, but this web version is not full platform parity. Production deployment and real-account end-to-end checks still require a configured backend.
