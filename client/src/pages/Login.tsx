import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AuthCard } from '@/components/AuthCard'
import { SubmitButton } from '@/components/SubmitButton'
import { TextField } from '@/components/TextField'
import { FieldGroup } from '@/components/ui/field'
import { useAuth } from '@/context/AuthContext'
import { loginSchema, type LoginValues } from '@/lib/validation'

export default function Login() {
  const { login } = useAuth()
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginValues) => {
    try {
      await login(values)
      toast.success('Welcome back!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong')
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your account"
      footer={{ text: "Don't have an account?", linkText: 'Sign up', to: '/register' }}
    >
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
        <FieldGroup>
          <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" />
          <TextField control={form.control} name="password" label="Password" type="password" autoComplete="current-password" />
        </FieldGroup>
        <SubmitButton loading={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
        </SubmitButton>
      </form>
    </AuthCard>
  )
}
