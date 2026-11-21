import * as auth from '../services/auth.service'
import { asyncHandler } from '../utils/asyncHandler'
import { clearRefreshCookie, getRefreshCookie, setRefreshCookie } from '../utils/cookies'
import { sendSuccess } from '../utils/response'

export const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await auth.register(req.body)
  setRefreshCookie(res, refreshToken)
  sendSuccess(res, { user, accessToken }, 'Account created', 201)
})

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await auth.login(req.body)
  setRefreshCookie(res, refreshToken)
  sendSuccess(res, { user, accessToken }, 'Logged in')
})

export const refresh = asyncHandler(async (req, res) => {
  try {
    const { accessToken, refreshToken } = await auth.refresh(getRefreshCookie(req.cookies))
    setRefreshCookie(res, refreshToken)
    sendSuccess(res, { accessToken }, 'Token refreshed')
  } catch (err) {
    clearRefreshCookie(res)
    throw err
  }
})

export const logout = asyncHandler(async (req, res) => {
  await auth.logout(getRefreshCookie(req.cookies))
  clearRefreshCookie(res)
  sendSuccess(res, null, 'Logged out')
})

export const me = asyncHandler(async (req, res) => {
  sendSuccess(res, { user: req.user }, 'OK')
})
