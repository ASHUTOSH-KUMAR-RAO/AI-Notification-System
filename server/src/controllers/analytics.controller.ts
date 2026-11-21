import { getOverview, type Range } from '../services/analytics.service'
import { asyncHandler } from '../utils/asyncHandler'
import { sendSuccess } from '../utils/response'

export const overview = asyncHandler(async (req, res) => {
  const { range } = req.validated!.query as { range: Range }
  sendSuccess(res, await getOverview(req.user!.id, range))
})
