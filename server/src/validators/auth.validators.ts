import { z } from 'zod'

const email = z.string().trim().toLowerCase().max(254).pipe(z.email('Enter a valid email address'))

// bcrypt only uses the first 72 bytes, so cap there.
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number')

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name is too long'),
  email,
  password,
})

// Login does not enforce password rules: it must not reveal them or reject legacy passwords.
export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(72),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>

