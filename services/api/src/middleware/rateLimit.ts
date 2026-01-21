import rateLimit from 'express-rate-limit';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth-specific rate limiter (stricter)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  message: {
    error: 'Too many login attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration rate limiter
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 registrations per hour
  message: {
    error: 'Too many registration attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password reset rate limiter
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    error: 'Too many password reset attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export { rateLimit };
