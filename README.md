# RUQENA — Social Fitness & Workout Challenge PWA

RUQENA is a social fitness and workout challenge progressive web app (PWA) designed primarily for small groups of friends.

It combines Strava-style workout sharing, Duolingo-style streaks, private friend groups, and gamified fitness challenges.

## 🚀 Key Features

1. **Mobile-First PWA Experience**: Native bottom navigation, 44px+ touch targets, installable on iOS & Android, offline fallback via service workers.
2. **Social Activity Feed**: Friends' workout feed with fast 1-tap reactions (❤️, 🔥, 💪, 👏) and optimistic UI updates.
3. **Workout Logger**: Supports 10+ workout types (Running, Walking, Cycling, Gym, Swimming, Football, Basketball, Tennis, Yoga, Other) with duration, distance, calories, notes, photo previews, and privacy visibility controls.
4. **Gamified Streaks & XP System**: Active streak counter with flame animation, level progression, XP popups, and milestone confetti.
5. **Challenge & Leaderboard Engine**: Create or join workout count, total duration, total distance, or streak challenges with progress visualizers and motivational microcopy.
6. **Interactive 4-Step Onboarding**: Personalized weekly goal setup, avatar chooser, username validation, and friend discovery.
7. **Notification Center & Web Push**: Notification hub for reactions, challenge invites, and streak alerts with Web Push API integration.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, React, Tailwind CSS, Lucide Icons, Framer Motion, Canvas Confetti.
- **Backend & Database**: Supabase (PostgreSQL DB, Row Level Security, Auth, Storage, Realtime).
- **PWA**: Service Worker (`sw.js`), Web App Manifest (`manifest.json`), Web Push Notification architecture.

---

## 📂 Project Structure

```
ruqena/
├── app/
│   ├── layout.tsx            # App Shell (Sidebar, Header, BottomNav, PWA SW)
│   ├── page.tsx              # Root redirect
│   ├── home/                 # Main Dashboard & Activity Feed
│   ├── login/ & register/    # Authentication pages
│   ├── onboarding/           # 4-step wizard
│   ├── workouts/new/         # Workout logger page & modal form
│   ├── challenges/           # Challenge hub, creation, and detail views
│   ├── leaderboard/          # Weekly/Monthly/All-Time rankings
│   ├── friends/              # Friend search and request management
│   ├── profile/              # User profile & friend profile views
│   ├── notifications/        # Notification center
│   └── settings/             # User settings & privacy
├── components/
│   ├── feed/                 # WorkoutCard, ReactionBar
│   ├── navigation/           # BottomNav, Sidebar, Header
│   ├── workouts/             # WorkoutForm
│   └── common/               # EmptyState
├── lib/
│   ├── dataService.ts        # Client Data Service (Supabase + Enriched Seed Fallback)
│   ├── seedData.ts           # Turkish seed data for initial testing
│   ├── gamification.ts       # XP, levels, streak logic & motivational copy
│   └── supabaseClient.ts     # Supabase SSR client setup
├── supabase/
│   └── migrations/
│       └── 20260814_init_schema.sql  # PostgreSQL schema, indexes & RLS policies
└── public/
    ├── manifest.json         # PWA Web Manifest
    └── sw.js                 # PWA Service Worker & Web Push handler
```

---

## 💻 Local Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Supabase Database Migration Setup**:
   - Create a project at [Supabase Dashboard](https://supabase.com).
   - Go to the SQL Editor in Supabase.
   - Run the migration script located at `supabase/migrations/20260814_init_schema.sql`.
   - Copy your Supabase URL and anon key into `.env.local`:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
     ```

---

## 📱 PWA & Push Notification Setup

- On **iOS (Safari)**: Open the website, tap the Share button, and select **"Add to Home Screen"** (Ekrana Ekle). Push notifications require iOS 16.4+.
- On **Android (Chrome)**: Tap the install banner or browser menu and select **"Install App"**.
