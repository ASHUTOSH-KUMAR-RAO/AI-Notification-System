import { randomUUID } from 'node:crypto'
import { db } from '../config/db'
import type { Prisma } from '../generated/prisma/client'
import { AppError } from '../utils/AppError'
import { isAiEnabled } from './ai/llm'
import { classifyWithRules } from './ai/rules'
import { notificationEvents } from '../utils/notificationEvents'
import type { CreateNotificationInput, ListNotificationsQuery } from '../validators/notification.validators'

// deletedAt is internal: never exposed to clients.
const select = {
  id: true,
  title: true,
  message: true,
  category: true,
  priority: true,
  isRead: true,
  readAt: true,
  metadata: true,
  actionUrl: true,
  createdAt: true,
  updatedAt: true,
  aiStatus: true,
  aiPriorityReason: true,
  prioritySetByUser: true,
  categorySetByUser: true,
  isSpam: true,
  spamScore: true,
  summary: true,
  groupKey: true,
  analyzedAt: true,
  personalizationReason: true,
  feedback: true,
} satisfies Prisma.NotificationSelect

export const notificationSelect = select
export type NotificationDto = Prisma.NotificationGetPayload<{ select: typeof select }>

// Opaque keyset cursor: "<createdAt ms>_<id>". Stable under inserts/deletes, unlike offset pagination.
const encodeCursor = (n: Pick<NotificationDto, 'createdAt' | 'id'>) =>
  Buffer.from(`${n.createdAt.getTime()}_${n.id}`).toString('base64url')

function decodeCursor(cursor: string) {
  const [ms, id] = Buffer.from(cursor, 'base64url').toString().split('_')
  const date = new Date(Number(ms))
  if (!id || Number.isNaN(date.getTime())) throw new AppError('Invalid cursor', 400)
  return { date, id }
}

/**
 * Saves immediately (the user never waits for AI) with an instant rule-based classification,
 * then emits `created`. The AI pipeline subscribes to that event and refines the result in the background.
 */
export async function createNotification(userId: string, input: CreateNotificationInput) {
  const { metadata, title, message, actionUrl } = input
  const id = randomUUID()
  const rules = classifyWithRules({ title, message })

  const notification = await db.notification.create({
    data: {
      id,
      userId,
      title,
      message,
      actionUrl,
      category: input.category ?? rules.category,
      priority: input.priority ?? rules.priority,
      prioritySetByUser: input.priority !== undefined,
      categorySetByUser: input.category !== undefined,
      isSpam: rules.isSpam,
      spamScore: rules.spamScore,
      aiPriorityReason: rules.reason,
      summary: rules.summary,
      aiStatus: isAiEnabled() ? 'PENDING' : 'FALLBACK',
      groupKey: id, // starts as its own group; the pipeline merges it with similar recent ones
      ...(metadata && { metadata: metadata as Prisma.InputJsonObject }),
    },
    select,
  })
  notificationEvents.emit('created', userId, notification)
  return notification
}

export async function listNotifications(userId: string, q: ListNotificationsQuery) {
  const where: Prisma.NotificationWhereInput = {
    userId,
    deletedAt: null,
    isSpam: q.spam === true,
    ...(q.isRead !== undefined && { isRead: q.isRead }),
    ...(q.category && { category: q.category }),
    ...(q.priority && { priority: q.priority }),
    ...(q.search && {
      OR: [
        { title: { contains: q.search, mode: 'insensitive' } },
        { message: { contains: q.search, mode: 'insensitive' } },
      ],
    }),
  }

  if (q.cursor) {
    const { date, id } = decodeCursor(q.cursor)
    // Rows strictly after the cursor in (createdAt desc, id desc) order.
    where.AND = [{ OR: [{ createdAt: { lt: date } }, { createdAt: date, id: { lt: id } }] }]
  }

  const rows = await db.notification.findMany({
    where,
    select,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: q.limit + 1, // one extra row tells us whether another page exists
  })

  const hasMore = rows.length > q.limit
  const items = hasMore ? rows.slice(0, q.limit) : rows
  return { items, nextCursor: hasMore ? encodeCursor(items[items.length - 1]) : null }
}

export const getUnreadCount = (userId: string) =>
  db.notification.count({ where: { userId, isRead: false, deletedAt: null, isSpam: false } })

/** Idempotent: marking an already-read notification returns it unchanged. */
export async function markRead(userId: string, id: string) {
  const existing = await db.notification.findFirst({ where: { id, userId, deletedAt: null }, select })
  if (!existing) throw new AppError('Notification not found', 404)
  if (existing.isRead) return existing
  const updated = await db.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() }, select })
  notificationEvents.emit('read', userId, id)
  return updated
}

export async function markAllRead(userId: string) {
  const { count } = await db.notification.updateMany({
    where: { userId, isRead: false, deletedAt: null, isSpam: false },
    data: { isRead: true, readAt: new Date() },
  })
  if (count > 0) notificationEvents.emit('read-all', userId)
  return { updated: count }
}

export async function deleteNotification(userId: string, id: string) {
  const { count } = await db.notification.updateMany({
    where: { id, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
  if (count === 0) throw new AppError('Notification not found', 404)
  notificationEvents.emit('deleted', userId, [id])
}

/** Ids that do not exist or belong to someone else are ignored (never revealed); count says how many were deleted. */
export async function deleteNotifications(userId: string, ids: string[]) {
  const { count } = await db.notification.updateMany({
    where: { id: { in: ids }, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
  if (count > 0) notificationEvents.emit('deleted', userId, ids)
  return { deleted: count }
}



