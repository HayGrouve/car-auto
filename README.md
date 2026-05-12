# Alisa (Алиса) — Car Service CRM

A CRM and workshop operations app for **car services** (auto repair, maintenance, and scheduling), built with Next.js 15, React 19, and Convex. This repository is being **refactored** from a veterinary (“zoo”) product: domain names in code and routes still say owners/animals in places, but the product direction is car service—customers, vehicles, jobs, appointments, and billing.

## Features

- **Customer management**: Register and manage vehicle owners with GDPR-oriented tooling
- **Vehicle records**: Track vehicles linked to customers, history, and related notes (module naming still reflects the legacy “animals” codebase during migration)
- **Service visits / jobs**: Create and manage workshop visits with structured notes
- **Appointment scheduling**: Schedule and manage appointments with calendar views
- **Billing & invoicing**: Invoices and payment tracking
- **PDF generation**: Documents such as visit summaries and invoices (legacy certificate flows may remain until replaced)
- **Bulgarian localization**: Bulgarian-first UI where applicable
- **GDPR-related tooling**: Consent and data-protection features carried over from the clinic app

## Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Backend**: Convex (database and serverless functions)
- **Authentication**: JWT-based authentication with httpOnly cookies
- **PDF Generation**: jsPDF
- **Form Validation**: Zod
- **Icons**: Lucide React

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or later
- **pnpm** 8.x or later (package manager)
- **Convex account** (sign up at https://convex.dev)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd auto
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Convex

1. Sign up for a Convex account at https://convex.dev
2. Install Convex CLI globally (if not already installed):
   ```bash
   npm install -g convex
   ```
3. Login to Convex:
   ```bash
   npx convex login
   ```
4. Initialize Convex in your project:
   ```bash
   npx convex dev
   ```
5. Copy the deployment URL from the Convex dashboard (format: `https://your-deployment.convex.cloud`)

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Node environment
NODE_ENV=development

# JWT secret key (minimum 32 characters)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-secret-key-minimum-32-characters-long

# Single user email for authentication
SINGLE_USER_EMAIL=admin@service.local

# Password hash (generate with bcrypt)
# Generate with: node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('your-password', 10).then(h=>console.log(h))"
SINGLE_USER_PASSWORD_HASH=

# Development fallback password (remove in production)
SINGLE_USER_PASSWORD=your-dev-password

# Convex deployment URL (from step 3)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### 5. Run Development Server

```bash
pnpm dev
```

The application will be available at http://localhost:3000

### 6. Build for Production

```bash
pnpm build
pnpm start
```

## Environment Variables

### Required Variables

| Variable | Description | Required For |
|----------|-------------|--------------|
| `NODE_ENV` | Environment mode (`development`, `test`, `production`) | All |
| `JWT_SECRET` | Secret key for JWT tokens (min 32 chars) | All |
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL | All |
| `SINGLE_USER_EMAIL` | Admin user email | All |
| `SINGLE_USER_PASSWORD_HASH` | Bcrypt hash of admin password | Production |
| `SINGLE_USER_PASSWORD` | Plain password (dev only) | Development |

### Generating Secrets

**JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Password Hash:**
```bash
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('your-password', 10).then(h=>console.log(h))"
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in Vercel
3. Configure environment variables in Vercel dashboard:
   - Add all required variables from `.env.local`
   - **Important**: Remove `SINGLE_USER_PASSWORD` in production
   - Ensure `NODE_ENV=production`
   - Set `NEXT_PUBLIC_CONVEX_URL` to your production Convex deployment
4. Deploy

### Convex Deployment

Deploy your Convex backend:
```bash
npx convex deploy --prod
```

### Environment Variables in Production

**Critical Security Notes:**
- Never use `SINGLE_USER_PASSWORD` in production
- Always use `SINGLE_USER_PASSWORD_HASH` with a bcrypt hash
- Use strong, randomly generated `JWT_SECRET` (32+ characters)
- Use different secrets for each environment
- Store secrets securely using your platform's environment variable management

## Architecture

### High-Level Overview

```
┌─────────────────┐
│   Next.js App   │
│  (Frontend)     │
└────────┬────────┘
         │
         │ HTTP/WebSocket
         │
┌────────▼────────┐
│  Convex Backend │
│  (Database +    │
│   Functions)    │
└─────────────────┘
```

### Key Design Decisions

1. **Single-User Authentication**: MVP uses a single admin account for simplicity
2. **Convex Backend**: Real-time database with automatic reactivity
3. **JWT Tokens**: Stateless authentication with httpOnly cookies for security
4. **Bulgarian First**: Primary language is Bulgarian where the product is localized, with English code comments
5. **GDPR-oriented features**: Consent and data protection inherited from the previous clinic product

### Data Flow

1. User interacts with React components
2. Components use Convex hooks (`useQuery`, `useMutation`) for data
3. Convex automatically syncs data in real-time
4. API routes handle authentication (JWT validation)
5. Middleware protects routes and validates tokens

## API Documentation

### Authentication Endpoints

#### POST `/api/auth/login`

Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "admin@service.local",
  "password": "your-password"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "ok": true
  }
}
```
Sets httpOnly cookie `tm_jwt` with JWT token.

**Response (Error):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials"
  }
}
```

#### POST `/api/auth/logout`

Logout user and clear authentication cookie.

**Response:**
```json
{
  "success": true,
  "data": {
    "ok": true
  }
}
```

### Error Response Format

All API endpoints follow a standardized error format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Optional additional details (development only)"
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR`: Request validation failed
- `UNAUTHORIZED`: Authentication required or invalid credentials
- `NOT_FOUND`: Resource not found
- `INTERNAL_ERROR`: Server error
- `BAD_REQUEST`: Invalid request

## Project Structure

Legacy route and Convex module names (`owners`, `animals`) are still in the tree while the refactor proceeds—they correspond to **customers** and **vehicles** in the car-service domain.

```
auto/
├── convex/              # Convex backend functions and schema
│   ├── animals.ts       # Vehicle records (legacy file name)
│   ├── owners.ts        # Customer records (legacy file name)
│   ├── visits.ts        # Service visits / jobs
│   ├── invoices.ts      # Invoice management
│   ├── schedule.ts      # Scheduling
│   ├── auditLogs.ts     # Audit log functions
│   ├── seed.ts          # Seed data helper
│   └── dashboard.ts     # Dashboard queries
├── src/
│   ├── app/             # Next.js App Router pages
│   │   ├── api/         # API routes
│   │   ├── animals/     # Vehicle UI (legacy path)
│   │   ├── owners/      # Customer UI (legacy path)
│   │   ├── visits/      # Visit pages
│   │   └── ...
│   ├── components/      # React components
│   │   ├── ui/          # shadcn/ui components
│   │   └── ...
│   ├── lib/             # Utility functions
│   │   ├── auth.ts      # Authentication utilities
│   │   ├── jwt.ts       # JWT handling
│   │   └── ...
│   └── hooks/           # Custom React hooks
├── public/              # Static assets
└── scripts/             # Utility scripts
```

## Development

### Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint errors
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm format:check` - Check code formatting
- `pnpm format:write` - Format code with Prettier
- `pnpm check` - Run lint and typecheck

### Code Style

- TypeScript strict mode enabled
- ESLint with Next.js config
- Prettier for code formatting
- Tailwind CSS for styling

## Troubleshooting

### Convex Connection Issues

If you see connection errors:
1. Verify `NEXT_PUBLIC_CONVEX_URL` is set correctly
2. Check Convex deployment status
3. Ensure Convex functions are deployed: `npx convex deploy`

### Authentication Issues

If login fails:
1. Verify `JWT_SECRET` is set (minimum 32 characters)
2. Check `SINGLE_USER_EMAIL` matches login email
3. Ensure password hash is correct (or use dev password)

### Build Errors

If build fails:
1. Run `pnpm install` to ensure dependencies are installed
2. Check environment variables are set
3. Run `pnpm typecheck` to identify TypeScript errors

## License

[Add your license here]

## Support

For issues and questions, please [create an issue](link-to-issues) or contact [your contact information].
