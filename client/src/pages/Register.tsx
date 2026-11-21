import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AuthCard } from '@/components/AuthCard'
import { SubmitButton } from '@/components/SubmitButton'
import { TextField } from '@/components/TextField'
import { FieldGroup } from '@/components/ui/field'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import { registerSchema, type RegisterValues } from '@/lib/validation'

export default function Register() {
  const { register } = useAuth()
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = async (values: RegisterValues) => {
    try {
      await register(values)
      toast.success('Account created. Welcome!')
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        form.setError('email', { message: e.message }, { shouldFocus: true })
      } else {
        toast.error(e instanceof Error ? e.message : 'Something went wrong')
      }
    }
  }

  return (
    <AuthCard
      title="Create your account"
      description="Get started in less than a minute"
      footer={{ text: 'Already have an account?', linkText: 'Sign in', to: '/login' }}
    >
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
        <FieldGroup>
          <TextField control={form.control} name="name" label="Name" autoComplete="name" placeholder="Ada Lovelace" />
          <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" />
          <TextField control={form.control} name="password" label="Password" type="password" autoComplete="new-password" />
          <TextField control={form.control} name="confirmPassword" label="Confirm password" type="password" autoComplete="new-password" />
        </FieldGroup>
        <p className="text-xs text-muted-foreground">At least 8 characters, including a letter and a number.</p>
        <SubmitButton loading={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? 'Creating account...' : 'Create account'}
        </SubmitButton>
      </form>
    </AuthCard>
  )
}
