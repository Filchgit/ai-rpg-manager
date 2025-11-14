# Local Development Setup

Complete guide for setting up the AI RPG Manager on your local machine.

## Prerequisites

### Required Software

- **Node.js** - Version 20 or higher
  - Download: https://nodejs.org/
  - Verify: `node --version`

- **npm** - Comes with Node.js
  - Verify: `npm --version`

- **Docker Desktop** - For local PostgreSQL
  - Download: https://www.docker.com/products/docker-desktop
  - Verify: `docker --version`

- **Git** - For version control
  - Download: https://git-scm.com/
  - Verify: `git --version`

### Required Accounts

- **OpenAI Account** - For AI features
  - Sign up: https://platform.openai.com/signup
  - Get API key: https://platform.openai.com/api-keys

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Filchgit/ai-rpg-manager.git
cd ai-rpg-manager
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages defined in `package.json`.

### 3. Start PostgreSQL Database

Using Docker Compose (recommended):

```bash
docker-compose up -d
```

This starts a PostgreSQL database on `localhost:5432` with:
- Database: `ai_rpg_manager`
- Username: `rpguser`
- Password: `rpgpassword`

**Verify database is running:**

```bash
docker ps
```

You should see `ai-rpg-postgres` in the list.

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Database - matches docker-compose settings
DATABASE_URL="postgresql://rpguser:rpgpassword@localhost:5432/ai_rpg_manager"

# OpenAI - get from https://platform.openai.com/api-keys
OPENAI_API_KEY="sk-your-actual-openai-api-key-here"

# Cost Controls (defaults are fine for dev)
MAX_TOKENS_PER_REQUEST=500
MAX_REQUESTS_PER_SESSION=20
RATE_LIMIT_WINDOW_MS=60000

# Environment
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 5. Set Up Database

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run migrations to create tables:

```bash
npm run prisma:migrate
```

*Note: You'll be prompted to name the migration. You can use something like "init".*

**Verify tables were created:**

```bash
npm run prisma:studio
```

This opens Prisma Studio in your browser where you can view the database.

### 6. Start Development Server

```bash
npm run dev
```

The application will start at http://localhost:3000

**Expected output:**

```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

## Verify Everything Works

### 1. Check the Homepage

Open http://localhost:3000 in your browser. You should see the AI RPG Manager landing page.

### 2. Create a Campaign

1. Click "Get Started"
2. Click "Create Campaign"
3. Fill in the form:
   - Name: "Test Campaign"
   - Description: "My first campaign"
4. Click "Create Campaign"

You should see your new campaign in the list.

### 3. Test AI Integration

1. Click on your campaign
2. Click "New Session"
3. Name: "Session 1"
4. Click "Start Session"
5. Type a message: "I enter a dark forest"
6. Click "Send"

You should receive an AI-generated response from the Dungeon Master.

## Development Tools

### Prisma Studio

Visual database editor:

```bash
npm run prisma:studio
```

Opens at http://localhost:5555

### Run Tests

Unit tests:

```bash
npm test
```

With coverage:

```bash
npm run test:coverage
```

E2E tests (requires app to be running):

```bash
npm run test:e2e
```

### Linting

Check code quality:

```bash
npm run lint
```

### Type Checking

Verify TypeScript types:

```bash
npx tsc --noEmit
```

## Common Issues

### Port Already in Use

If port 3000 is taken:

```bash
PORT=3001 npm run dev
```

### Database Connection Error

Check if PostgreSQL is running:

```bash
docker ps
```

If not running, start it:

```bash
docker-compose up -d
```

### Prisma Client Not Found

Regenerate the client:

```bash
npm run prisma:generate
```

### OpenAI API Error

Verify your API key:

1. Check key at https://platform.openai.com/api-keys
2. Ensure it starts with `sk-`
3. Check you have credits/billing set up
4. Verify the key is correctly set in `.env`

### Migration Failed

Reset the database (CAUTION: Deletes all data):

```bash
npm run prisma:migrate reset
```

## Stopping Services

### Stop Next.js Dev Server

Press `Ctrl+C` in the terminal where dev server is running.

### Stop PostgreSQL

```bash
docker-compose down
```

To also remove data volumes:

```bash
docker-compose down -v
```

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system
- Check out [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- Explore the codebase structure
- Run the test suite
- Try adding new features

## Getting Help

If you encounter issues:

1. Check this document for common problems
2. Review error messages carefully
3. Check Docker and database logs: `docker-compose logs`
4. Verify environment variables are set correctly
5. Ensure all prerequisites are installed

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

