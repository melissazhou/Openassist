import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({ data: params });
}

export async function createNotifications(params: CreateNotificationParams[]) {
  if (params.length === 0) return;
  return prisma.notification.createMany({ data: params });
}

/** Notify relevant users when a change request status changes */
export async function notifyStatusChange(opts: {
  requestId: string;
  requestNumber: string;
  title: string;
  oldStatus: string;
  newStatus: string;
  actorId: string;
  requestorId?: string | null;
  assignedToId?: string | null;
}) {
  const recipients = new Set<string>();
  if (opts.requestorId && opts.requestorId !== opts.actorId) recipients.add(opts.requestorId);
  if (opts.assignedToId && opts.assignedToId !== opts.actorId) recipients.add(opts.assignedToId);

  const notifications = Array.from(recipients).map((userId) => ({
    userId,
    type: NotificationType.STATUS_CHANGE,
    title: `Status Changed: ${opts.requestNumber}`,
    message: `"${opts.title}" changed from ${opts.oldStatus} to ${opts.newStatus}`,
    link: `/dashboard/requests/${opts.requestId}`,
  }));

  await createNotifications(notifications);
}

/** Notify user when assigned to a request */
export async function notifyAssignment(opts: {
  requestId: string;
  requestNumber: string;
  title: string;
  assigneeId: string;
  actorId: string;
}) {
  if (opts.assigneeId === opts.actorId) return;
  await createNotification({
    userId: opts.assigneeId,
    type: NotificationType.ASSIGNMENT,
    title: `Assigned: ${opts.requestNumber}`,
    message: `You have been assigned to "${opts.title}"`,
    link: `/dashboard/requests/${opts.requestId}`,
  });
}

/** Notify when an approval decision is made */
export async function notifyApprovalResult(opts: {
  requestId: string;
  requestNumber: string;
  title: string;
  requestorId: string;
  decision: "APPROVED" | "REJECTED";
  approverName: string;
}) {
  await createNotification({
    userId: opts.requestorId,
    type: NotificationType.APPROVAL_RESULT,
    title: `${opts.decision}: ${opts.requestNumber}`,
    message: `"${opts.title}" was ${opts.decision.toLowerCase()} by ${opts.approverName}`,
    link: `/dashboard/requests/${opts.requestId}`,
  });
}

/** Notify when a new comment is added */
export async function notifyComment(opts: {
  requestId: string;
  requestNumber: string;
  title: string;
  commentAuthorId: string;
  commentAuthorName: string;
  recipientIds: string[];
}) {
  const notifications = opts.recipientIds
    .filter((id) => id !== opts.commentAuthorId)
    .map((userId) => ({
      userId,
      type: NotificationType.COMMENT,
      title: `New Comment: ${opts.requestNumber}`,
      message: `${opts.commentAuthorName} commented on "${opts.title}"`,
      link: `/dashboard/requests/${opts.requestId}`,
    }));

  await createNotifications(notifications);
}
