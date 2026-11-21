import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { allowedOrigins, env } from './config/env'
import { errorHandler, notFound } from './middlewares/error.middleware'
import { apiLimiter } from './middlewares/rateLimiter'
import { apiRouter } from './routes'

export const app = express()

app.disable('x-powered-by')
app.set('trust proxy', env.TRUST_PROXY) // correct client IPs for rate limiting and secure cookies behind Railway (and Vercel)
app.use(helmet())
app.use(compression())
app.use(cors({ origin: allowedOrigins, credentials: true }))
// The path only: query strings can carry one-time tokens (e.g. unsubscribe links), so they are never logged.
morgan.token('path', (req) => (req as express.Request).path)
app.use(morgan(env.NODE_ENV === 'production' ? ':method :path :status :res[content-length] - :response-time ms' : 'dev'))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

app.use('/api', apiLimiter, apiRouter)

app.use(notFound)
app.use(errorHandler)

