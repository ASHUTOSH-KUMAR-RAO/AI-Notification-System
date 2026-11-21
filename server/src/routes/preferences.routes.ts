import { Router } from 'express'
import * as c from '../controllers/preferences.controller'
import { protect } from '../middlewares/auth.middleware'
import { validateBody } from '../middlewares/validate.middleware'
import { pushSubscribeSchema, pushUnsubscribeSchema, updatePreferencesSchema } from '../validators/preferences.validators'

export const preferencesRouter = Router()
preferencesRouter.use(protect)
preferencesRouter.get('/', c.getPrefs)
preferencesRouter.patch('/', validateBody(updatePreferencesSchema), c.updatePrefs)

export const pushRouter = Router()
pushRouter.use(protect)
pushRouter.post('/subscribe', validateBody(pushSubscribeSchema), c.pushSubscribe)
pushRouter.post('/unsubscribe', validateBody(pushUnsubscribeSchema), c.pushUnsubscribe)
