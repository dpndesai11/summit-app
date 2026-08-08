# Summit

A personal command center: task/project management plus a mobile-first fitness
tracker. Two independent React + Vite apps, deployed together to GitHub Pages.

## Repository layout

```
apps/
  tasks/          Task manager — the main app, served at /summit-app/
    src/
      App.jsx         UI shell and global state
      components/     Board, planner, task cards, modals
      pages/          Dashboard, TaskBoard, TodayFocus, Projects, FitnessDeck
      lib/db.js       GitHub API read/write for summit-data.json
      lib/planUtils.js  Reads the shared weekly-workout-plan shape
      lib/taskUtils.js

  fitness/        Fitness tracker — standalone, served at /summit-app/fitness/
    src/
      FitnessTracker.jsx  All UI, state, and workout-session logic
      RoutePlanner.jsx    Leaflet map for planning cardio routes
      lib/db.js           GitHub API read/write (+ dbRefresh)
      lib/geo.js          Haversine route distance

legacy/           Retired Python/JS prototypes, kept for reference only
.github/workflows/deploy.yml   Builds both apps, deploys them together
```

The two apps are fully self-contained — each has its own `package.json`,
`vite.config.js`, and `node_modules`. They share no code at build time. What
they *do* share is data: both read and write the same `summit-data.json` in the
private `summit-data` repo, so the same storage keys must stay in sync between
`apps/tasks/src/lib/db.js` and `apps/fitness/src/lib/db.js`.

## Working on an app

```bash
npm install --prefix apps/tasks
npm run dev --prefix apps/tasks
```

```bash
npm install --prefix apps/fitness
npm run dev --prefix apps/fitness
```

Each app needs a `.env` in its own folder (see `apps/tasks/.env.example`):

| Variable | Purpose |
|---|---|
| `VITE_GITHUB_OWNER` | GitHub username owning the data repo |
| `VITE_GITHUB_REPO` | Data repo name (`summit-data`) |
| `VITE_GITHUB_TOKEN` | PAT with access to the data repo |
| `VITE_APP_PASSWORD` | Task app's client-side password (tasks only) |

## Deploying

Push to `main` — GitHub Actions builds both apps and publishes them together.
The fitness build is copied into the task app's `dist/fitness/`, which is why
both are reachable under one Pages site.

## ⚠️ Security note

`VITE_GITHUB_TOKEN` is compiled into both apps' public JS bundles at build time.
Anyone who loads the page can extract it from devtools and gain whatever access
the PAT has. This matters especially because `/fitness` has no auth gate at all.
Worth fixing: scope a fine-grained PAT to `summit-data` only, or move writes
behind a serverless proxy so the raw token never reaches the client.
