import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const figureIcons = {
  Regular: '👼',
  Secret: '✨',
  Robby: '🤖',
  Limited: '💫',
  Custom: '🎨'
}

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
  return session ? <Catalog session={session} /> : <Auth />
}

function Auth() {
  const [mode, setMode] = useState('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
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
        <p>Your Sonny Angel collection, ISO list, duplicates, and trades in one place.</p>
      </section>
      <form className="panel" onSubmit={submit}>
        <h2>{mode === 'signup' ? 'Create your vault' : 'Welcome back'}</h2>
        <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" minLength="6" value={password} onChange={e => setPassword(e.target.value)} required /></label>
        {message && <p className="message">{message}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        <button type="button" className="link" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>
          {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
        </button>
      </form>
    </main>
  )
}

function Catalog({ session }) {
  const [figures, setFigures] = useState([])
  const [states, setStates] = useState({})
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [seriesFilter, setSeriesFilter] = useState('all')
  const [rarityFilter, setRarityFilter] = useState('all')
  const [notice, setNotice] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: catalog, error: catalogError }, { data: userRows, error: userError }] = await Promise.all([
      supabase
        .from('figures')
        .select('id,name,rarity,sort_order,series:series_id(id,name,category,sort_order,brand:brand_id(name))')
        .eq('active', true),
      supabase
        .from('user_figures')
        .select('*')
        .eq('user_id', session.user.id)
    ])

    if (catalogError || userError) {
      setNotice((catalogError || userError).message)
      return
    }

    setFigures((catalog || []).sort((a, b) =>
      (a.series.sort_order - b.series.sort_order) || (a.sort_order - b.sort_order)
    ))

    const stateMap = {}
    ;(userRows || []).forEach(row => { stateMap[row.figure_id] = row })
    setStates(stateMap)
  }

  async function saveFigureState(figure, patch) {
    const current = states[figure.id] || {
      owned: false, quantity: 0, wishlist: false, for_trade: false, favorite: false, notes: null
    }
    const next = { ...current, ...patch }

    if (next.quantity > 0) next.owned = true
    if (!next.owned) next.quantity = 0
    if (next.quantity < 0) next.quantity = 0

    const payload = {
      user_id: session.user.id,
      figure_id: figure.id,
      owned: Boolean(next.owned),
      quantity: Number(next.quantity || 0),
      wishlist: Boolean(next.wishlist),
      for_trade: Boolean(next.for_trade),
      favorite: Boolean(next.favorite),
      notes: next.notes || null
    }

    const { data, error } = await supabase
      .from('user_figures')
      .upsert(payload, { onConflict: 'user_id,figure_id' })
      .select()
      .single()

    if (error) setNotice(error.message)
    else setStates(old => ({ ...old, [figure.id]: data }))
  }

  const seriesNames = [...new Set(figures.map(f => f.series.name))]
  const rarityNames = [...new Set(figures.map(f => f.rarity))]

  const visible = useMemo(() => figures.filter(figure => {
    const state = states[figure.id] || {}
    const matchesText = `${figure.name} ${figure.series.name} ${figure.rarity}`
      .toLowerCase()
      .includes(query.toLowerCase())

    const matchesSeries = seriesFilter === 'all' || figure.series.name === seriesFilter
    const matchesRarity = rarityFilter === 'all' || figure.rarity === rarityFilter

    const matchesStatus =
      filter === 'all' ||
      (filter === 'missing' && !state.owned) ||
      (filter === 'owned' && state.owned) ||
      (filter === 'wishlist' && state.wishlist) ||
      (filter === 'trade' && state.for_trade) ||
      (filter === 'favorite' && state.favorite) ||
      (filter === 'duplicates' && Number(state.quantity || 0) > 1)

    return matchesText && matchesSeries && matchesRarity && matchesStatus
  }), [figures, states, query, filter, seriesFilter, rarityFilter])

  const grouped = visible.reduce((acc, figure) => {
    ;(acc[figure.series.name] ||= []).push(figure)
    return acc
  }, {})

  const ownedCount = figures.filter(f => states[f.id]?.owned).length
  const totalQuantity = figures.reduce((sum, f) => sum + Number(states[f.id]?.quantity || 0), 0)
  const duplicateCount = figures.reduce((sum, f) => sum + Math.max(0, Number(states[f.id]?.quantity || 0) - 1), 0)
  const completion = figures.length ? Math.round((ownedCount / figures.length) * 100) : 0

  return (
    <div className="shell">
      <header>
        <div>
          <p className="eyebrow">MY COLLECTION</p>
          <h1>Collector Vault</h1>
          <small>Sonny Angel catalog beta</small>
        </div>
        <button className="signout" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>

      <section className="stats">
        <Stat value={`${ownedCount}/${figures.length}`} label="Unique Owned" />
        <Stat value={`${completion}%`} label="Complete" />
        <Stat value={totalQuantity} label="Total Figures" />
        <Stat value={duplicateCount} label="Duplicates" />
        <Stat value={figures.filter(f => states[f.id]?.wishlist).length} label="ISO" />
        <Stat value={figures.filter(f => states[f.id]?.for_trade).length} label="Trade" />
      </section>

      <section className="tools">
        <input placeholder="Search figures, rarity, or series…" value={query} onChange={e => setQuery(e.target.value)} />
        <select value={seriesFilter} onChange={e => setSeriesFilter(e.target.value)}>
          <option value="all">All series</option>
          {seriesNames.map(name => <option key={name}>{name}</option>)}
        </select>
        <select value={rarityFilter} onChange={e => setRarityFilter(e.target.value)}>
          <option value="all">All rarities</option>
          {rarityNames.map(name => <option key={name}>{name}</option>)}
        </select>
      </section>

      <nav className="tabs">
        {[
          ['all', 'All'],
          ['owned', 'Owned'],
          ['wishlist', 'ISO'],
          ['trade', 'Trade'],
          ['duplicates', 'Duplicates'],
          ['favorite', 'Favorites'],
          ['missing', 'Missing']
        ].map(([key, label]) => (
          <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </nav>

      {Object.entries(grouped).map(([seriesName, list]) => {
        const fullSeries = figures.filter(f => f.series.name === seriesName)
        const seriesOwned = fullSeries.filter(f => states[f.id]?.owned).length
        const seriesPercent = fullSeries.length ? Math.round((seriesOwned / fullSeries.length) * 100) : 0

        return (
          <section className="series" key={seriesName}>
            <div className="series-title">
              <div>
                <h2>{seriesName}</h2>
                <p>{list[0].series.category}</p>
              </div>
              <strong>{seriesOwned}/{fullSeries.length}</strong>
            </div>

            <div className="series-progress">
              <i style={{ width: `${seriesPercent}%` }} />
            </div>

            <div className="grid">
              {list.map(figure => {
                const state = states[figure.id] || {}
                const quantity = Number(state.quantity || 0)

                return (
                  <article className={`card ${state.owned ? 'owned-card' : ''}`} key={figure.id}>
                    <button
                      className={`favorite ${state.favorite ? 'on' : ''}`}
                      title="Favorite"
                      onClick={() => saveFigureState(figure, { favorite: !state.favorite })}
                    >
                      ★
                    </button>

                    <div className="art">{figureIcons[figure.rarity] || '👼'}</div>

                    <div className="copy">
                      <h3>{figure.name}</h3>
                      <p>{figure.rarity}</p>
                    </div>

                    <div className="quantity">
                      <button
                        aria-label="Decrease quantity"
                        onClick={() => saveFigureState(figure, { quantity: Math.max(0, quantity - 1) })}
                      >−</button>
                      <span>{quantity}</span>
                      <button
                        aria-label="Increase quantity"
                        onClick={() => saveFigureState(figure, { quantity: quantity + 1 })}
                      >＋</button>
                    </div>

                    <div className="actions">
                      <button
                        className={state.owned ? 'on' : ''}
                        onClick={() => saveFigureState(figure, {
                          owned: !state.owned,
                          quantity: state.owned ? 0 : Math.max(1, quantity)
                        })}
                      >✓ Owned</button>
                      <button
                        className={state.wishlist ? 'on' : ''}
                        onClick={() => saveFigureState(figure, { wishlist: !state.wishlist })}
                      >♡ ISO</button>
                      <button
                        className={state.for_trade ? 'on' : ''}
                        onClick={() => saveFigureState(figure, { for_trade: !state.for_trade })}
                      >⇄ Trade</button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}

      {!visible.length && <div className="empty">No figures match this view.</div>}
      {notice && <div className="notice" onClick={() => setNotice('')}>{notice}</div>}
    </div>
  )
}

function Stat({ value, label }) {
  return <div className="stat"><strong>{value}</strong><span>{label}</span></div>
}
