/**
 * Authentication Routes
 * Handles user registration, login, password reset, and session management
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { hashPassword, verifyPassword } from '../utils/password';
import { encrypt, decrypt } from '../utils/encryption';
import { TokenService } from '../services/tokenService';
import { AuthService } from '../services/authService';
import { EmailService } from '../services/emailService';

const router = Router();
const tokenService = new TokenService();
const authService = new AuthService();
const emailService = new EmailService();

// Validation middleware
const validateRegister = [
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
  body('name').trim().isLength({ min: 1, max: 100 }),
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', validateRegister, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password, name, businessName, tradeType, deviceInfo } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user with 14-day trial
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        businessName,
        tradeType,
        subscriptionTier: 'FREE',
        subscriptionStatus: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        trialEndsAt: true,
      },
    });

    // Create session and tokens
    const deviceId = getDeviceId(req, deviceInfo);
    const { accessToken, refreshToken } = await tokenService.createSession(
      user.id,
      deviceId,
      req.ip,
      req.get('user-agent') || ''
    );

    // Record device
    await authService.recordDevice(user.id, deviceId, deviceInfo, req);

    // Send welcome email
    await emailService.sendWelcomeEmail(user.email, user.name || '');

    res.status(201).json({
      user,
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', validateLogin, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password, deviceInfo } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.deletedAt || !user.passwordHash) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      const tempToken = tokenService.createTempToken(user.id);
      res.status(200).json({
        requiresMfa: true,
        tempToken,
      });
      return;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session
    const deviceId = getDeviceId(req, deviceInfo);
    const { accessToken, refreshToken } = await tokenService.createSession(
      user.id,
      deviceId,
      req.ip,
      req.get('user-agent') || ''
    );

    // Record device
    await authService.recordDevice(user.id, deviceId, deviceInfo, req);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
      },
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/logout
 * Logout current session
 */
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await tokenService.revokeSession(token);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * POST /api/auth/logout-all
 * Logout from all devices
 */
router.post('/logout-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await tokenService.revokeAllSessions(req.userId);
    res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const result = await tokenService.refreshAccessToken(refreshToken);

    if (!result) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        businessName: true,
        tradeType: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
        trialEndsAt: true,
        mfaEnabled: true,
        teamId: true,
        teamRole: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * POST /api/auth/password/reset
 * Request password reset
 */
router.post('/password/reset', [body('email').isEmail().normalizeEmail()], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user && !user.deletedAt) {
      const resetToken = await authService.createPasswordResetToken(user.id);
      await emailService.sendPasswordResetEmail(user.email, resetToken, user.name || undefined);
    }

    // Always return success to prevent email enumeration
    res.json({
      message: 'If an account exists, a password reset email has been sent.',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

/**
 * POST /api/auth/password/reset/confirm
 * Confirm password reset
 */
router.post('/password/reset/confirm', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { token, password } = req.body;

    const userId = await authService.verifyPasswordResetToken(token);
    if (!userId) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    const newPasswordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        passwordResetTokenHash: null,
        passwordResetTokenExpiry: null,
      },
    });

    await tokenService.revokeAllSessions(userId);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset confirm error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

/**
 * POST /api/auth/mfa/setup
 * Initialize MFA setup
 */
router.post('/mfa/setup', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Wyndo (${user.email})`,
      issuer: 'Wyndo',
    });

    // Encrypt secret before storing
    const encryptedSecret = encrypt(secret.base32 || '', config.encryption.key);

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
    const encryptedBackupCodes = backupCodes.map((code) =>
      encrypt(code, config.encryption.key)
    );

    // Store temporarily
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaSecret: encryptedSecret,
        backupCodes: encryptedBackupCodes,
      },
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes,
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ error: 'MFA setup failed' });
  }
});

/**
 * POST /api/auth/mfa/enable
 * Enable MFA after verification
 */
router.post('/mfa/enable', authenticate, [body('code').isLength({ min: 6, max: 6 })], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { code } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user || !user.mfaSecret) {
      res.status(400).json({ error: 'MFA not set up' });
      return;
    }

    const mfaSecret = decrypt(user.mfaSecret, config.encryption.key);
    const isValid = speakeasy.totp.verify({
      secret: mfaSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!isValid) {
      res.status(401).json({ error: 'Invalid verification code' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
    });

    res.json({ message: 'MFA enabled successfully' });
  } catch (error) {
    console.error('Enable MFA error:', error);
    res.status(500).json({ error: 'Failed to enable MFA' });
  }
});

/**
 * GET /api/auth/devices
 * List all authorized devices
 */
router.get('/devices', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const devices = await prisma.device.findMany({
      where: { userId: req.userId },
      orderBy: { lastUsedAt: 'desc' },
    });

    res.json({ devices });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

/**
 * DELETE /api/auth/devices/:deviceId
 * Remove a device
 */
router.delete('/devices/:deviceId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { deviceId } = req.params;

    await tokenService.revokeDeviceSessions(req.userId, deviceId);

    await prisma.device.deleteMany({
      where: {
        id: deviceId,
        userId: req.userId,
      },
    });

    res.json({ message: 'Device removed' });
  } catch (error) {
    console.error('Remove device error:', error);
    res.status(500).json({ error: 'Failed to remove device' });
  }
});

// Helper function
function getDeviceId(req: Request, deviceInfo?: any): string {
  if (deviceInfo?.deviceId) return deviceInfo.deviceId;

  const fingerprint = `${req.ip}-${req.get('user-agent')}`;
  return crypto.createHash('sha256').update(fingerprint).digest('hex').substring(0, 32);
}

export { router as authRouter };
