import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { apiUrl } from '../lib/runtime'
import { hasProAccess } from '../lib/membership'

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

  const current = hasProAccess(membership)
  if (loading) return <div className="center">Checking membership...</div>

  async function checkout(interval) {
    setMessage('Opening secure checkout...')
    const response = await fetch(apiUrl('/api/create-checkout'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ interval }) })
    const result = await response.json()
    if (!response.ok) return setMessage(result.error || 'Checkout is not available yet.')
    window.location.assign(result.url)
  }

  return children({ isPro: current, membership, checkout, message })
}
