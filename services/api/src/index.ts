/**
 * Wyndo API Server
 * Main entry point for the backend API
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { authRouter } from './routes/auth';
import { customersRouter } from './routes/customers';
import { jobsRouter } from './routes/jobs';
import { invoicesRouter } from './routes/invoices';
import { quotesRouter } from './routes/quotes';
import { paymentsRouter } from './routes/payments';
import { subscriptionRouter } from './routes/subscriptions';
import { syncRouter } from './routes/sync';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true,
}));

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.env === 'production' ? 100 : 1000,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', globalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env,
    version: '1.0.0',
  });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/subscriptions', subscriptionRouter);
app.use('/api/sync', syncRouter);

// Error handling (must be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = config.port || 3001;

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║   🚀 Wyndo API Server                                      ║');
  console.log('║                                                            ║');
  console.log(`║   Server running on: http://localhost:${PORT}                 ║`);
  console.log(`║   Environment: ${config.env.padEnd(42)}║`);
  console.log(`║   Health check: http://localhost:${PORT}/health              ║`);
  console.log('║                                                            ║');
  console.log('║   API Endpoints:                                           ║');
  console.log('║   • POST /api/auth/register - Register new user            ║');
  console.log('║   • POST /api/auth/login - Login                           ║');
  console.log('║   • GET  /api/customers - List customers                   ║');
  console.log('║   • GET  /api/jobs - List jobs                             ║');
  console.log('║   • GET  /api/invoices - List invoices                     ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
});
