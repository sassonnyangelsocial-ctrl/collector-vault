import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage({ initialMode = 'login', inviteCode = '' }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')

    const result =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                marketing_opt_in: marketingOptIn,
                marketing_opt_in_at: marketingOptIn ? new Date().toISOString() : null,
                collector_vault_invite: /^[a-z0-9]{10,32}$/.test(inviteCode) ? inviteCode : null,
              },
            },
          })

    setMessage(result.error?.message || 'Account created. Check your email if confirmation is enabled.')
    setSubmitting(false)
  }

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <span className="eyebrow">Free forever · Upgrade when ready</span>
        <h1>Collector Vault</h1>
        <p>Create your free vault and track your complete collection, missing figures, wishlist, duplicates, ISO, DISO, and trades. No card required.</p>
        <button className="text-button" type="button" onClick={() => { window.location.hash = 'about' }}>← Explore everything Collector Vault offers</button>
      </section>

      <form className="auth-card" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your free vault'}</h2>
        {mode === 'signup' && inviteCode && <p className="form-message invite-welcome">A Collector Vault subscriber invited you. Create your free account to join them.</p>}
        <input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {mode === 'signup' && <label className="marketing-opt-in"><input type="checkbox" checked={marketingOptIn} onChange={(event) => setMarketingOptIn(event.target.checked)} /><span>Email me Collector Vault launches, collector tips, and occasional offers. Optional; unsubscribe anytime.</span></label>}
        {message && <p className="form-message">{message}</p>}
        <button className="primary-button" disabled={submitting}>
          {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create free account'}
        </button>
        <button type="button" className="text-button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </form>
    </main>
  )
}
