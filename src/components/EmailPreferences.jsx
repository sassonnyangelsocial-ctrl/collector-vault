import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function EmailPreferences({ session }) {
  const metadata = session.user.user_metadata || {}
  const [enabled, setEnabled] = useState(metadata.marketing_opt_in === true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function save(nextEnabled) {
    setSaving(true)
    setMessage('')
    const now = new Date().toISOString()
    const { error } = await supabase.auth.updateUser({
      data: {
        ...metadata,
        marketing_opt_in: nextEnabled,
        marketing_opt_in_at: nextEnabled ? (metadata.marketing_opt_in_at || now) : null,
        marketing_unsubscribed_at: nextEnabled ? null : now,
      },
    })
    if (error) {
      setMessage(error.message)
    } else {
      setEnabled(nextEnabled)
      setMessage(nextEnabled ? 'You are subscribed to Collector Vault emails.' : 'You are unsubscribed from marketing emails.')
    }
    setSaving(false)
  }

  return (
    <section className="email-preferences-page">
      <section className="email-preferences-card">
        <span className="eyebrow">Email preferences</span>
        <h1>Choose what reaches your inbox.</h1>
        <p>Opt in for Collector Vault product launches, collector tips, feature education, and occasional offers. Account-security and essential service messages may still be sent when needed.</p>
        <label className="email-consent-toggle">
          <input type="checkbox" checked={enabled} disabled={saving} onChange={(event) => save(event.target.checked)} />
          <span><strong>Marketing emails</strong><small>Optional. Turn this off anytime to unsubscribe.</small></span>
        </label>
        <p className="email-address-note">Preference for <strong>{session.user.email}</strong></p>
        {message && <p className="form-message" role="status">{message}</p>}
      </section>
    </section>
  )
}
