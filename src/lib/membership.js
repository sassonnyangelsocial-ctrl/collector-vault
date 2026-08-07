export function hasProAccess(membership, now = Date.now()) {
  if (!membership) return false
  if (membership.grandfathered) return true
  if (!['active', 'trialing'].includes(membership.status)) return false
  if (!membership.current_period_end) return true
  return new Date(membership.current_period_end).getTime() > now
}
