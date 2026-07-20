import { getAdminSupabase, getStripe, sendError } from './_server.js'

export const config = { api: { bodyParser: false } }

async function rawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')
  try {
    const stripe = getStripe()
    const event = stripe.webhooks.constructEvent(await rawBody(req), req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)
    const db = getAdminSupabase()
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      await db.from('memberships').update({ stripe_customer_id: session.customer, stripe_subscription_id: session.subscription, billing_interval: session.metadata?.billing_interval, updated_at: new Date().toISOString() }).eq('user_id', session.metadata?.supabase_user_id)
    }
    if (event.type.startsWith('customer.subscription.')) {
      const subscription = event.data.object
      const userId = subscription.metadata?.supabase_user_id
      const item = subscription.items?.data?.[0]
      const patch = { stripe_customer_id: subscription.customer, stripe_subscription_id: subscription.id, status: subscription.status, billing_interval: item?.price?.recurring?.interval, current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null, trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null, grandfathered: false, updated_at: new Date().toISOString() }
      if (userId) await db.from('memberships').update(patch).eq('user_id', userId)
      else await db.from('memberships').update(patch).eq('stripe_customer_id', subscription.customer)
    }
    res.status(200).json({ received: true })
  } catch (error) { sendError(res, error, 400) }
}
