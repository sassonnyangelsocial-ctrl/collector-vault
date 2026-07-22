import { authenticatedUser, getAdminSupabase, sendError } from './_server.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' })

  try {
    const user = await authenticatedUser(req)
    if (!user) return res.status(401).json({ error: 'Please sign in again.' })

    const db = getAdminSupabase()
    const { data: admin, error: adminError } = await db
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (adminError) throw adminError
    if (!admin) return res.status(403).json({ error: 'Administrator access required.' })

    const users = []
    for (let page = 1; ; page += 1) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) throw error
      users.push(...data.users)
      if (data.users.length < 1000) break
    }

    const ids = users.map((item) => item.id)
    const { data: memberships, error: membershipError } = ids.length
      ? await db.from('memberships').select('user_id,status,billing_interval,current_period_end,trial_end,grandfathered,created_at').in('user_id', ids)
      : { data: [], error: null }
    if (membershipError) throw membershipError

    const membershipByUser = new Map((memberships || []).map((item) => [item.user_id, item]))
    const subscribers = users.map((item) => {
      const membership = membershipByUser.get(item.id)
      return {
        id: item.id,
        email: item.email || '',
        created_at: item.created_at,
        last_sign_in_at: item.last_sign_in_at,
        email_confirmed_at: item.email_confirmed_at,
        status: membership?.status || 'registered',
        billing_interval: membership?.billing_interval || null,
        current_period_end: membership?.current_period_end || null,
        trial_end: membership?.trial_end || null,
        grandfathered: Boolean(membership?.grandfathered),
      }
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    const paidStatuses = new Set(['active', 'trialing', 'past_due'])
    res.setHeader('Cache-Control', 'private, no-store')
    return res.json({
      summary: {
        total: subscribers.length,
        active: subscribers.filter((item) => item.status === 'active').length,
        trialing: subscribers.filter((item) => item.status === 'trialing').length,
        paying_or_billable: subscribers.filter((item) => paidStatuses.has(item.status)).length,
        canceled: subscribers.filter((item) => ['canceled', 'unpaid', 'incomplete_expired'].includes(item.status)).length,
      },
      subscribers,
    })
  } catch (error) {
    return sendError(res, error)
  }
}
