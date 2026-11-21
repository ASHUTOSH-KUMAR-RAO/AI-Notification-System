import { Clock, Package, Settings, ShieldAlert, Tag, Users, type LucideIcon } from 'lucide-react'
import type { Category, Priority } from '@/api/notifications'

export const CATEGORY_META: Record<Category, { label: string; icon: LucideIcon }> = {
  SYSTEM: { label: 'System', icon: Settings },
  ORDER: { label: 'Order', icon: Package },
  SECURITY: { label: 'Security', icon: ShieldAlert },
  SOCIAL: { label: 'Social', icon: Users },
  PROMOTION: { label: 'Promotion', icon: Tag },
  REMINDER: { label: 'Reminder', icon: Clock },
}

export const PRIORITY_META: Record<Priority, { label: string; variant: 'destructive' | 'secondary' | 'outline' }> = {
  HIGH: { label: 'High', variant: 'destructive' },
  MEDIUM: { label: 'Medium', variant: 'secondary' },
  LOW: { label: 'Low', variant: 'outline' },
}
