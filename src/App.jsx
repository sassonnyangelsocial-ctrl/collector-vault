import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const emojis = { Regular: '👼', Secret: '✨', Robby: '🤖', Limited: '💫', Custom: '🎨' }

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  if (loading) return <div className="center">Opening Collector Vault…</div>
  return session ? <Dashboard session={session} /> : <Auth />
}

function Auth() {
  const [mode, setMode] = useState('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setMessage('')
    setBusy(true)
    const result = mode === 'signup'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (result.error) setMessage(result.error.message)
    else if (mode === 'signup') setMessage('Account created. Check your email if confirmation is enabled.')
  }

  return (
    <main className="auth">
      <section className="brand">
        <p className="eyebrow">COLLECT • TRACK • TRADE</p>
        <h1>Collector Vault</h1>
        <p>Your collection, ISO list, duplicates, and trades in one place.</p>
      </section>
      <form className="panel" onSubmit={submit}>
        <h2>{mode === 'signup' ? 'Create your vault' : 'Welcome back'}</h2>
        <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" minLength="6" value={password} onChange={e=>setPassword(e.target.value)} required /></label>
        {message && <p className="message">{message}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        <button type="button" className="link" onClick={()=>setMode(mode==='signup'?'login':'signup')}>
          {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
        </button>
      </form>
    </main>
  )
}

function Dashboard({ session }) {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data, error } = await supabase.from('collection_items').select('*').order('series').order('name')
    if (error) setNotice(error.message)
    else setItems(data || [])
  }

  async function save(values) {
    const payload = { ...values, user_id: session.user.id }
    const result = editing
      ? await supabase.from('collection_items').update(payload).eq('id', editing.id)
      : await supabase.from('collection_items').insert(payload)
    if (result.error) setNotice(result.error.message)
    else {
      setNotice(editing ? 'Updated.' : 'Added.')
      setEditing(null)
      setFormOpen(false)
      load()
    }
  }

  async function toggle(item, field) {
    const update = { [field]: !item[field] }
    if (field === 'owned') update.quantity = update.owned ? Math.max(1, item.quantity || 0) : 0
    const { error } = await supabase.from('collection_items').update(update).eq('id', item.id)
    if (error) setNotice(error.message)
    else setItems(list => list.map(x => x.id === item.id ? { ...x, ...update } : x))
  }

  async function remove(id) {
    if (!confirm('Delete this collectible?')) return
    const { error } = await supabase.from('collection_items').delete().eq('id', id)
    if (error) setNotice(error.message)
    else load()
  }

  const shown = useMemo(() => items.filter(i => {
    const text = `${i.name} ${i.series} ${i.brand || ''}`.toLowerCase().includes(search.toLowerCase())
    const status = filter === 'all' || (filter === 'missing' ? !i.owned : filter === 'trade' ? i.for_trade : i[filter])
    return text && status
  }), [items, filter, search])

  const groups = shown.reduce((a,i) => ((a[i.series] ||= []).push(i), a), {})
  const owned = items.filter(i=>i.owned).length
  const pct = items.length ? Math.round((owned/items.length)*100) : 0

  return (
    <div className="shell">
      <header>
        <div><p className="eyebrow">MY COLLECTION</p><h1>Collector Vault</h1></div>
        <button className="signout" onClick={()=>supabase.auth.signOut()}>Sign out</button>
      </header>

      <section className="stats">
        <Stat value={`${owned}/${items.length}`} label="Collected" />
        <Stat value={`${pct}%`} label="Complete" />
        <Stat value={items.filter(i=>i.wishlist).length} label="ISO" />
        <Stat value={items.filter(i=>i.for_trade).length} label="Trade" />
      </section>

      <input className="search" placeholder="Search figures, brands, or series…" value={search} onChange={e=>setSearch(e.target.value)} />

      <nav className="tabs">
        {['all','owned','wishlist','trade','missing'].map(f => (
          <button key={f} className={filter===f?'active':''} onClick={()=>setFilter(f)}>
            {f==='wishlist'?'ISO':f[0].toUpperCase()+f.slice(1)}
          </button>
        ))}
      </nav>

      {!shown.length && <section className="empty"><div>📦</div><h2>No collectibles here yet</h2><p>Add your first item with the pink button.</p></section>}

      {Object.entries(groups).map(([series, group]) => (
        <section className="series" key={series}>
          <div className="series-title"><h2>{series}</h2><span>{group.filter(i=>i.owned).length} owned</span></div>
          <div className="grid">
            {group.map(item => (
              <article className="card" key={item.id}>
                <button className="body" onClick={()=>{setEditing(item);setFormOpen(true)}}>
                  <div className="art">{emojis[item.rarity] || '👼'}</div>
                  <div className="copy">
                    <div className="row"><h3>{item.name}{item.quantity>1?` ×${item.quantity}`:''}</h3><span>{item.rarity}</span></div>
                    <p>{item.brand || 'User Added'} • {item.series}</p>
                    {item.notes && <small>{item.notes}</small>}
                  </div>
                </button>
                <div className="actions">
                  <button className={item.owned?'on':''} onClick={()=>toggle(item,'owned')}>✓ Owned</button>
                  <button className={item.wishlist?'on':''} onClick={()=>toggle(item,'wishlist')}>♡ ISO</button>
                  <button className={item.for_trade?'on':''} onClick={()=>toggle(item,'for_trade')}>⇄ Trade</button>
                  <button onClick={()=>remove(item.id)}>×</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <button className="fab" onClick={()=>{setEditing(null);setFormOpen(true)}}>＋</button>
      {formOpen && <ItemForm item={editing} close={()=>{setEditing(null);setFormOpen(false)}} save={save} />}
      {notice && <div className="notice" onClick={()=>setNotice('')}>{notice}</div>}
    </div>
  )
}

function Stat({value,label}) {
  return <div className="stat"><strong>{value}</strong><span>{label}</span></div>
}

function ItemForm({ item, close, save }) {
  const [name,setName]=useState(item?.name || '')
  const [series,setSeries]=useState(item?.series || '')
  const [brand,setBrand]=useState(item?.brand || 'User Added')
  const [rarity,setRarity]=useState(item?.rarity || 'Regular')
  const [quantity,setQuantity]=useState(item?.quantity || 0)
  const [notes,setNotes]=useState(item?.notes || '')

  function submit(e) {
    e.preventDefault()
    const qty = Number(quantity)
    save({
      name:name.trim(), series:series.trim(), brand:brand.trim(), rarity,
      quantity:qty, owned:qty>0, wishlist:item?.wishlist || false,
      for_trade:item?.for_trade || false, notes:notes.trim()
    })
  }

  return <div className="overlay">
    <form className="modal" onSubmit={submit}>
      <div className="modal-head"><h2>{item?'Edit collectible':'Add collectible'}</h2><button type="button" onClick={close}>×</button></div>
      <label>Name<input value={name} onChange={e=>setName(e.target.value)} required /></label>
      <label>Series<input value={series} onChange={e=>setSeries(e.target.value)} required /></label>
      <label>Brand<input value={brand} onChange={e=>setBrand(e.target.value)} /></label>
      <div className="twocol">
        <label>Type<select value={rarity} onChange={e=>setRarity(e.target.value)}>{['Regular','Secret','Robby','Limited','Custom'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>Quantity<input type="number" min="0" max="99" value={quantity} onChange={e=>setQuantity(e.target.value)} /></label>
      </div>
      <label>Notes<textarea rows="3" value={notes} onChange={e=>setNotes(e.target.value)} /></label>
      <button className="primary">Save collectible</button>
    </form>
  </div>
}
