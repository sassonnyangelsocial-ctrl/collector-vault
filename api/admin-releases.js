import { authenticatedUser, getAdminSupabase, sendError } from './_server.js'

const ALLOWED_TYPES = new Set(['restock', 'drop', 'launch', 'inventory'])

function clean(value, max = 500) {
  return String(value || '').trim().slice(0, max)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })
  try {
    const user = await authenticatedUser(req)
    if (!user) return res.status(401).json({ error: 'Please sign in again.' })
    const db = getAdminSupabase()
    const { data: admin, error: adminError } = await db.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle()
    if (adminError) throw adminError
    if (!admin) return res.status(403).json({ error: 'Administrator access required.' })

    const title = clean(req.body?.title, 160)
    const productUrl = clean(req.body?.product_url, 1000)
    const eventAt = new Date(req.body?.event_at)
    const alertType = ALLOWED_TYPES.has(req.body?.alert_type) ? req.body.alert_type : 'launch'
    const sourceId = Number(req.body?.source_id)
    if (!title || !productUrl || Number.isNaN(eventAt.getTime()) || !Number.isInteger(sourceId)) {
      return res.status(400).json({ error: 'Title, verified source, event time, and product URL are required.' })
    }
    const parsedUrl = new URL(productUrl)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) return res.status(400).json({ error: 'Use a valid http or https URL.' })

    const payload = {
      source_id: sourceId,
      title,
      alert_type: alertType,
      description: clean(req.body?.description, 2000) || null,
      product_url: parsedUrl.href,
      availability: clean(req.body?.availability, 120) || 'Upcoming',
      region: clean(req.body?.region, 120) || 'Online',
      event_location: clean(req.body?.event_location, 240) || null,
      event_at: eventAt.toISOString(),
      fingerprint: `manual-release-${crypto.randomUUID()}`,
      published_at: new Date().toISOString(),
    }
    const { data, error } = await db.from('stock_alerts').insert(payload).select('*,source:source_id(name,url,verified)').single()
    if (error) throw error
    res.status(201).json({ release: data })
  } catch (error) {
    sendError(res, error)
  }
}
