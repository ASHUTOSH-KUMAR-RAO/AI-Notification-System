import type { Analysis, Category } from './schemas'

/** Patterns that address an AI system instead of a person: a prompt-injection attempt. */
const INJECTION = /(ignore|disregard|forget)\s+(all\s+|any\s+)?(the\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)|system\s+prompt|you\s+are\s+now\s+|as\s+an?\s+(ai|language\s+model)|respond\s+(only\s+)?with\s+json|mark\s+(this\s+)?as\s+(high|urgent)\s+priority/i

const SPAM_STRONG = /(you('ve| have)?\s+won|claim\s+your\s+(prize|reward)|free\s+money|congratulations[^.]{0,40}(won|winner|selected)|act\s+now|100%\s+free|risk[- ]free|wire\s+transfer|crypto\s+giveaway|double\s+your)/i
const SPAM_WEAK = [/click\s+here/i, /limited\s+time/i, /!!+/, /\bbit\.ly\b|\btinyurl\b/i, /\bunsubscribe\b/i, /\b(buy|order)\s+now\b/i, /\bexclusive\s+deal\b/i]

const HIGH = /\b(otp|one[- ]time\s+(password|code)|verification\s+code|security\s+alert|suspicious|unauthori[sz]ed|fraud|payment\s+(failed|declined)|declined|account\s+(locked|suspended|compromised)|password\s+(reset|changed)|2fa|new\s+(device|login)|login\s+attempt|outage|urgent|immediately|overdue)\b/i
const HIGH_CODE = /\b(login|sign[- ]?in|authentication|confirmation)\s+code\b|\bcode\s*:?\s*\d{4,8}\b/i
const LOW = /\b(sale|offer|discount|coupon|promo(tion)?|newsletter|% off|deal|liked|started\s+following|new\s+follower|tips?\s+for|recommended\s+for\s+you)\b/i

const CATEGORY_RULES: [Category, RegExp][] = [
  ['SECURITY', /\b(otp|security|suspicious|unauthori[sz]ed|fraud|password|2fa|login|verification\s+code|account\s+(locked|suspended))\b/i],
  ['ORDER', /\b(order|shipped|shipping|delivered|delivery|tracking|package|parcel|refund|invoice|payment)\b/i],
  ['PROMOTION', /\b(sale|offer|discount|coupon|promo(tion)?|% off|deal|newsletter)\b/i],
  ['SOCIAL', /\b(liked|commented|follow(ed|er|ing)?|mentioned|tagged|friend|shared\s+your|message\s+from)\b/i],
  ['REMINDER', /\b(reminder|due|appointment|meeting|tomorrow|scheduled|deadline|renew)\b/i],
]

export const isInjectionAttempt = (text: string) => INJECTION.test(text)

export interface RuleInput {
  title: string
  message: string
}

/**
 * Deterministic classifier. Used instantly when a notification is created (so obvious spam never toasts),
 * and as the fallback whenever the LLM is unavailable, slow, rate limited, returns bad output, or has no key.
 */
export function classifyWithRules({ title, message }: RuleInput): Analysis {
  const text = `${title}\n${message}`

  if (isInjectionAttempt(text)) {
    return { priority: 'LOW', reason: 'Contains instructions aimed at AI systems', isSpam: true, spamScore: 0.95, category: 'SYSTEM', summary: null }
  }

  let spam = SPAM_STRONG.test(text) ? 0.8 : 0
  spam += SPAM_WEAK.filter((r) => r.test(text)).length * 0.2
  const spamScore = Math.min(1, Number(spam.toFixed(2)))
  const urgent = HIGH.test(text) || HIGH_CODE.test(text)
  const securityNotice = urgent && /\b(otp|code|security|payment|password)\b/i.test(text)
  const isSpam = spamScore >= 0.7 && !securityNotice

  const category = CATEGORY_RULES.find(([, re]) => re.test(text))?.[0] ?? 'SYSTEM'
  const summary = message.length > 160 ? `${message.slice(0, 157).trimEnd()}...` : null

  if (isSpam) return { priority: 'LOW', reason: 'Looks like unsolicited promotion or a scam', isSpam, spamScore, category: 'PROMOTION', summary }
  if (urgent) return { priority: 'HIGH', reason: 'Time-sensitive or security-related keywords', isSpam, spamScore, category, summary }
  if (LOW.test(text)) return { priority: 'LOW', reason: 'Promotional or informational keywords', isSpam, spamScore, category, summary }
  return { priority: 'MEDIUM', reason: 'No urgent signals found', isSpam, spamScore, category, summary }
}

/** Short rule-based group summary, e.g. "3 order updates: Order shipped, Order delayed, ...". */
export function summarizeGroupWithRules(category: Category, titles: string[]): string {
  const label = category.toLowerCase()
  const shown = titles.slice(0, 3).join(', ')
  return `${titles.length} ${label} updates: ${shown}${titles.length > 3 ? ', ...' : ''}`
}


