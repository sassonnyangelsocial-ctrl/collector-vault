import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { apiUrl, isNativeApp } from '../lib/runtime'

export default function MembershipGate({ session, children }) {
  const [membership, setMembership] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  async function load() {
    const { data, error } = await supabase.from('memberships').select('*').eq('user_id', session.user.id).maybeSingle()
    if (error) setMessage(error.message)
    setMembership(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [session.user.id])

  const current = membership && (membership.grandfathered || ['active', 'trialing'].includes(membership.status)) && (!membership.current_period_end || new Date(membership.current_period_end) > new Date())
  if (loading) return <div className="center">Checking membership...</div>
  if (current) return children

  if (isNativeApp) return <main className="membership-page">
    <section className="membership-heading"><span className="eyebrow">Collector Vault membership</span><h1>Membership required</h1><p>In-app membership purchasing is being prepared for this store release. If you already subscribed, sign in with the same account to continue.</p></section>
    {message && <p className="form-message membership-message">{message}</p>}
    <button className="text-button" onClick={() => supabase.auth.signOut()}>Sign out</button>
  </main>

  async function checkout(interval) {
    setMessage('Opening secure checkout...')
    const response = await fetch(apiUrl('/api/create-checkout'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ interval }) })
    const result = await response.json()
    if (!response.ok) return setMessage(result.error || 'Checkout is not available yet.')
    window.location.assign(result.url)
  }

  return <main className="membership-page">
    <section className="membership-heading"><span className="eyebrow">Collector Vault membership</span><h1>Start your 7-day free trial</h1><p>Track your collection, build wishlists and trade lists, and follow verified restock and launch alerts.</p></section>
    <section className="pricing-grid">
      <article className="price-card"><span>Monthly</span><strong>$4.99<small>/month</small></strong><p>Flexible access, billed monthly after your free trial.</p><button className="primary-button" onClick={() => checkout('month')}>Start monthly trial</button></article>
      <article className="price-card featured"><span>Best value</span><strong>$49.99<small>/year</small></strong><p>Save compared with monthly billing. Cancel anytime.</p><button className="primary-button" onClick={() => checkout('year')}>Start yearly trial</button></article>
    </section>
    {message && <p className="form-message membership-message">{message}</p>}
    <button className="text-button" onClick={() => supabase.auth.signOut()}>Sign out</button>
  </main>
}
