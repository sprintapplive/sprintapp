# Sprint

A mobile-first, desktop-responsive productivity app that helps you track your time in 30-minute increments. Built with Greek mythology-inspired aesthetics featuring deep greens, gold accents, and marble backgrounds.

## Features

- **30-Minute Sprint Tracking**: Log your activities in half-hour blocks throughout the day
- **Category System**: Preset categories (Deep Work, Work, Rest, Exercise, Social, Wasted) plus custom categories
- **Daily Timeline**: Visual overview of your day with color-coded sprints
- **Daily Wrap-up**: End-of-day reflection with exercise and eating scores
- **Analytics Dashboard**: Score trends, category breakdowns, and weekly activity charts
- **Weekly Goals**: Set targets for average score and maximum wasted time
- **Automated Daily Reports**: API endpoint and Supabase Edge Function for daily summaries

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database/Auth**: Supabase (PostgreSQL + Auth)
- **Charts**: Recharts
- **Deployment**: Ready for Vercel

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd sprint
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create an account or sign in
2. Click "New Project" and select your organization
3. Enter project name: "sprint-app" (or your preference)
4. Generate a strong database password (save it!)
5. Select a region closest to you
6. Wait for project to provision (~2 minutes)

### 3. Configure Environment Variables

1. Go to Settings > API in your Supabase dashboard
2. Copy the project URL and anon key
3. Create `.env.local` file:

```bash
cp .env.local.example .env.local
```

4. Fill in the values:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: For service role operations (daily reports)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: For daily report webhook (Make.com integration)
DAILY_REPORT_WEBHOOK_URL=your-webhook-url
DAILY_REPORT_SECRET=your-secret-key
```

### 4. Run Database Migrations

Option A: Using Supabase Dashboard
1. Go to SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and run the SQL

Option B: Using Supabase CLI
```bash
npx supabase db push
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
sprint/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Auth pages (login, signup)
│   │   ├── (dashboard)/         # Main app pages
│   │   ├── api/                 # API routes
│   │   └── auth/callback/       # Supabase auth callback
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── timeline/            # Timeline components
│   │   ├── analytics/           # Chart components
│   │   └── daily-wrapup/        # Wrapup form
│   └── lib/
│       ├── supabase/            # Supabase client utilities
│       ├── types.ts             # TypeScript types
│       └── utils.ts             # Utility functions
├── supabase/
│   ├── migrations/              # Database migrations
│   └── functions/               # Edge functions
└── public/                      # Static assets
```

## Database Schema

### Tables

- **profiles**: Extended user info (linked to auth.users)
- **sprints**: 30-min time blocks with category, description, score
- **categories**: User-customizable categories
- **daily_wrapups**: End-of-day review data
- **weekly_goals**: Target average score, max wasted minutes

### Row Level Security

All tables have RLS enabled to ensure users can only access their own data.

## Daily Reports

### API Endpoint

POST `/api/daily-report` to generate daily reports for all users.

Headers:
- `Authorization: Bearer YOUR_SECRET_KEY`

### Supabase Edge Function

Deploy the edge function to run at 11 PM Mountain Time:

```bash
supabase functions deploy daily-report
```

Configure a scheduled trigger in Supabase:
- Go to Database > Extensions and enable `pg_cron`
- Create a cron job to call the function at 11 PM MT daily

## Color Palette

| Color | Usage |
|-------|-------|
| Laurel (green) | Primary actions, positive states |
| Gold | Accents, highlights, exercise |
| Marble (neutral) | Backgrounds, rest category |
| Olympus (dark) | Dark mode backgrounds |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
