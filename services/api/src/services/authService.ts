/**
 * Auth Service
 * Helper methods for authentication-related operations
 */

import { Request } from 'express';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

export interface DeviceInfo {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  name?: string;
}

export class AuthService {
  /**
   * Record or update device information
   */
  async recordDevice(
    userId: string,
    deviceId: string,
    deviceInfo: any,
    req: Request
  ): Promise<void> {
    const platform = this.detectPlatform(req, deviceInfo);
    const deviceName = this.generateDeviceName(req, deviceInfo);

    await prisma.device.upsert({
      where: {
        userId_deviceId: {
          userId,
          deviceId,
        },
      },
      create: {
        userId,
        deviceId,
        name: deviceName,
        platform,
        lastUsedAt: new Date(),
      },
      update: {
        lastUsedAt: new Date(),
      },
    });
  }

  /**
   * Detect platform from request
   */
  private detectPlatform(req: Request, deviceInfo?: any): string {
    if (deviceInfo?.platform) {
      return deviceInfo.platform;
    }

    const userAgent = req.get('user-agent') || '';
    
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
    if (/Android/i.test(userAgent)) return 'android';
    return 'web';
  }

  /**
   * Generate friendly device name
   */
  private generateDeviceName(req: Request, deviceInfo?: any): string {
    if (deviceInfo?.name) return deviceInfo.name;

    const userAgent = req.get('user-agent') || '';
    
    if (/iPhone/i.test(userAgent)) return 'iPhone';
    if (/iPad/i.test(userAgent)) return 'iPad';
    if (/Android/i.test(userAgent)) return 'Android Device';
    if (/Macintosh/i.test(userAgent)) return 'Mac';
    if (/Windows/i.test(userAgent)) return 'Windows PC';
    if (/Linux/i.test(userAgent)) return 'Linux';

    return 'Unknown Device';
  }

  /**
   * Create password reset token
   */
  async createPasswordResetToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiry: expiresAt,
      },
    });

    return token;
  }

  /**
   * Verify password reset token
   */
  async verifyPasswordResetToken(token: string): Promise<string | null> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiry: { gt: new Date() },
      },
    });

    return user?.id || null;
  }

  /**
   * Clear password reset token
   */
  async clearPasswordResetToken(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetTokenHash: null,
        passwordResetTokenExpiry: null,
      },
    });
  }

  /**
   * Verify Apple token (mock for development)
   */
  async verifyAppleToken(idToken: string): Promise<{ email: string; name?: string; sub: string }> {
    // In production, implement proper Apple token verification
    throw new Error('Apple Sign-In not configured');
  }

  /**
   * Verify Google token (mock for development)
   */
  async verifyGoogleToken(idToken: string): Promise<{ email: string; name?: string; picture?: string; sub: string }> {
    // In production, implement proper Google token verification
    throw new Error('Google Sign-In not configured');
  }
}
