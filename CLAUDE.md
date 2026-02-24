# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NutriBot** is a Telegram Mini App for nutrition and fitness tracking. Users open it inside Telegram; it uses Telegram's `initData` for authentication (no separate login). Features: AI food photo analysis (GPT-4o Vision), KBZHU (calorie/macro) tracking, workout tracking, gamification (XP/levels/streaks/achievements), and Telegram Stars subscriptions.

## Commands

### Backend

```bash
# Start dependencies only
docker-compose up -d db redis

# Run backend locally (from /backend)
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload        # API at http://localhost:8000

# Database migrations
alembic upgrade head                 # Apply all migrations
alembic revision --autogenerate -m "description"  # Create new migration

# Start celery worker and beat (separate terminals)
celery -A app.tasks worker --loglevel=info
celery -A app.tasks beat --loglevel=info

# Full stack via Docker
docker-compose up                    # db, redis, backend, celery_worker, celery_beat
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # Dev server at http://localhost:5173
npm run build    # Output to dist/
npm run preview  # Preview production build
```

### Required Environment Variables

Backend `.env` (copy from `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `TELEGRAM_BOT_TOKEN` — From @BotFather
- `TELEGRAM_WEBHOOK_SECRET` — Random secret for webhook verification
- `OPENAI_API_KEY` — For GPT-4o Vision food analysis
- `JWT_SECRET_KEY` — Random secret for JWT signing
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` — For temporary photo storage
- `FRONTEND_URL` — Allowed CORS origin

Frontend `.env`:
- `VITE_API_URL` — Backend API base URL

## Architecture

### Request Flow: Telegram Mini App → Backend

1. Telegram provides `initData` (HMAC-SHA256 signed) to the frontend via `window.Telegram.WebApp`
2. Frontend POSTs `initData` to `POST /v1/auth/telegram`
3. Backend validates HMAC signature + checks `auth_date` within ±5 minutes, then finds or creates user in DB
4. Backend returns JWT (24h TTL); all subsequent API calls include `Authorization: Bearer <token>`
5. JWT `sub` field contains `user_id` (UUID); backend resolves user from there

### Backend Structure (`/backend/app`)

- **`main.py`** — FastAPI app, CORS config, router registration under `/v1` prefix
- **`core/config.py`** — Pydantic `BaseSettings`; all config from environment variables, accessed via `get_settings()`
- **`core/database.py`** — Async SQLAlchemy engine + session factory; use `async with get_db() as session` in routes
- **`core/auth.py`** — JWT creation/validation, Telegram `initData` HMAC verification
- **`routers/`** — One file per domain: `auth`, `food`, `workouts`, `gamification`, `weight`, `subscription`
- **`models/`** — SQLAlchemy ORM models; `base.py` defines the declarative base
- **`services/`** — Business logic separated from HTTP layer:
  - `ai_service.py` — OpenAI GPT-4o Vision calls; returns structured JSON (dish_name, macros, estimated_weight_g, confidence)
  - `food_service.py` — CRUD for food log + Open Food Facts API search
  - `gamification_service.py` — XP calculation, level-up detection, streak logic, achievement checks
  - `subscription_service.py` — Trial management, Telegram Stars billing
- **`bot/`** — aiogram Telegram bot (handlers + notifications)
- **`tasks/reminders.py`** — Celery tasks for scheduled push notifications (08:00, 13:00, 19:00, 21:00)

### Frontend Structure (`/frontend/src`)

- **`App.tsx`** — Root: handles auth flow on mount, tab-based navigation (no React Router), global gamification overlays
- **`hooks/useTelegram.ts`** — Wraps `window.Telegram.WebApp` SDK; provides `initData`, `ready()`, `expand()`, `hapticFeedback`
- **`store/`** — Zustand stores: `userStore` (auth, profile), `foodStore` (daily log), `gamificationStore` (XP popups, level-up, achievements)
- **`api/client.ts`** — Axios instance; token injected via request interceptor from `userStore`
- **`api/`** — Domain-specific API functions (food, workouts, subscription) using the shared Axios client
- **`pages/`** — Dashboard, Food, Workouts, Profile, Onboarding, Paywall
- **`utils/calculations.ts`** — Mifflin-St Jeor TDEE formula, macro ratio calculations

### Gamification System (server-authoritative)

XP awarded server-side in `gamification_service.py` to prevent cheating:
- Meal logged: +15 XP; all 3 meals in a day: +50 XP bonus
- Calories within ±10% of goal: +30 XP; workout: +40 XP; photo used: +15 XP
- Level threshold: `xp_for_level(n) = 500 × 2^(n-1)` (exponential)
- Streaks: incremented if ≥1 meal logged/day; resets after 2 missed days
- Redis key `ai_usage:{user_id}:{date}` enforces 10 AI requests/hour per user

### Database (PostgreSQL + SQLAlchemy async)

Key relationships from `User`:
- `food_logs` — entries with `meal_type` (breakfast/lunch/dinner/snack), `source` (ai_photo/manual/search)
- `workouts` — unique per `(user_id, workout_date)`
- `achievements` — unique per `(user_id, achievement_code)`
- `weight_logs` — unique per `(user_id, logged_date)`
- `subscriptions` — Telegram Stars payment records

### Telegram-specific Patterns

- **CSS variables** (`bg-tg-bg`, `text-tg-text`, `bg-tg-button`, etc.) map to `var(--tg-theme-*)` from Telegram WebApp SDK — always use these instead of hardcoded colors
- `window.Telegram.WebApp.HapticFeedback` is called for user interactions (use `useTelegram` hook)
- Bot notifications triggered via Celery tasks; bot token used directly with Telegram Bot API
- Subscription payments use Telegram Stars (not traditional payment gateways)
