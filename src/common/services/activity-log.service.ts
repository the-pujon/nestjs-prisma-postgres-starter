import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import { Prisma } from '@prisma/client';
import { CustomLoggerService } from '../../shared/infrastructure/logging/logger.service';

export interface ActivityLogMetadata {
  ip?: string;
  userAgent?: string;
  actionedBy?: string | null;
  device?: string;
}

export interface FieldChange {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
}

@Injectable()
export class ActivityLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customLogger: CustomLoggerService,
  ) {}

  /**
   * Log an activity event with field-level changes
   * Can be used within a transaction or standalone
   */
  async logActivity(
    params: {
      tableName: string;
      recordId: string;
      action: 'create' | 'update' | 'delete';
      eventType?:
        | 'create'
        | 'update'
        | 'delete'
        | 'login'
        | 'logout'
        | 'password_change'
        | 'profile_update';
      changes?: FieldChange[];
      metadata: ActivityLogMetadata;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const {
      tableName,
      recordId,
      action,
      eventType,
      changes = [],
      metadata,
    } = params;
    const prismaClient = tx || this.prisma;

    return await prismaClient.activityLogEvent.create({
      data: {
        tableName,
        recordId,
        action,
        eventType: eventType || action,
        actionedBy: metadata.actionedBy || null,
        ipAddress: metadata.ip,
        userAgent: metadata.userAgent,
        device: metadata.device,
        details:
          changes.length > 0
            ? {
                create: changes.map((change) => ({
                  fieldName: change.fieldName,
                  oldValue: change.oldValue,
                  newValue: change.newValue,
                })),
              }
            : undefined,
      },
    });
  }

  /**
   * Log a create action
   */
  async logCreate(
    tableName: string,
    recordId: string,
    fields: Record<string, any>,
    metadata: ActivityLogMetadata,
    tx?: Prisma.TransactionClient,
  ) {
    const changes: FieldChange[] = Object.entries(fields).map(
      ([key, value]) => ({
        fieldName: key,
        oldValue: null,
        newValue: String(value),
      }),
    );

    return this.logActivity(
      {
        tableName,
        recordId,
        action: 'create',
        eventType: 'create',
        changes,
        metadata,
      },
      tx,
    );
  }

  /**
   * Log an update action
   */
  async logUpdate(
    tableName: string,
    recordId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    metadata: ActivityLogMetadata,
    tx?: Prisma.TransactionClient,
  ) {
    const changes: FieldChange[] = [];

    // Find changed fields
    for (const [key, newValue] of Object.entries(newData)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const oldValue = oldData[key];
      if (oldValue !== newValue) {
        changes.push({
          fieldName: key,
          oldValue: oldValue != null ? String(oldValue) : null,
          newValue: newValue != null ? String(newValue) : null,
        });
      }
    }

    if (changes.length === 0) {
      return null; // No changes to log
    }

    return this.logActivity(
      {
        tableName,
        recordId,
        action: 'update',
        eventType: 'update',
        changes,
        metadata,
      },
      tx,
    );
  }

  /**
   * Log a delete action
   */
  async logDelete(
    tableName: string,
    recordId: string,
    deletedData: Record<string, any>,
    metadata: ActivityLogMetadata,
    tx?: Prisma.TransactionClient,
  ) {
    const changes: FieldChange[] = Object.entries(deletedData).map(
      ([key, value]) => ({
        fieldName: key,
        oldValue: String(value),
        newValue: null,
      }),
    );

    return this.logActivity(
      {
        tableName,
        recordId,
        action: 'delete',
        eventType: 'delete',
        changes,
        metadata,
      },
      tx,
    );
  }

  /**
   * Log a custom event (login, logout, password change, etc.)
   */
  async logCustomEvent(
    tableName: string,
    recordId: string,
    eventType: 'login' | 'logout' | 'password_change' | 'profile_update',
    metadata: ActivityLogMetadata,
    changes?: FieldChange[],
    tx?: Prisma.TransactionClient,
  ) {
    // Map eventType to action
    const actionMap = {
      login: 'update',
      logout: 'update',
      password_change: 'update',
      profile_update: 'update',
    };

    return this.logActivity(
      {
        tableName,
        recordId,
        action: actionMap[eventType] as 'create' | 'update' | 'delete',
        eventType,
        changes,
        metadata,
      },
      tx,
    );
  }
}
