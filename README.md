"# recipe-tracker" 
# My Kitchen

A React + TypeScript full-stack meal planning app inspired by the original spreadsheet.

The sample app has:

- A Vite React frontend app in `frontend/`
- A Vite TypeScript backend API app in `backend/`
- Supabase database schema in `supabase/schema.sql`
- Supabase REST integration configured through environment variables

## First Steps

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Copy `backend/.env.example` to `backend/.env`.
4. Copy `frontend/.env.example` to `frontend/.env`.
5. Fill in your Supabase project URL and publishable/anon key in both files.
6. Enable Google auth in Supabase and add your local Vite URL to the auth redirect URLs.
7. Start the app:

```bash
npm run dev
```

Then open `http://127.0.0.1:5173`.

The dev command starts:

- API backend: `http://127.0.0.1:3001`
- React frontend: `http://127.0.0.1:5173`

The frontend proxies `/api/*` requests to the backend.

## Environment

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-publishable-or-anon-key
PORT=3001
```

Frontend:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

Use the publishable/anon key for this app. Do not expose the service role key in browser code.

## Scripts

```bash
npm run dev              # start frontend and backend
npm run dev:frontend     # start only frontend
npm run dev:backend      # start only backend
npm run build            # build both apps
npm run build:frontend   # build frontend only
npm run build:backend    # build backend only
npm run start            # run built backend
```

## Deploying to Vercel

This repo is configured for a single Vercel deployment:

- Static Vite app: `frontend/dist`
- API routes: `api/[...path].ts`
- Vercel config: `vercel.json`

In Vercel, import the GitHub repo and keep the project root as the repository root. The checked-in `vercel.json` sets:

```text
Build Command: npm run build:frontend
Output Directory: frontend/dist
```

Add these Environment Variables in Vercel Project Settings for Production and Preview:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

Use the publishable/anon key for this app. Do not add a service role key as a `VITE_*` variable.

After the first deployment, add your Vercel URL in Supabase Auth redirect URLs:

```text
https://your-app.vercel.app
```

The app also supports `/favourites` as the British English route for saved meals.

## App Layout

```text
frontend/
  src/
  vite.config.mjs
  package.json

backend/
  src/server.ts
  vite.config.ts
  package.json
```

## What This Prototype Does

- Stores foods with calories and protein per 100g or per serving.
- Stores recipes/meal components.
- Links recipe ingredients to foods and quantities.
- Calculates total calories and protein for each recipe.
- Shows how the frontend calls your backend instead of calling Supabase directly.

This is intentionally small, but it is the right shape for expanding into weekly plans, batch cooking, shopping lists, and target-based meal planning.
