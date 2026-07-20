import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured yet.')
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

export function getAdminSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Server database credentials are not configured yet.')
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function authenticatedUser(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await getAdminSupabase().auth.getUser(token)
  return error ? null : data.user
}

export function appUrl(req) {
  return process.env.APP_URL || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`
}

export function sendError(res, error, status = 500) {
  console.error(error)
  res.status(status).json({ error: error?.message || 'Something went wrong.' })
}
