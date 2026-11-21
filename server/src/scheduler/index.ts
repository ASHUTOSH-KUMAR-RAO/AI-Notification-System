import cron from 'node-cron'
import { env } from '../config/env'
import { purgeOldData, runDigestSweep } from '../services/delivery/digest.service'
import { releaseDueDeliveries } from '../services/delivery/delivery.service'
import { runWithLock } from './lock'
import { log } from '../utils/logger'

const jobs = {
  'delivery-release': () => releaseDueDeliveries(), // held (quiet hours) + retries
  'digest-sweep': () => runDigestSweep(),
  purge: () => purgeOldData(),
} as const

const run = (name: keyof typeof jobs, leaseSeconds: number) => void runWithLock(name, leaseSeconds, jobs[name])

/**
 * Starts the cron jobs. Every job takes a DB lease lock first, so with several server instances only one runs it.
 * All state lives in the database, so a restart loses nothing: a catch-up run happens shortly after boot.
 */
export function startScheduler() {
  if (!env.SCHEDULER_ENABLED) {
    log.info('[scheduler] disabled (SCHEDULER_ENABLED=false)')
    return () => {}
  }
  const tasks = [
    cron.schedule('* * * * *', () => run('delivery-release', 55)),
    cron.schedule('* * * * *', () => run('digest-sweep', 55)),
    cron.schedule('15 3 * * *', () => run('purge', 300)),
  ]
  const catchUp = setTimeout(() => {
    run('delivery-release', 55)
    run('digest-sweep', 55)
  }, 5_000)
  log.info('[scheduler] started')
  return () => {
    clearTimeout(catchUp)
    tasks.forEach((t) => t.stop())
  }
}
