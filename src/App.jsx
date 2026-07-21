import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import MembershipGate from './components/MembershipGate'
import InstallApp from './components/InstallApp'
import AboutPage from './pages/AboutPage'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [route, setRoute] = useState(window.location.hash.slice(1))

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const updateRoute = () => setRoute(window.location.hash.slice(1))
    window.addEventListener('hashchange', updateRoute)
    return () => window.removeEventListener('hashchange', updateRoute)
  }, [])

  if (loading) return <div className="center">Opening Collector Vault…</div>
  if (route.startsWith('about') || ['features', 'tour', 'pricing', 'contact'].includes(route) || (!session && !route.startsWith('signin'))) return <><AboutPage session={session} /><InstallApp /></>
  return <>
    {session ? <MembershipGate session={session}><HomePage session={session} /></MembershipGate> : <AuthPage initialMode={route === 'signin-signup' ? 'signup' : 'login'} />}
    <InstallApp />
  </>
}
