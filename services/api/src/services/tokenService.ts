/**
 * Token Service
 * Handles JWT token creation, validation, and session management
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { prisma } from '../lib/prisma';

export class TokenService {
  /**
   * Create a new session and return tokens
   */
  async createSession(
    userId: string,
    deviceId: string,
    ipAddress: string | undefined,
    userAgent: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.generateAccessToken(userId);
    const refreshToken = this.generateRefreshToken();

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId,
        token: accessToken,
        refreshToken,
        deviceInfo: { deviceId },
        ipAddress: ipAddress || null,
        userAgent,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Generate access token (short-lived)
   */
  private generateAccessToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'access' },
      config.jwt.secret,
      { expiresIn: config.jwt.accessTokenExpiry }
    );
  }

  /**
   * Generate refresh token (long-lived)
   */
  private generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    const session = await prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    const accessToken = this.generateAccessToken(session.userId);
    const newRefreshToken = this.generateRefreshToken();

    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: accessToken,
        refreshToken: newRefreshToken,
        lastUsedAt: new Date(),
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Revoke a session
   */
  async revokeSession(token: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { token },
    });
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllSessions(userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { userId },
    });
  }

  /**
   * Revoke sessions for a specific device
   */
  async revokeDeviceSessions(userId: string, deviceId: string): Promise<void> {
    const sessions = await prisma.session.findMany({
      where: { userId },
    });

    for (const session of sessions) {
      const deviceInfo = session.deviceInfo as { deviceId?: string } | null;
      if (deviceInfo?.deviceId === deviceId) {
        await prisma.session.delete({
          where: { id: session.id },
        });
      }
    }
  }

  /**
   * Create temporary token for MFA flow
   */
  createTempToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'mfa_temp' },
      config.jwt.secret,
      { expiresIn: '10m' }
    );
  }

  // Alias for createTempToken
  async createTemporaryToken(userId: string): Promise<string> {
    return this.createTempToken(userId);
  }

  /**
   * Verify temporary token
   */
  verifyTempToken(token: string): string | null {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; type: string };
      if (decoded.type !== 'mfa_temp') {
        return null;
      }
      return decoded.userId;
    } catch {
      return null;
    }
  }

  // Alias for verifyTempToken
  async verifyTemporaryToken(token: string): Promise<string | null> {
    return this.verifyTempToken(token);
  }

  /**
   * Refresh session (alias for refreshAccessToken)
   */
  async refreshSession(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    return this.refreshAccessToken(refreshToken);
  }
}
