# Wyndo - Job Management Software

> Job management that doesn't cost per head. Finally, software that works offline.

Wyndo is a comprehensive job management platform designed to outperform Tradify and Squeegee with:
- **Team-based pricing** (5 users for £29/month vs Tradify's per-user model)
- **Offline-first architecture** (works fully offline)
- **Unique features** (invoice consolidation, asset register, inventory management)
- **Superior UX** (transparent pricing, no watermarks, better onboarding)

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** 8+ (`npm install -g pnpm`)
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))

### Installation Steps

1. **Install dependencies**
   ```bash
   cd /Users/michaeloddoye/Desktop/Window-cleaning
   pnpm install
   ```

2. **Create environment file**
   ```bash
   # Create a .env file in the project root with:
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wyndo?schema=public"
   JWT_SECRET="wyndo-dev-secret-change-in-production-abc123"
   ENCRYPTION_KEY="wyndo-dev-encryption-key-32char"
   NODE_ENV="development"
   PORT=3001
   ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
   APP_URL="http://localhost:3000"
   ```

3. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb wyndo
   
   # Or using psql:
   psql -U postgres -c "CREATE DATABASE wyndo;"
   ```

4. **Generate Prisma Client and run migrations**
   ```bash
   cd services/api
   npx prisma generate --schema=../../packages/database/prisma/schema.prisma
   npx prisma migrate dev --schema=../../packages/database/prisma/schema.prisma --name init
   ```

5. **Start the development server**
   ```bash
   cd services/api
   pnpm dev
   ```

6. **Verify it's working**
   ```bash
   curl http://localhost:3001/health
   ```

   Should return:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-01-01T00:00:00.000Z",
     "environment": "development"
   }
   ```

## 📁 Project Structure

```
wyndo/
├── apps/
│   ├── web/              # Next.js web application (coming soon)
│   └── mobile/           # React Native app (coming soon)
├── packages/
│   ├── database/         # Prisma schema and migrations
│   └── shared/           # Shared types and utilities
├── services/
│   └── api/              # Backend API (Node.js/Express)
├── .env                  # Environment variables (create this)
└── README.md             # This file
```

## 🔧 API Endpoints

Once running, the API is available at `http://localhost:3001/api`

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/mfa/setup` - Setup MFA
- `POST /api/auth/mfa/enable` - Enable MFA
- `GET /api/auth/devices` - List devices

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `POST /api/customers/:id/sites` - Add site

### Jobs
- `GET /api/jobs` - List jobs
- `POST /api/jobs` - Create job
- `GET /api/jobs/:id` - Get job
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job
- `POST /api/jobs/:id/start` - Start job
- `POST /api/jobs/:id/complete` - Complete job
- `GET /api/jobs/schedule/calendar` - Calendar view

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice
- `PUT /api/invoices/:id` - Update invoice
- `POST /api/invoices/:id/send` - Send invoice (Professional+)
- `POST /api/invoices/:id/mark-paid` - Mark as paid
- `POST /api/invoices/consolidate` - Consolidate jobs (Business+)

### Subscriptions
- `GET /api/subscriptions` - Get current subscription
- `GET /api/subscriptions/plans` - List all plans

## 🔐 Security Features

- Password hashing with Argon2
- JWT tokens with short expiry (15min access, 7d refresh)
- Multi-factor authentication (TOTP)
- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection prevention via Prisma ORM
- HTTPS/TLS enforcement
- CORS protection

## 🧪 Testing the API

### Register a new user
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "TestPassword123", "name": "Test User"}'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "TestPassword123"}'
```

### Create a customer (with auth token)
```bash
curl -X POST http://localhost:3001/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"name": "John Smith", "email": "john@example.com", "phone": "01onal234567890"}'
```

## 📝 License

Proprietary - All rights reserved

## 🤝 Support

Built as a Tradify and Squeegee competitor with:
- Better pricing (team-based, not per-user)
- Full offline capability
- Professional features without watermarks
- Transparent pricing
