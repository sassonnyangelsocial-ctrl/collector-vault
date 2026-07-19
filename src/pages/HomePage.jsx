import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import CollectionPage from './CollectionPage'
import AdminPage from './AdminPage'

export default function HomePage({ session }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [view, setView] = useState('collection')

  useEffect(() => {
    supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)))
  }, [session.user.id])

  return (
    <>
      <nav className="top-nav">
        <button className="brand-button" onClick={() => setView('collection')}>Collector Vault</button>
        <div className="nav-actions">
          <button className={view === 'collection' ? 'active' : ''} onClick={() => setView('collection')}>Collection</button>
          {isAdmin && <button className={view === 'admin' ? 'active' : ''} onClick={() => setView('admin')}>Admin</button>}
          <button onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </nav>

      {view === 'admin' && isAdmin ? <AdminPage /> : <CollectionPage session={session} />}
    </>
  )
}
