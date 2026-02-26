# AI RPG Manager

> An AI-powered Dungeon Master for epic tabletop RPG adventures

AI RPG Manager is a professional-grade full-stack web application that brings AI assistance to your tabletop role-playing game sessions. Built with modern web technologies and following industry best practices, this project showcases enterprise-level development skills including full test coverage, CI/CD pipelines, and multi-environment deployment.

## 🎯 Project Goals

This is a **showcase project** demonstrating:

- ✅ Full-stack development with Next.js and TypeScript
- ✅ Professional testing practices (80%+ coverage)
- ✅ CI/CD pipeline with GitHub Actions
- ✅ Multi-environment deployment (test/preprod/prod)
- ✅ Cost-effective architecture
- ✅ AI integration with proper controls
- ✅ Clean code and documentation

## ✨ Features

### Fully Implemented (UI + Backend)

- ✅ **Campaign Management** - Create, view, edit, and delete RPG campaigns with custom world settings
- ✅ **AI Dungeon Master** - GPT-powered storytelling with context-aware responses
- ✅ **Session Tracking** - Interactive chat interface with full conversation history
- ✅ **Cost Analytics** - Real-time cost tracking and campaign-level analytics dashboard
- ✅ **Character Creation** - Add characters with stats, backstory, and movement capabilities

### Advanced Features (Backend Complete, UI In Development)

- 🔧 **3D Spatial Location System** - Track character positions in 3D space with distance-based interactions
  - Line of sight calculations
  - Cover system (D&D 5e compatible)
  - Movement validation and AI-suggested movements
  - Turn-based movement with modifiers
  - See [Spatial System Documentation](docs/SPATIAL_SYSTEM.md)
- 🔧 **Knowledge Base Management** - Store and query campaign lore, NPCs, locations, and world facts
- 🔧 **Tone Profiles** - Dynamic AI response style based on context
- 🔧 **Mechanics Rules** - Context-aware game mechanics integration
- 🔧 **Character Editing** - Full character lifecycle management

### Technical Highlights

- **Full TypeScript** - Type safety throughout the entire stack
- **Responsive UI** - Modern, beautiful interface with Tailwind CSS
- **RESTful API** - Well-structured API routes following REST principles
- **Database-Backed** - PostgreSQL with Prisma ORM
- **Comprehensive Testing** - Unit, integration, and E2E tests
- **Production-Ready** - Error handling, validation, and monitoring
- **Cost Optimization** - 50-60% token reduction through intelligent context management

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database
- OpenAI API key

### Local Development

1. **Clone the repository**

```bash
git clone https://github.com/Filchgit/ai-rpg-manager.git
cd ai-rpg-manager
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DATABASE_URL="postgresql://rpguser:rpgpassword@localhost:5432/ai_rpg_manager"
OPENAI_API_KEY="your-openai-api-key"
```

4. **Start PostgreSQL with Docker**

```bash
docker-compose up -d
```

5. **Run database migrations**

```bash
npm run prisma:migrate
```

6. **Generate Prisma Client**

```bash
npm run prisma:generate
```

7. **Start the development server**

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Unit Tests

```bash
npm run test:watch
```

### Test Coverage

```bash
npm run test:coverage
```

### E2E Tests

```bash
npm run test:e2e
```

### Linting

```bash
npm run lint
```

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 19, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes, TypeScript |
| **Database** | PostgreSQL, Prisma ORM |
| **AI** | OpenAI GPT-4o-mini |
| **Testing** | Jest, React Testing Library, Playwright |
| **CI/CD** | GitHub Actions |
| **Deployment** | Vercel |
| **Monitoring** | Vercel Analytics, OpenAI Dashboard |

## 🏗️ Project Structure

```
ai-rpg-manager/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── campaigns/         # Campaign pages
│   └── sessions/          # Session pages
├── components/            # React components
├── lib/                   # Utilities and services
│   ├── db.ts             # Database client
│   ├── openai.ts         # OpenAI service
│   └── rate-limit.ts     # Rate limiting
├── services/              # Business logic layer
│   ├── campaign-service.ts
│   ├── session-service.ts
│   ├── character-service.ts
│   └── ai-dungeon-master.ts
├── types/                 # TypeScript types
├── tests/                 # Test suites
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── prisma/               # Database schema
├── docs/                 # Documentation
└── .github/workflows/    # CI/CD pipelines
```

## 🚢 Deployment

This project uses a professional multi-environment deployment strategy:

- **Test** - Automatically deployed on push to main
- **Preprod** - Manual deployment for final validation
- **Production** - Manual deployment with extra confirmation

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

## 📚 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md) - System design and decisions
- [Deployment Guide](docs/DEPLOYMENT.md) - Step-by-step deployment instructions
- [Spatial Location System](docs/SPATIAL_SYSTEM.md) - 3D positioning and movement mechanics
- [Cost Optimization](docs/COST_OPTIMIZATION.md) - AI cost reduction strategies
- [Movement Detection Testing](docs/MOVEMENT_DETECTION_TESTING.md) - Testing AI movement suggestions

## 🔐 Security

- API keys stored as environment variables
- Input validation with Zod schemas
- Rate limiting to prevent abuse
- SQL injection prevention via Prisma
- HTTPS-only in production

## 💰 Cost Management

### OpenAI API Costs

- Using `gpt-4o-mini` model (most cost-effective)
- Token limits per request (500 default)
- Rate limiting per session (20 requests/hour default)
- Configurable limits per environment

### Estimated Monthly Costs

- **Free Tier**: $0 (Vercel Hobby + Supabase Free + moderate OpenAI usage)
- **Low Usage**: $5-10/month (mostly OpenAI API)
- **Medium Usage**: $20-30/month

## 🧑‍💻 Development Practices

### Code Quality

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Git hooks for pre-commit checks

### Testing Strategy

- **Unit Tests** - Service layer and utilities
- **Integration Tests** - API routes and database
- **E2E Tests** - Critical user flows
- **Coverage Target** - 80%+ across all layers

### Git Workflow

- `main` branch - Production-ready code
- Feature branches - New development
- Pull requests required for main
- Automated CI on all PRs

## 🗺️ Roadmap

### In Progress

- **Spatial System UI Components** - Visual map viewer, movement confirmation dialogs, location editor
- **Knowledge Base UI Integration** - Add knowledge management interface to campaign pages
- **Character Management Completion** - Edit and delete character functionality
- **Rate Limiting Visibility** - UI indicators for API rate limit status

### Planned Enhancements

- **User Authentication** - Role-based access (Administrator, Dungeon Master, Player)
- **Pathfinding** - Automatic route calculation around obstacles
- **Visual Map Editor** - Drag-and-drop location and feature creation
- **Image Generation** - DALL-E integration for scene visualization
- **Real-time Collaboration** - Multiple players in the same session
- **Campaign Sharing** - Public campaign templates and sharing

### Technical Debt

- Complete E2E test coverage for spatial system
- Add automated tests for UI components
- Implement vector embeddings for semantic knowledge search

## 🤝 Contributing

While this is a personal showcase project, suggestions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 👤 Author

**John MacAulay**
- GitHub: [@Filchgit](https://github.com/Filchgit)

## 🙏 Acknowledgments

- OpenAI for GPT API
- Vercel for hosting
- The Next.js team for the framework
- The open-source community

---

**Built with ❤️ to showcase professional full-stack development skills**
