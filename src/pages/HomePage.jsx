import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import CollectionPage from './CollectionPage'
import AdminPage from './AdminPage'

const NAV_ITEMS = [['dashboard', 'Dashboard'], ['collection', 'Collection'], ['wishlist', 'Wishlist'], ['iso', 'ISO'], ['diso', 'DISO'], ['trade', 'Trades']]

export default function HomePage({ session }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [view, setView] = useState('dashboard')

  useEffect(() => {
    supabase.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle().then(({ data }) => setIsAdmin(Boolean(data)))
  }, [session.user.id])

  return <>
    <nav className="top-nav">
      <button className="brand-button" onClick={() => setView('dashboard')}>Collector Vault</button>
      <div className="nav-actions">{NAV_ITEMS.map(([id, label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>{label}</button>)}{isAdmin && <button className={view === 'admin' ? 'active' : ''} onClick={() => setView('admin')}>Admin</button>}<button onClick={() => supabase.auth.signOut()}>Sign out</button></div>
    </nav>
    {view === 'admin' && isAdmin ? <AdminPage /> : <CollectionPage session={session} view={view} onNavigate={setView} />}
  </>
}
