import type { Response } from 'express'

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data: T | null
  error: string | null
}

export const sendSuccess = <T>(res: Response, data: T | null = null, message = 'OK', status = 200) =>
  res.status(status).json({ success: true, message, data, error: null } satisfies ApiResponse<T>)

export const sendError = (res: Response, status: number, message: string) =>
  res.status(status).json({ success: false, message, data: null, error: message } satisfies ApiResponse)
