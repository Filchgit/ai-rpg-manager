# Deployment Guide

This guide walks you through deploying the AI RPG Manager to test, preprod, and production environments using Vercel.

## Prerequisites

- GitHub account: **Filchgit**
- Vercel account (connected to Filchgit)
- OpenAI API key
- PostgreSQL databases for each environment

## Step 1: Create GitHub Repository

1. Go to https://github.com/Filchgit
2. Create a new repository named `ai-rpg-manager`
3. Initialize with this codebase:

```bash
cd /Users/John.MacAulay/CursorExperiments/ai-rpg-manager
git remote add origin https://github.com/Filchgit/ai-rpg-manager.git
git branch -M main
git push -u origin main
```

## Step 2: Set Up Vercel Project

1. Go to https://vercel.com and sign in
2. Click "Add New Project"
3. Import the `Filchgit/ai-rpg-manager` repository
4. Configure the project:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npx prisma generate && npm run build`
   - Install Command: `npm ci`

## Step 3: Set Up Databases

### Option A: Vercel Postgres (Recommended)

1. In your Vercel project, go to "Storage" tab
2. Create three Postgres databases:
   - `ai-rpg-test`
   - `ai-rpg-preprod`
   - `ai-rpg-prod`
3. Copy the connection strings for each

### Option B: External PostgreSQL (e.g., Supabase)

1. Create three projects at https://supabase.com
2. Get the connection strings from project settings

## Step 4: Configure Environment Variables

### In Vercel Dashboard

For each environment (test, preprod, production):

**Test Environment:**
```
DATABASE_URL=<your-test-database-url>
OPENAI_API_KEY=<your-openai-api-key>
MAX_TOKENS_PER_REQUEST=500
MAX_REQUESTS_PER_SESSION=20
RATE_LIMIT_WINDOW_MS=3600000
NODE_ENV=test
```

**Preprod Environment:**
```
DATABASE_URL=<your-preprod-database-url>
OPENAI_API_KEY=<your-openai-api-key>
MAX_TOKENS_PER_REQUEST=500
MAX_REQUESTS_PER_SESSION=30
RATE_LIMIT_WINDOW_MS=3600000
NODE_ENV=production
```

**Production Environment:**
```
DATABASE_URL=<your-prod-database-url>
OPENAI_API_KEY=<your-openai-api-key>
MAX_TOKENS_PER_REQUEST=1000
MAX_REQUESTS_PER_SESSION=50
RATE_LIMIT_WINDOW_MS=3600000
NODE_ENV=production
```

## Step 5: Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

```
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-vercel-org-id>
VERCEL_PROJECT_ID=<your-vercel-project-id>

TEST_DATABASE_URL=<test-database-url>
TEST_OPENAI_API_KEY=<your-openai-key>

PREPROD_DATABASE_URL=<preprod-database-url>
PREPROD_OPENAI_API_KEY=<your-openai-key>

PROD_DATABASE_URL=<prod-database-url>
PROD_OPENAI_API_KEY=<your-openai-key>
```

To get your Vercel credentials:
1. Go to https://vercel.com/account/tokens
2. Create a new token
3. Get your Org ID from team settings
4. Get Project ID from project settings

## Step 6: Run Database Migrations

For each environment, run:

```bash
# Test
DATABASE_URL="<test-db-url>" npx prisma migrate deploy

# Preprod
DATABASE_URL="<preprod-db-url>" npx prisma migrate deploy

# Production
DATABASE_URL="<prod-db-url>" npx prisma migrate deploy
```

## Step 7: Deploy

### Automatic Deployment to Test

Push to main branch triggers automatic deployment to test:

```bash
git push origin main
```

### Manual Deployment to Preprod

1. Go to GitHub repository → Actions
2. Select "Deploy to Preprod Environment"
3. Click "Run workflow"
4. Type "deploy" and confirm

### Manual Deployment to Production

1. Go to GitHub repository → Actions
2. Select "Deploy to Production"
3. Click "Run workflow"
4. Type "deploy-production" and confirm

## Environment URLs

After deployment, your environments will be available at:

- **Test**: `https://ai-rpg-manager-<hash>.vercel.app`
- **Preprod**: `https://ai-rpg-preprod.vercel.app`
- **Production**: `https://ai-rpg-manager.vercel.app`

## Monitoring

### Cost Monitoring

1. OpenAI Dashboard:
   - Track API usage at https://platform.openai.com/usage
   - Set up billing alerts

2. Vercel Dashboard:
   - Monitor bandwidth and function invocations
   - Check for rate limits

### Application Monitoring

Check the following regularly:

- Error logs in Vercel dashboard
- Database connection pool status
- Rate limit hit counts
- Response times

## Rollback Procedure

If you need to rollback a deployment:

1. Go to Vercel project → Deployments
2. Find the last stable deployment
3. Click "Promote to Production"

Or use the CLI:

```bash
vercel rollback <deployment-url>
```

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
DATABASE_URL="<your-url>" npx prisma db execute --stdin <<< "SELECT 1;"
```

### Migration Issues

```bash
# Reset database (CAUTION: Deletes all data)
DATABASE_URL="<your-url>" npx prisma migrate reset

# View migration status
DATABASE_URL="<your-url>" npx prisma migrate status
```

### Build Failures

1. Check build logs in Vercel
2. Verify all environment variables are set
3. Test build locally:

```bash
npm run build
```

## Cost Optimization

### OpenAI API Costs

- Test environment: Limit to 20 requests/session
- Monitor token usage in dashboard
- Use `gpt-4o-mini` model (cheaper than GPT-4)
- Set monthly budget alerts

### Vercel Costs

- Stay within hobby plan limits (100GB bandwidth)
- Optimize images and assets
- Use CDN caching effectively

### Database Costs

- Use Vercel Postgres free tier (256MB)
- Or Supabase free tier (500MB)
- Regular cleanup of old sessions/messages

