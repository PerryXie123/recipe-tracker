"# recipe-tracker" 
# Recipe Tracker

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
4. Fill in your Supabase project URL and service role key.
5. Start the app:

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
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
```

Use the service role key only on the backend. Do not expose it in browser code.

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
