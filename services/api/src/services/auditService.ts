/**
 * Audit Service
 * Handles audit logging for all actions
 */

import { prisma } from '../lib/prisma';

interface AuditLogData {
  userId: string;
  teamId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Log an audit event
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          teamId: data.teamId || null,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          changes: data.changes || {},
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      console.error('Audit log error:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }
}
