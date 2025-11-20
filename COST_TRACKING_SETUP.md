# Cost Tracking Setup Guide

## Issue: "Failed to fetch campaign cost data"

If you're seeing this error, it means the new cost tracking database tables haven't been created yet.

## Solution

Follow these steps to enable persistent cost tracking:

### 1. Start the PostgreSQL Database

Using Docker Compose:

```bash
docker-compose up -d
```

Or if you're using Colima:

```bash
# Start Colima if not running
colima start

# Then start the database
docker-compose up -d
```

Verify the database is running:

```bash
docker ps | grep postgres
```

### 2. Apply the Database Migration

Once the database is running, apply the new migration:

```bash
npx prisma migrate dev
```

This will create two new tables:
- `SessionCostSnapshot` - Stores persistent cost data for each session
- `CampaignCostAggregate` - Stores aggregated campaign costs

### 3. Regenerate Prisma Client

```bash
npx prisma generate
```

### 4. Restart Your Development Server

```bash
npm run dev
```

## How It Works

### Before Migration Applied
- Cost Analytics will show a "Failed to fetch" error
- The system falls back to calculating costs from live messages only
- Costs are NOT persisted when sessions are deleted

### After Migration Applied
- Cost Analytics displays full cost history
- Costs are automatically saved after each AI message
- Costs persist even when sessions are deleted
- Campaign totals include all historical session costs

## Verifying It Works

1. Go to a campaign page
2. Click the "Cost Analytics" tab
3. You should see cost data (even if $0.00 for new campaigns)
4. Send some messages in a session
5. Return to Cost Analytics - costs should update automatically

## Troubleshooting

### Database Connection Issues

Check your `.env` file contains:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_rpg_manager?schema=public"
```

### Migration Already Applied?

Check if tables exist:
```bash
npx prisma studio
```

Look for `SessionCostSnapshot` and `CampaignCostAggregate` in the model list.

### Reset Database (Warning: Deletes All Data)

If you need to start fresh:
```bash
npx prisma migrate reset
```

This will:
- Drop all tables
- Re-apply all migrations
- Optionally seed data

## Features Enabled After Setup

✅ **Persistent Cost Storage** - Costs saved automatically  
✅ **Historical Data** - Deleted sessions still count toward campaign totals  
✅ **Real-time Updates** - Costs update after each AI message  
✅ **Budget Tracking** - Visual warnings when approaching cost limits  
✅ **Session Analytics** - Per-session cost breakdown with dates  
✅ **Campaign Analytics** - Overall campaign cost trends and totals  

## Cost Tracking Pricing

Default pricing (configurable via environment variables):
- Prompt tokens: $0.00015 per 1K tokens
- Completion tokens: $0.0006 per 1K tokens
- Cost warning threshold: $1.00
- Cost limit threshold: $5.00

To customize, add to your `.env`:
```
OPENAI_PRICE_PER_1K_PROMPT_TOKENS=0.00015
OPENAI_PRICE_PER_1K_COMPLETION_TOKENS=0.0006
COST_WARNING_THRESHOLD_USD=1.00
COST_LIMIT_THRESHOLD_USD=5.00
```

