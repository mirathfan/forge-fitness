# Forge Fitness

Forge Fitness is a public portfolio-ready workout tracking foundation. It pairs a typed Expo React Native mobile app with a Dockerized FastAPI and PostgreSQL backend, with the current milestone verified through registration, onboarding, workout template creation, workout logging, history, previous performance, deterministic progressive-overload recommendations, and the Milestone 2 bodyweight tracking foundation.

The current release is intentionally focused on the verified workout and bodyweight-entry flows. Nutrition, AI coaching, Apple Health, AWS deployment, social features, payments, and other product expansions are not implemented in this milestone.

## Product Overview

Forge Fitness demonstrates a production-shaped mobile fitness architecture without overextending the product scope. The app supports account creation, secure token storage, profile onboarding, exercise search, reusable workout templates, active workout tracking, completed workout history, previous performance lookup, rule-based recommendations, and owned bodyweight entries with simple trend summaries.

This repository is meant to show a complete foundation: backend domain modeling, migrations, seeded reference data, mobile client state management, API integration, Docker orchestration, and regression coverage.

## Screenshots

No screenshots are committed yet. When real captures are available, add them under the paths below and update this table with thumbnails.

| Screen | Placeholder path |
| --- | --- |
| Welcome and authentication | `docs/screenshots/mobile-auth.png` |
| Home dashboard | `docs/screenshots/mobile-home.png` |
| Workout template editor | `docs/screenshots/mobile-template-editor.png` |
| Active workout logging | `docs/screenshots/mobile-active-workout.png` |
| Workout summary and history | `docs/screenshots/mobile-summary-history.png` |
| Progress and bodyweight tracking | `docs/screenshots/mobile-progress-bodyweight.png` |

## Architecture

```mermaid
flowchart LR
  Mobile["Expo React Native app"] --> ClientState["Zustand + TanStack Query"]
  ClientState --> API["FastAPI /api/v1"]
  API --> Auth["JWT auth"]
  API --> Services["Domain services"]
  Services --> Repositories["Repository layer"]
  Repositories --> DB[("PostgreSQL 16")]
  Services --> Rules["Progression rules"]
  Alembic["Alembic migrations"] --> DB
  Seed["Exercise seed data"] --> DB
```

The mobile app calls versioned JSON endpoints under `/api/v1`. FastAPI routes delegate business behavior to service classes, repositories isolate persistence logic, SQLAlchemy models define the relational schema, Alembic manages migrations, and seeded exercises provide deterministic local data.

## Technology Stack

| Area | Stack |
| --- | --- |
| Mobile | Expo SDK 57, React Native, Expo Router, TypeScript |
| Mobile state and forms | TanStack Query, Zustand, React Hook Form, Zod |
| Mobile storage | Expo SecureStore for access tokens |
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2 |
| Database | PostgreSQL 16, Alembic migrations |
| Auth | Email/password auth with JWT access tokens |
| Local infrastructure | Docker Compose, Uvicorn |
| Tests and checks | Pytest, Ruff, Mypy, Jest, ESLint, TypeScript, Expo Doctor |

## Repository Structure

```text
.
├── api/                       # FastAPI app, domain services, models, migrations, tests
├── mobile/                    # Expo React Native app, screens, services, stores, tests
├── infrastructure/            # Deployment notes and future infrastructure boundary
├── .github/workflows/ci.yml   # API and mobile CI checks
├── docker-compose.yml         # Local PostgreSQL and API stack
├── .env.example               # Safe local placeholder environment values
├── Makefile                   # Common local commands
└── README.md                  # Project documentation
```

Generated local files are excluded from Git, including `.env`, `.env.*`, `node_modules/`, Python virtual environments, Expo state, pycache folders, `.DS_Store`, `.pyc` files, local test databases, signing files, and service credential files. `.env.example` files remain trackable by design.

## Verified Workout Flow

The v0.1.0 foundation has been verified end to end against the Docker FastAPI and PostgreSQL backend:

1. Register a test user.
2. Log in and retrieve the authenticated user through `/auth/me`.
3. Complete profile onboarding with preferred training units.
4. Browse and search seeded exercises.
5. Create a `Push Day` workout template with Barbell Bench Press.
6. Start a workout session from that template.
7. Log three working sets: `135 lb x 10`, `135 lb x 9`, and `135 lb x 8`, each at `RPE 8`.
8. Complete the workout.
9. Confirm the workout summary, history, previous bench performance, and maintain recommendation.
10. Start another Push Day and confirm previous bench performance appears.
11. Reload the app and confirm active workout restoration preserves in-progress workout state.

## Bodyweight Tracking Foundation

Milestone 2 adds the bodyweight foundation without expanding into nutrition, AI, Apple Health, or cloud features:

- User-owned bodyweight entries stored internally in kilograms.
- One bodyweight entry per user per calendar date.
- Optional notes on each entry.
- List filtering by date range with pagination.
- Update and delete for owned entries only.
- Trend summary with latest weight, 7-day rolling average, 7-day change, 30-day change, and gaining/losing/stable direction.
- Progress tab quick entry, preferred-unit input/display, history, edit, delete, loading, empty, and error states.

The rolling average uses recorded entries within the latest seven-calendar-day window and ignores missing days.

## Docker Setup

Copy the safe placeholder environment file if you want a local `.env` for shell-based development:

```bash
cp .env.example .env
```

Start the full local stack from the repository root:

```bash
docker compose up --build
```

The API container waits for PostgreSQL, applies migrations, seeds exercises, and starts Uvicorn:

```bash
alembic upgrade head &&
python -m app.db.seed &&
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Useful Docker checks:

```bash
docker compose ps
docker compose exec -T postgres pg_isready -U forge -d forge
curl -fsS http://localhost:8000/health
curl -fsS http://localhost:8000/ready
```

Stop the stack:

```bash
docker compose down
```

## Backend Startup

Docker is the recommended backend startup path because it provides PostgreSQL and runs the migration and seed steps automatically.

For backend-only local development, start PostgreSQL with Docker and run FastAPI from the host:

```bash
docker compose up -d postgres
cd api
python3.12 -m venv .venv
./.venv/bin/pip install -e ".[dev]"
cp ../.env.example .env
./.venv/bin/alembic upgrade head
./.venv/bin/python -m app.db.seed
./.venv/bin/uvicorn app.main:app --reload
```

The backend exposes:

| Endpoint | Purpose |
| --- | --- |
| `http://localhost:8000/api/v1` | API base URL |
| `http://localhost:8000/docs` | Swagger UI API documentation |
| `http://localhost:8000/openapi.json` | OpenAPI JSON |
| `http://localhost:8000/health` | Liveness check |
| `http://localhost:8000/ready` | Database readiness check |

Bodyweight API routes are available under `http://localhost:8000/api/v1`:

| Route | Purpose |
| --- | --- |
| `POST /bodyweight-entries` | Create an owned bodyweight entry |
| `GET /bodyweight-entries` | List owned entries with `start_date`, `end_date`, `limit`, and `offset` |
| `GET /bodyweight-entries/trend` | Return latest weight, rolling average, deltas, and direction |
| `PUT /bodyweight-entries/{entry_id}` | Update an owned entry |
| `DELETE /bodyweight-entries/{entry_id}` | Delete an owned entry |

## Mobile Startup

Install mobile dependencies and start Expo from `mobile/`:

```bash
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1 npx expo start --clear --ios
```

For an iOS Simulator running on the same Mac as the backend, `localhost` resolves correctly. For physical devices, set `EXPO_PUBLIC_API_URL` to a reachable LAN URL for the API.

## Environment Variables

| Variable | Used by | Example | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | API, Alembic | `postgresql+psycopg://forge:forge@localhost:5432/forge` | Local placeholder only. Use managed secrets outside local development. |
| `JWT_SECRET_KEY` | API auth | `replace-with-a-long-random-secret` | Must be replaced with a strong secret outside local development. |
| `EXPO_PUBLIC_API_URL` | Mobile app | `http://localhost:8000/api/v1` | Build-time public mobile URL for the API. |

Do not commit real `.env` files, production JWT secrets, database credentials, signing keys, service account files, or native build artifacts.

## Testing and Verification

Run backend checks from `api/`:

```bash
./.venv/bin/pytest
./.venv/bin/ruff check .
./.venv/bin/mypy app
```

Run mobile checks from `mobile/`:

```bash
npm run test -- --runInBand
npm run lint
npm run typecheck
npx expo-doctor
npm audit --json
```

Current local verification on July 12, 2026:

| Check | Result |
| --- | --- |
| API tests | `23 passed` |
| API lint | `ruff check .` passed |
| API type check | `mypy app` passed |
| Mobile tests | `5` suites passed, `11` tests passed |
| Mobile lint | `npm run lint` passed |
| Mobile type check | `npm run typecheck` passed |
| Expo Doctor | `20/20 checks passed` |
| npm audit | `10` moderate transitive advisories remain; see limitation below |

## Known npm Audit Limitation

`npm audit` currently reports `10` moderate advisories in Expo/transitive tooling: `@expo/cli`, `@expo/config`, `@expo/config-plugins`, `@expo/inline-modules`, `@expo/local-build-cache-provider`, `@expo/metro-config`, `@expo/prebuild-config`, `expo`, `uuid`, and `xcode`.

The available forced audit path suggests a semver-major downgrade to `expo@46.0.21`, which was not applied because it would destabilize the working SDK 57 app and undo the verified Expo Doctor alignment.

This is tracked as a dependency ecosystem limitation for the current milestone, not as an application feature gap.

## Current Milestone Status

The current main branch represents the verified workout foundation plus the Milestone 2 bodyweight tracking foundation:

- Dockerized backend startup with migrations and seeded exercises.
- Authenticated mobile workflow from registration through workout completion.
- Workout templates, active sessions, logged sets, history, previous performance, and deterministic recommendations.
- Bodyweight entries, history, preferred-unit input/display, and simple trend summaries.
- API and mobile regression tests.
- Public portfolio documentation and release tag.

Out of scope for this milestone:

- Advanced bodyweight analytics beyond the simple trend foundation.
- Nutrition tracking.
- AI coaching.
- Apple Health integration.
- AWS or production cloud deployment.
- Social, payment, or marketplace features.

## Roadmap

Near-term repository polish:

- Add real screenshots to `docs/screenshots/`.
- Add a short demo video or portfolio case-study link when available.
- Add release notes for tagged milestones.
- Keep CI, tests, and dependency checks visible for reviewers.

Foundation hardening:

- Decide production hosting and secrets strategy.
- Add production deployment documentation after the hosting choice is made.
- Add observability, backup, and operational runbook notes before any production launch.

Product expansion remains deferred until the workout foundation stays stable under continued testing and review.

## Repository Metadata Suggestions

Suggested GitHub description:

```text
Verified Expo and FastAPI workout tracking foundation with Dockerized PostgreSQL, typed mobile client, and regression coverage.
```

Suggested topics:

```text
fitness-app, workout-tracker, expo, react-native, fastapi, postgresql, sqlalchemy, alembic, docker-compose, typescript, python
```

Suggested homepage field:

```text
Leave blank until a deployed demo, portfolio case study, or demo video URL is available.
```
