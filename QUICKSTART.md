# LimeLink Quickstart Guide

Get LimeLink running locally in 5 minutes.

## Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **PostgreSQL database** - We recommend [Neon](https://neon.tech) (free tier)

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd limelink

# Install dependencies
npm install
```

## Step 2: Set Up Database (Neon - Free)

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Copy the connection string (it looks like):
   ```
   postgresql://username:password@host/database?sslmode=require
   ```

## Step 3: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your database URL
```

Your `.env.local` should look like:

```env
# Database (from Neon)
DATABASE_URL="postgresql://username:password@ep-xxx.ap-southeast-1.aws.neon.tech/database?sslmode=require"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Generate a random secret (run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET="your-super-secret-key-change-this-in-production"

# For production cron jobs (can skip for local dev)
CRON_SECRET="another-random-secret"

# For webhook signing (can skip for local dev)
WEBHOOK_SECRET="webhook-signing-secret"
```

## Step 4: Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

## Step 5: Start Development Server

```bash
# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 6: Create First User (Manual)

Since auth is basic, you need to create a user in the database:

```bash
# Open Prisma Studio
npx prisma studio
```

1. Go to `User` table
2. Click "Add record"
3. Fill in:
   - `email`: your@email.com
   - `password`: `$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYA.qGZvKG6G` (this is "password123" hashed)
   - `name`: Your Name
4. Save

Now you can log in with:
- Email: your@email.com
- Password: password123

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npx prisma migrate dev   # Create migration
npx prisma migrate deploy # Deploy migrations
npx prisma generate      # Generate Prisma client
npx prisma studio        # Open database GUI
npx prisma db seed       # Run seed script

# Code quality
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript checks
```

## Troubleshooting

### "Cannot find module '@prisma/client'"
```bash
npx prisma generate
```

### "Database connection failed"
- Check your `DATABASE_URL` in `.env.local`
- Make sure it includes `?sslmode=require`
- Verify Neon database is active

### "JWT_SECRET is required"
Generate a secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Port 3000 is already in use
```bash
# Kill process on port 3000 (Windows)
npx kill-port 3000

# Or use a different port
npm run dev -- --port 3001
```

## Next Steps

1. **Create a team** - After logging in, create your first team
2. **Create a project** - Add a project within your team
3. **Add a monitor** - Start monitoring your first website
4. **Check the dashboard** - View metrics and status

## Production Deployment (Vercel)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo>
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure environment variables (same as `.env.local`):
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL)
   - `CRON_SECRET` (generate random string)
   - `WEBHOOK_SECRET` (generate random string)
5. Click Deploy

### 3. Configure Cron Job

Add to Vercel project settings:

1. Go to Project Settings → Cron Jobs
2. Add new cron job:
   - Path: `/api/cron/checks`
   - Schedule: `*/1 * * * *` (every minute)
3. Or use `vercel.json` (already included):
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/checks",
         "schedule": "*/1 * * * *"
       }
     ]
   }
   ```

### 4. Verify Deployment

```bash
# Check health endpoint
curl https://your-app.vercel.app/api/health

# Should return:
# {"status":"healthy","timestamp":"...","version":"1.0.0"}
```

## Database Migrations in Production

```bash
# Deploy migrations to production database
npx prisma migrate deploy
```

**Note:** Run this after deploying new code that has schema changes.

## System Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| Node.js | 18.x | 20.x LTS |
| RAM | 512 MB | 1 GB |
| Disk | 1 GB | 5 GB |
| Database | PostgreSQL 13+ | PostgreSQL 15+ |

## Folder Structure

```
limelink/
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── (app)/         # Protected routes
│   │   ├── api/           # API routes
│   │   └── ...
│   ├── components/        # React components
│   ├── lib/               # Utilities, auth, prisma
│   ├── services/          # Business logic
│   └── types/             # TypeScript types
├── .env.local             # Environment variables
├── package.json
└── README.md
```

## Getting Help

1. Check logs: `npm run dev` output
2. Database issues: `npx prisma studio`
3. Check [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for architecture details
4. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design

## Updating

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Run migrations if needed
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate

# Restart dev server
npm run dev
```

---

**You're all set!** Start monitoring at http://localhost:3000 🚀
