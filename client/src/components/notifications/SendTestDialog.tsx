import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Send } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { CATEGORIES, PRIORITIES } from '@/api/notifications'
import { SimpleSelect, type Option } from '@/components/SimpleSelect'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { useCreateNotification } from '@/hooks/useNotifications'
import { CATEGORY_META, PRIORITY_META } from '@/lib/notificationMeta'

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120, 'Title must be at most 120 characters'),
  message: z.string().trim().min(1, 'Message is required').max(1000, 'Message must be at most 1000 characters'),
  category: z.enum([...CATEGORIES, 'AUTO']),
  priority: z.enum([...PRIORITIES, 'AUTO']),
})
type Values = z.infer<typeof schema>

const defaults: Values = { title: '', message: '', category: 'AUTO', priority: 'AUTO' }
const categoryOptions: Option<Values['category']>[] = [{ value: 'AUTO', label: 'Auto (AI decides)' }, ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_META[c].label }))]
const priorityOptions: Option<Values['priority']>[] = [{ value: 'AUTO', label: 'Auto (AI decides)' }, ...PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label }))]

export function SendTestDialog() {
  const [open, setOpen] = useState(false)
  const create = useCreateNotification()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults })

  const onSubmit = async (values: Values) => {
    try {
      await create.mutateAsync({
        title: values.title,
        message: values.message,
        // Omitted fields are chosen by the AI; values you pick are never overridden.
        category: values.category === 'AUTO' ? undefined : values.category,
        priority: values.priority === 'AUTO' ? undefined : values.priority,
      })
      toast.success('Test notification sent')
      form.reset(defaults)
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send notification')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Send className="size-4" aria-hidden />
        Send test
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a test notification</DialogTitle>
          <DialogDescription>Creates a notification for your own account. Leave category and priority on Auto to let the AI decide.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
          <FieldGroup>
            <TextField control={form.control} name="title" label="Title" placeholder="Your order has shipped" />
            <TextField control={form.control} name="message" label="Message" multiline placeholder="Details about the notification" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="test-category">Category</FieldLabel>
                    <SimpleSelect id="test-category" className="w-full" value={field.value} onChange={field.onChange} options={categoryOptions} />
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="test-priority">Priority</FieldLabel>
                    <SimpleSelect id="test-priority" className="w-full" value={field.value} onChange={field.onChange} options={priorityOptions} />
                  </Field>
                )}
              />
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {form.formState.isSubmitting ? 'Sending...' : 'Send notification'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

