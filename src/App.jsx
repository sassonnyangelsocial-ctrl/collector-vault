import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import MembershipGate from './components/MembershipGate'
import InstallApp from './components/InstallApp'
import AboutPage from './pages/AboutPage'
import PartnersPage from './pages/PartnersPage'
import LiveStreamStage from './components/LiveStreamStage'

function getRoute() {
  const hashRoute = window.location.hash.slice(1)
  if (hashRoute) return hashRoute
  return window.location.pathname.replace(/^\/+|\/+$/g, '')
}

function isPasswordRecovery() {
  return new URLSearchParams(window.location.search).get('password-reset') === '1'
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [route, setRoute] = useState(getRoute)
  const [passwordRecovery, setPasswordRecovery] = useState(isPasswordRecovery)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      setSession(nextSession)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const updateRoute = () => setRoute(getRoute())
    window.addEventListener('hashchange', updateRoute)
    window.addEventListener('popstate', updateRoute)
    return () => {
      window.removeEventListener('hashchange', updateRoute)
      window.removeEventListener('popstate', updateRoute)
    }
  }, [])

  if (loading) return <div className="center">Opening Collector Vault…</div>
  if (route.startsWith('live-wheel/')) return <main className="seller-page guest-live-page"><LiveStreamStage userId={session?.user?.id || null} /></main>
  if (route === 'partners') return <><PartnersPage session={session} /><InstallApp /></>
  if (route.startsWith('about') || ['features', 'tour', 'pricing', 'contact'].includes(route) || (!session && !route.startsWith('signin') && !passwordRecovery)) return <><AboutPage session={session} /><InstallApp /></>
  const inviteCode = new URLSearchParams(window.location.search).get('invite') || ''
  return <>
    {passwordRecovery ? <AuthPage initialMode="recovery" onPasswordReset={() => setPasswordRecovery(false)} /> : session ? <MembershipGate session={session}>{(membership) => <HomePage session={session} {...membership} />}</MembershipGate> : <AuthPage initialMode={route === 'signin-signup' || Boolean(inviteCode) ? 'signup' : 'login'} inviteCode={inviteCode} />}
    <InstallApp />
  </>
}
