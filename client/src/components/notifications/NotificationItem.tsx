import { motion } from 'framer-motion'
import { Check, ExternalLink, MoreHorizontal, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Feedback, Notification } from '@/api/notifications'
import { PriorityBadge } from '@/components/notifications/PriorityBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { track } from '@/lib/eventTracker'
import { CATEGORY_META } from '@/lib/notificationMeta'
import { timeAgo } from '@/lib/time'
import { cn } from '@/lib/utils'

export interface ItemActions {
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  onReanalyze: (id: string) => void
  onNotSpam: (id: string) => void
  onFeedback: (id: string, value: Feedback | null) => void
}

interface Props extends ItemActions {
  notification: Notification
  /** Omit onSelect to hide the checkbox (e.g. inside groups). */
  selected?: boolean
  onSelect?: (checked: boolean) => void
}

export function NotificationItem({ notification: n, selected = false, onSelect, onMarkRead, onDelete, onReanalyze, onNotSpam, onFeedback }: Props) {
  const [expanded, setExpanded] = useState(false)
  const { icon: Icon, label } = CATEGORY_META[n.category]
  const external = n.actionUrl && /^https?:/i.test(n.actionUrl)
  // Only a real AI summary is worth showing; the rule-based one is just a truncated copy of the message.
  const aiSummary = n.aiStatus === 'DONE' && n.summary && n.message.length > 160 ? n.summary : null

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 48, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className={cn(
        'glass flex gap-3 rounded-2xl border p-3.5 transition-colors sm:p-5',
        !(n.isRead || n.isSpam) && 'border-l-4 border-l-primary',
        selected && 'ring-2 ring-ring/50',
      )}
    >
      {onSelect && (
        <Checkbox className="mt-1" checked={selected} onCheckedChange={(c) => onSelect(c === true)} aria-label={`Select notification: ${n.title}`} />
      )}
      <span aria-hidden className="mt-0.5 hidden size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground min-[420px]:flex">
        <Icon className="size-4" />
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className={cn('truncate text-sm', n.isRead ? 'font-medium' : 'font-semibold')}>
            {!n.isRead && !n.isSpam && <span className="sr-only">Unread: </span>}
            {n.title}
          </h2>
          {n.isSpam ? (
            <Badge variant="destructive">Possible spam{n.spamScore != null && ` ${Math.round(n.spamScore * 100)}%`}</Badge>
          ) : (
            <PriorityBadge n={n} />
          )}
          <Badge variant="outline">{label}</Badge>
        </div>

        {aiSummary && !expanded ? (
          <p className="break-words text-sm text-muted-foreground">
            <Sparkles className="mr-1 inline size-3 text-primary" aria-label="AI summary" />
            {aiSummary}{' '}
            <button type="button" onClick={() => setExpanded(true)} className="font-medium text-foreground underline-offset-4 hover:underline">
              Show full message
            </button>
          </p>
        ) : (
          <p className="break-words text-sm text-muted-foreground">{n.message}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
          <time dateTime={n.createdAt} title={new Date(n.createdAt).toLocaleString()}>
            {timeAgo(n.createdAt)}
          </time>
          {n.actionUrl && (
            <a
              href={n.actionUrl}
              onClick={() => {
                track(n.id, 'CLICKED')
                track(n.id, 'OPENED')
              }}
              {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
              className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
            >
              View <ExternalLink className="size-3" aria-hidden />
            </a>
          )}
        </div>

        {!n.isSpam && (
          <div role="group" aria-label="Was this important?" className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
            <span className="mr-1">Was this important?</span>
            {([['IMPORTANT', ThumbsUp, 'Yes, important'], ['NOT_IMPORTANT', ThumbsDown, 'No, not important']] as const).map(([value, Icon, text]) => (
              <Button
                key={value}
                variant="ghost"
                size="icon-sm"
                aria-pressed={n.feedback === value}
                aria-label={`${text}: ${n.title}`}
                title={text}
                onClick={() => onFeedback(n.id, n.feedback === value ? null : value)}
                className={cn('size-7', n.feedback === value && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground')}
              >
                <Icon className="size-3.5" aria-hidden />
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-start">
        {n.isSpam && (
          <Button variant="outline" size="sm" onClick={() => onNotSpam(n.id)}>
            <ShieldCheck className="size-4" aria-hidden />
            Not spam
          </Button>
        )}
        {!n.isRead && !n.isSpam && (
          <Button variant="ghost" size="icon-sm" onClick={() => onMarkRead(n.id)} aria-label={`Mark "${n.title}" as read`} title="Mark as read">
            <Check className="size-4" aria-hidden />
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" onClick={() => onDelete(n.id)} aria-label={`Delete "${n.title}"`} title="Delete">
          <Trash2 className="size-4" aria-hidden />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`More actions for "${n.title}"`} />}>
            <MoreHorizontal className="size-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onReanalyze(n.id)} disabled={n.aiStatus === 'PENDING'}>
              <Sparkles className="size-4" aria-hidden />
              Re-analyze with AI
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.li>
  )
}

