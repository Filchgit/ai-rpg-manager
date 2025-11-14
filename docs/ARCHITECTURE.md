# Architecture Documentation

## System Overview

AI RPG Manager is a full-stack web application built with Next.js that enables users to run interactive tabletop RPG sessions with AI assistance. The system uses OpenAI's GPT models to act as a Dungeon Master, dynamically responding to player actions within the context of custom campaigns.

## Technology Stack

### Frontend
- **Next.js 14+** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma** - ORM for database access
- **PostgreSQL** - Relational database
- **OpenAI API** - AI text generation

### Testing
- **Jest** - Unit and integration testing
- **React Testing Library** - Component testing
- **Playwright** - End-to-end testing

### Deployment
- **Vercel** - Hosting and serverless functions
- **GitHub Actions** - CI/CD pipeline

## Architecture Patterns

### Layered Architecture

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│   (React Components, Pages)             │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│          API Layer                      │
│   (Next.js API Routes)                  │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│         Service Layer                   │
│   (Business Logic)                      │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│      Data Access Layer                  │
│   (Prisma ORM)                          │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│         Database                        │
│   (PostgreSQL)                          │
└─────────────────────────────────────────┘
```

### Key Design Decisions

#### 1. Next.js Full-Stack Framework

**Decision**: Use Next.js with API routes instead of separate frontend/backend

**Rationale**:
- Simplified deployment (single application)
- Reduced infrastructure costs
- Server-side rendering capabilities
- Built-in API routing
- TypeScript throughout entire stack

#### 2. Serverless Architecture

**Decision**: Deploy as serverless functions on Vercel

**Rationale**:
- Cost-effective (pay per execution)
- Auto-scaling
- Zero infrastructure management
- Excellent for bursty traffic patterns

#### 3. Rate Limiting Strategy

**Decision**: Implement session-based rate limiting with database tracking

**Rationale**:
- Prevent excessive OpenAI API costs
- Fair usage across users
- Trackable and auditable
- Configurable per environment

#### 4. AI Context Management

**Decision**: Send last 10 messages as context to AI

**Rationale**:
- Balance between context and token costs
- Recent history most relevant for storytelling
- Prevents context window overflow
- Predictable token usage

## Data Model

### Core Entities

```
Campaign
├── id: string (CUID)
├── name: string
├── description: string?
├── worldSettings: text?
├── aiGuidelines: text?
├── sessions: Session[]
└── characters: Character[]

Session
├── id: string (CUID)
├── campaignId: string
├── name: string
├── status: enum (ACTIVE, PAUSED, COMPLETED)
├── notes: text?
├── messages: Message[]
└── campaign: Campaign

Character
├── id: string (CUID)
├── campaignId: string
├── name: string
├── race: string?
├── class: string?
├── level: number
├── stats: JSON?
├── backstory: text?
└── campaign: Campaign

Message
├── id: string (CUID)
├── sessionId: string
├── role: enum (USER, ASSISTANT, SYSTEM)
├── content: text
├── tokenCount: number?
├── metadata: JSON?
└── session: Session

RateLimit
├── id: string (CUID)
├── sessionId: string
├── requestCount: number
├── tokenCount: number
└── windowStart: datetime
```

## API Design

### RESTful Endpoints

**Campaigns**
- `GET /api/campaigns` - List all campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get campaign details
- `PATCH /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

**Sessions**
- `POST /api/sessions` - Create session
- `GET /api/sessions/:id` - Get session details
- `PATCH /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session

**Messages**
- `GET /api/sessions/:id/messages` - Get session messages
- `POST /api/sessions/:id/messages` - Send message (triggers AI)

**Characters**
- `POST /api/characters` - Create character
- `GET /api/characters/:id` - Get character details
- `PATCH /api/characters/:id` - Update character
- `DELETE /api/characters/:id` - Delete character

### Request/Response Flow

```
User Action (Frontend)
    ↓
API Route Handler
    ↓
Request Validation (Zod)
    ↓
Service Layer
    ↓
├─ Rate Limit Check
├─ Database Operations (Prisma)
└─ AI Service Call (OpenAI)
    ↓
Response Formatting
    ↓
Return to Frontend
```

## AI Integration

### Prompt Engineering

The AI Dungeon Master uses a structured prompt system:

1. **System Prompt** - Defines role and behavior
2. **Campaign Context** - World settings and guidelines
3. **Recent History** - Last 10 message exchanges
4. **User Input** - Current player action

### Cost Control Mechanisms

1. **Token Limits**
   - Max 500 tokens per request (test/preprod)
   - Max 1000 tokens per request (production)

2. **Rate Limiting**
   - 20 requests per session per hour (test)
   - 50 requests per session per hour (production)

3. **Model Selection**
   - Using `gpt-4o-mini` for cost efficiency
   - Can easily swap to other models via config

## Security Considerations

### API Key Protection
- OpenAI API key stored as environment variable
- Never exposed to client-side code
- Different keys per environment

### Input Validation
- Zod schemas validate all API inputs
- Maximum content lengths enforced
- SQL injection prevented by Prisma

### Rate Limiting
- Prevents abuse and cost overruns
- Per-session tracking
- Configurable thresholds

## Performance Optimization

### Database
- Indexed fields for common queries
- Connection pooling via Prisma
- Cascading deletes to prevent orphaned records

### Frontend
- Client-side state management
- Optimistic UI updates
- Lazy loading of routes

### Caching
- Prisma query result caching
- Static asset caching via Vercel CDN

## Scalability

### Horizontal Scaling
- Serverless functions auto-scale
- Database connection pooling
- Stateless API design

### Vertical Scaling
- Database can be upgraded as needed
- Vercel function memory configurable

## Monitoring and Observability

### Metrics to Track
1. OpenAI API usage and costs
2. Database query performance
3. API response times
4. Error rates
5. Rate limit hits

### Logging Strategy
- Error logs in Vercel
- API call metadata in database
- Token usage per message

## Future Enhancements

### Potential Improvements
1. **AI Image Generation** - Character/scene illustrations
2. **Real-time Multiplayer** - WebSocket support
3. **Voice Interface** - Text-to-speech/speech-to-text
4. **Advanced Character Sheets** - Full D&D 5e stats
5. **Dice Rolling** - Built-in dice roller with physics
6. **Campaign Sharing** - Publish campaigns for others
7. **AI Model Selection** - Let users choose model
8. **Cost Dashboard** - User-facing usage tracking

