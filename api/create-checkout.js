import { appUrl, authenticatedUser, getAdminSupabase, getStripe, sendError } from './_server.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })
  try {
    const user = await authenticatedUser(req)
    if (!user) return res.status(401).json({ error: 'Please sign in again.' })
    const interval = req.body?.interval === 'year' ? 'year' : 'month'
    const price = interval === 'year' ? process.env.STRIPE_YEARLY_PRICE_ID : process.env.STRIPE_MONTHLY_PRICE_ID
    if (!price) return res.status(503).json({ error: 'Secure checkout is being connected. Please try again shortly.' })

    const db = getAdminSupabase()
    const stripe = getStripe()
    const { data: membership } = await db.from('memberships').select('stripe_customer_id').eq('user_id', user.id).maybeSingle()
    let customer = membership?.stripe_customer_id
    if (!customer) {
      const created = await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } })
      customer = created.id
      await db.from('memberships').upsert({ user_id: user.id, stripe_customer_id: customer, updated_at: new Date().toISOString() })
    }
    const base = appUrl(req)
    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription', customer, line_items: [{ price, quantity: 1 }],
      subscription_data: { trial_period_days: 7, metadata: { supabase_user_id: user.id } },
      metadata: { supabase_user_id: user.id, billing_interval: interval },
      allow_promotion_codes: true,
      success_url: `${base}/?membership=success`, cancel_url: `${base}/?membership=canceled`,
    })
    res.status(200).json({ url: checkout.url })
  } catch (error) { sendError(res, error) }
}
