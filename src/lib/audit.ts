import { db } from "./db";

interface AuditParams {
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: object | null;
  after?: object | null;
  metadata?: object | null;
  ipAddress?: string;
}

export async function createAuditLog(params: AuditParams) {
  return db.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      before: params.before ? JSON.stringify(params.before) : null,
      after: params.after ? JSON.stringify(params.after) : null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      ipAddress: params.ipAddress,
    },
  });
}

export async function createNotification(params: {
  userId: string;
  sentById?: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  return db.notification.create({ data: params });
}

export async function broadcastNotification(params: {
  userIds: string[];
  sentById?: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  const { userIds, ...rest } = params;
  await db.notification.createMany({
    data: userIds.map((userId) => ({ userId, ...rest })),
  });
}
