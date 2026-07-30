import { authenticatedUser, getAdminSupabase, sendError } from './_server.js'

const launchKit = {
  sequence: 'Teaser Story → demo Reel → launch post → evening proof/FAQ Story.',
  reel: { title: 'From case to cash', steps: [['0–3s · Hook','Screen text: “What did your last live actually profit?”'],['3–9s · Problem','Flash invoices, supplier messages, and a messy spreadsheet.'],['9–20s · Reveal','Screen-record Supplier CRM → Purchase Orders → Whatnot CSV Import → Profit Snapshot.'],['20–27s · Payoff','Screen text: “Know your numbers. Grow your collection business.”'],['27–30s · CTA','“Seller Pro is live inside Collector Vault. Link in bio.”']], caption: 'What did your last live actually profit? Seller Pro tracks cases, suppliers, Whatnot fees, payouts and real margins in one place. Live now inside Collector Vault. #WhatnotSeller #SonnyAngelSeller #ResellerBusiness' },
  schedule: [['10:00 AM','Story teaser + countdown sticker'],['12:00 PM','Demo Reel + link in bio'],['3:00 PM','Carousel launch post'],['7:00 PM','FAQ Story + founder offer reminder']],
  offer: 'Join this week and get Seller Pro onboarding plus our Whatnot profit template included.',
  posts: [['Launch post','Your collection has a business side now.','Introducing Seller Pro inside Collector Vault ✨ Log every case and supply order, organize suppliers, import Whatnot sales, track fees and COGS, and see estimated profit in one calm dashboard. Founding seller access is open now. Comment SELLER and I’ll send the link. #SonnyAngelSeller #WhatnotSeller #ResellerTools #CollectorVault'],['Feature post','Stop calculating show profit in your head.','Your sell price is not your profit. Seller Pro brings your Whatnot sales, platform fees, shipping costs, inventory cost, and payouts together—so you can see what each show actually earned. Import your Seller Hub CSV and let the dashboard do the math. Join Collector Vault today.'],['Community post','Built for collectors who became sellers.','The supplier texts. The case invoices. The shipping supplies. The live-sale CSVs. The “did I actually make money?” spreadsheet. We put it all in one place. Seller Pro is live in Collector Vault 💗']],
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' })
  try {
    const user = await authenticatedUser(req)
    if (!user) return res.status(401).json({ error: 'Please sign in again.' })
    const { data: admin, error } = await getAdminSupabase().from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle()
    if (error) throw error
    if (!admin) return res.status(403).json({ error: 'Administrator access required.' })
    res.setHeader('Cache-Control', 'private, no-store')
    return res.json(launchKit)
  } catch (error) { return sendError(res, error) }
}
