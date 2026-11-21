import { getHealth } from '../services/health.service'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'

export const health = asyncHandler(async (_req, res) => {
  sendSuccess(res, await getHealth(), 'Service healthy')
})
