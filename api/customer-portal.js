import { appUrl, authenticatedUser, getAdminSupabase, getStripe, sendError } from './_server.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })
  try {
    const user = await authenticatedUser(req)
    if (!user) return res.status(401).json({ error: 'Please sign in again.' })
    const { data } = await getAdminSupabase().from('memberships').select('stripe_customer_id').eq('user_id', user.id).single()
    if (!data?.stripe_customer_id) return res.status(404).json({ error: 'No billing account found.' })
    const portal = await getStripe().billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: appUrl(req) })
    res.status(200).json({ url: portal.url })
  } catch (error) { sendError(res, error) }
}
