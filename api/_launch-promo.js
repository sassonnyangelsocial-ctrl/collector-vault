export const LAUNCH_PROMO_START = '2026-08-02T04:00:00.000Z'
export const LAUNCH_PROMO_END = '2026-08-08T03:59:59.999Z'
export const LAUNCH_PROMO_TRIAL_DAYS = 30
export const STANDARD_TRIAL_DAYS = 7

export function isLaunchPromoSignup(userCreatedAt, now = new Date()) {
  const created = new Date(userCreatedAt).getTime()
  const current = new Date(now).getTime()
  return Number.isFinite(created)
    && created >= new Date(LAUNCH_PROMO_START).getTime()
    && created <= new Date(LAUNCH_PROMO_END).getTime()
    && current <= new Date(LAUNCH_PROMO_END).getTime()
}
