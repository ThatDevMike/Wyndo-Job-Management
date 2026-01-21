import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { TokenService } from '../services/tokenService';
import { AuthService } from '../services/authService';
import { EmailService } from '../services/emailService';
import { AuthRequest } from '../middleware/auth';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { encrypt, decrypt } from '../utils/encryption';
import { config } from '../config';

const tokenService = new TokenService();
const authService = new AuthService();
const emailService = new EmailService();

export class AuthController {
  // Register a new user
  async register(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, name, businessName, tradeType } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user with 14-day trial
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          name,
          businessName,
          tradeType,
          subscriptionTier: 'FREE',
          subscriptionStatus: 'TRIAL',
          trialEndsAt,
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

      // Generate device ID and create session
      const deviceId = req.headers['x-device-id'] as string || crypto.randomUUID();
      const ipAddress = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      const { accessToken, refreshToken } = await tokenService.createSession(
        user.id,
        deviceId,
        ipAddress,
        userAgent
      );

      // Record device
      await authService.recordDevice(user.id, deviceId, req.body.deviceInfo, req);

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(user.email, user.name || 'there');
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }

      res.status(201).json({
        message: 'Registration successful',
        user,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  // Login
  async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, deviceInfo } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user || !user.passwordHash) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Verify password
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      // Check if deleted
      if (user.deletedAt) {
        res.status(401).json({ error: 'Account has been deactivated' });
        return;
      }

      // Check for MFA
      if (user.mfaEnabled) {
        // Generate temporary token for MFA verification
        const tempToken = await tokenService.createTemporaryToken(user.id);
        res.json({
          requiresMfa: true,
          tempToken,
        });
        return;
      }

      // Generate device ID and create session
      const deviceId = req.headers['x-device-id'] as string || crypto.randomUUID();
      const ipAddress = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      const { accessToken, refreshToken } = await tokenService.createSession(
        user.id,
        deviceId,
        ipAddress,
        userAgent
      );

      // Record device
      await authService.recordDevice(user.id, deviceId, deviceInfo, req);

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
          mfaEnabled: user.mfaEnabled,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  // Verify MFA code
  async verifyMfa(req: Request, res: Response): Promise<void> {
    try {
      const { tempToken, code, deviceInfo } = req.body;

      // Verify temporary token
      const userId = await tokenService.verifyTemporaryToken(tempToken);
      if (!userId) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.mfaSecret) {
        res.status(401).json({ error: 'MFA not configured' });
        return;
      }

      // Verify TOTP code
      const decryptedSecret = decrypt(user.mfaSecret, config.encryption.key);
      const isValid = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: 'base32',
        token: code,
        window: 1,
      });

      if (!isValid) {
        // Check backup codes
        if (user.backupCodes) {
          const backupCodes: string[] = JSON.parse(user.backupCodes);
          const codeIndex = backupCodes.indexOf(code);
          if (codeIndex !== -1) {
            // Remove used backup code
            backupCodes.splice(codeIndex, 1);
            await prisma.user.update({
              where: { id: user.id },
              data: { backupCodes: JSON.stringify(backupCodes) },
            });
          } else {
            res.status(401).json({ error: 'Invalid MFA code' });
            return;
          }
        } else {
          res.status(401).json({ error: 'Invalid MFA code' });
          return;
        }
      }

      // Generate device ID and create session
      const deviceId = req.headers['x-device-id'] as string || crypto.randomUUID();
      const ipAddress = req.ip || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      const { accessToken, refreshToken } = await tokenService.createSession(
        user.id,
        deviceId,
        ipAddress,
        userAgent
      );

      // Record device
      await authService.recordDevice(user.id, deviceId, deviceInfo, req);

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      res.json({
        message: 'MFA verification successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          subscriptionTier: user.subscriptionTier,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error('MFA verification error:', error);
      res.status(500).json({ error: 'MFA verification failed' });
    }
  }

  // Setup MFA
  async setupMfa(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;

      // Generate new TOTP secret
      const secret = speakeasy.generateSecret({
        name: `Wyndo (${req.user?.email})`,
        length: 32,
      });

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

      // Store encrypted secret temporarily (not enabled yet)
      const encryptedSecret = encrypt(secret.base32, config.encryption.key);
      await prisma.user.update({
        where: { id: userId },
        data: { mfaSecret: encryptedSecret },
      });

      res.json({
        secret: secret.base32,
        qrCode,
        message: 'Scan the QR code with your authenticator app, then verify to enable MFA',
      });
    } catch (error) {
      console.error('MFA setup error:', error);
      res.status(500).json({ error: 'MFA setup failed' });
    }
  }

  // Enable MFA
  async enableMfa(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { code } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.mfaSecret) {
        res.status(400).json({ error: 'Please setup MFA first' });
        return;
      }

      // Verify the code
      const decryptedSecret = decrypt(user.mfaSecret, config.encryption.key);
      const isValid = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: 'base32',
        token: code,
        window: 1,
      });

      if (!isValid) {
        res.status(401).json({ error: 'Invalid code' });
        return;
      }

      // Generate backup codes
      const backupCodes = Array.from({ length: 10 }, () =>
        crypto.randomBytes(4).toString('hex').toUpperCase()
      );

      // Enable MFA
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: true,
          backupCodes: JSON.stringify(backupCodes),
        },
      });

      // Send backup codes email
      try {
        await emailService.sendMfaBackupCodesEmail(user.email, backupCodes, user.name || undefined);
      } catch (emailError) {
        console.error('Failed to send backup codes email:', emailError);
      }

      res.json({
        message: 'MFA enabled successfully',
        backupCodes,
      });
    } catch (error) {
      console.error('Enable MFA error:', error);
      res.status(500).json({ error: 'Failed to enable MFA' });
    }
  }

  // Disable MFA
  async disableMfa(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { password, code } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.passwordHash) {
        res.status(400).json({ error: 'User not found' });
        return;
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid password' });
        return;
      }

      // Verify MFA code
      if (user.mfaSecret) {
        const decryptedSecret = decrypt(user.mfaSecret, config.encryption.key);
        const isValid = speakeasy.totp.verify({
          secret: decryptedSecret,
          encoding: 'base32',
          token: code,
          window: 1,
        });

        if (!isValid) {
          res.status(401).json({ error: 'Invalid MFA code' });
          return;
        }
      }

      // Disable MFA
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          backupCodes: null,
        },
      });

      res.json({ message: 'MFA disabled successfully' });
    } catch (error) {
      console.error('Disable MFA error:', error);
      res.status(500).json({ error: 'Failed to disable MFA' });
    }
  }

  // Logout
  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.substring(7);
        await tokenService.revokeSession(token);
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  // Logout from all devices
  async logoutAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      await tokenService.revokeAllSessions(userId);
      res.json({ message: 'Logged out from all devices' });
    } catch (error) {
      console.error('Logout all error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  // Refresh token
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token required' });
        return;
      }

      const result = await tokenService.refreshSession(refreshToken);

      if (!result) {
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }

      res.json(result);
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({ error: 'Token refresh failed' });
    }
  }

  // Get current user
  async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          name: true,
          avatar: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionEndsAt: true,
          trialEndsAt: true,
          mfaEnabled: true,
          teamId: true,
          teamRole: true,
          businessName: true,
          businessLogo: true,
          tradeType: true,
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
      res.status(500).json({ error: 'Failed to get user' });
    }
  }

  // Request password reset
  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      // Always return success to prevent email enumeration
      if (!user) {
        res.json({ message: 'If an account exists, a password reset email has been sent' });
        return;
      }

      // Generate reset token
      const resetToken = await authService.createPasswordResetToken(user.id);

      // Send reset email
      try {
        await emailService.sendPasswordResetEmail(user.email, resetToken, user.name || undefined);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
      }

      res.json({ message: 'If an account exists, a password reset email has been sent' });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({ error: 'Password reset request failed' });
    }
  }

  // Confirm password reset
  async confirmPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;

      // Verify token
      const userId = await authService.verifyPasswordResetToken(token);
      if (!userId) {
        res.status(400).json({ error: 'Invalid or expired reset token' });
        return;
      }

      // Hash new password
      const passwordHash = await hashPassword(password);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          passwordResetTokenHash: null,
          passwordResetTokenExpiry: null,
        },
      });

      // Revoke all sessions
      await tokenService.revokeAllSessions(userId);

      res.json({ message: 'Password reset successful. Please login with your new password.' });
    } catch (error) {
      console.error('Password reset confirmation error:', error);
      res.status(500).json({ error: 'Password reset failed' });
    }
  }

  // Change password (when logged in)
  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.passwordHash) {
        res.status(400).json({ error: 'User not found' });
        return;
      }

      // Verify current password
      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }

      // Hash new password
      const passwordHash = await hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }

  // Get devices
  async getDevices(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;

      const devices = await prisma.device.findMany({
        where: { userId },
        orderBy: { lastUsedAt: 'desc' },
      });

      res.json({ devices });
    } catch (error) {
      console.error('Get devices error:', error);
      res.status(500).json({ error: 'Failed to get devices' });
    }
  }

  // Remove device
  async removeDevice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { deviceId } = req.params;

      await prisma.device.deleteMany({
        where: {
          userId,
          deviceId,
        },
      });

      // Also revoke sessions for this device
      await prisma.session.deleteMany({
        where: {
          userId,
          deviceInfo: {
            path: ['deviceId'],
            equals: deviceId,
          },
        },
      });

      res.json({ message: 'Device removed' });
    } catch (error) {
      console.error('Remove device error:', error);
      res.status(500).json({ error: 'Failed to remove device' });
    }
  }
}
