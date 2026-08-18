import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage({ initialMode = 'login', inviteCode = '', onPasswordReset }) {
  const complimentaryPromoActive = Date.now() >= Date.parse('2026-08-15T04:00:00Z') && Date.now() < Date.parse('2026-08-17T04:00:00Z')
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')

    if (mode === 'forgot') {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/?password-reset=1`,
      })
      setMessage('If that email has a Collector Vault account, a password-reset link is on its way.')
      setSubmitting(false)
      return
    }

    if (mode === 'recovery') {
      if (password !== passwordConfirmation) {
        setMessage('The new passwords do not match.')
        setSubmitting(false)
        return
      }
      const { error } = await supabase.auth.updateUser({ password })
      setMessage(error?.message || 'Your password has been updated. You are signed in.')
      setSubmitting(false)
      if (!error) {
        window.history.replaceState({}, '', window.location.pathname)
        onPasswordReset?.()
      }
      return
    }

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

    setMessage(
      result.error?.message ||
      (mode === 'signup'
        ? result.data?.session
          ? 'Account created. Welcome to Collector Vault!'
          : 'Account created. Check your email to finish signing in.'
        : 'Signed in successfully.'),
    )
    setSubmitting(false)
  }

  const heading = mode === 'recovery' ? 'Choose a new password' : mode === 'forgot' ? 'Reset your password' : mode === 'login' ? 'Welcome back' : 'Create your free vault'

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <span className="eyebrow">Free forever · Upgrade when ready</span>
        <h1>Collector Vault</h1>
        <p>Create your free vault and track your complete collection, missing figures, wishlist, duplicates, ISO, DISO, and trades. No card required.</p>
        <button className="text-button" type="button" onClick={() => { window.location.hash = 'about' }}>← Explore everything Collector Vault offers</button>
      </section>

      <form className="auth-card" onSubmit={submit}>
        <h2>{heading}</h2>
        {mode === 'recovery' && <p className="auth-helper">Choose a new password for your Collector Vault account.</p>}
        {mode === 'forgot' && <p className="auth-helper">Enter your email and we’ll send a secure reset link if an account exists.</p>}
        {mode === 'signup' && complimentaryPromoActive && <p className="form-message invite-welcome"><strong>Two-day collector offer:</strong> Sign up August 15 or 16 and receive one complimentary year of Collector Vault Pro.</p>}
        {mode === 'signup' && inviteCode && <p className="form-message invite-welcome">A Collector Vault subscriber invited you. Create your free account to join them.</p>}
        {mode !== 'recovery' && <input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} required />}
        {mode !== 'forgot' && <input type="password" placeholder={mode === 'recovery' ? 'New password (8+ characters)' : 'Password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === 'recovery' ? 8 : undefined} required />}
        {mode === 'recovery' && <input type="password" placeholder="Confirm new password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} minLength="8" required />}
        {mode === 'signup' && <label className="marketing-opt-in"><input type="checkbox" checked={marketingOptIn} onChange={(event) => setMarketingOptIn(event.target.checked)} /><span>Email me Collector Vault launches, collector tips, and occasional offers. Optional; unsubscribe anytime.</span></label>}
        {message && <p className="form-message" role="status">{message}</p>}
        <button className="primary-button" disabled={submitting}>
          {submitting ? 'Please wait…' : mode === 'recovery' ? 'Save new password' : mode === 'forgot' ? 'Email reset link' : mode === 'login' ? 'Sign in' : 'Create free account'}
        </button>
        {mode === 'login' && <button type="button" className="text-button" onClick={() => { setMode('forgot'); setMessage('') }}>Forgot or want to reset your password?</button>}
        {mode === 'forgot' && <button type="button" className="text-button" onClick={() => { setMode('login'); setMessage('') }}>Return to sign in</button>}
        {['login', 'signup'].includes(mode) && <button type="button" className="text-button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>}
      </form>
    </main>
  )
}
