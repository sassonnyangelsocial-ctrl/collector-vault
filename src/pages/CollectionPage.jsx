import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import StatCard from '../components/StatCard'
import FigureCard from '../components/FigureCard'
import FigureDrawer from '../components/FigureDrawer'

const EMPTY = { owned: false, quantity: 0, wishlist: false, for_trade: false, favorite: false }

export default function CollectionPage({ session }) {
  const [figures, setFigures] = useState([])
  const [states, setStates] = useState({})
  const [query, setQuery] = useState('')
  const [seriesFilter, setSeriesFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedFigure, setSelectedFigure] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: catalog, error: catalogError }, { data: userRows, error: userError }] = await Promise.all([
        supabase.from('figures').select('id,name,rarity,image_url,series:series_id(name)').eq('active', true),
        supabase.from('user_figures').select('*').eq('user_id', session.user.id),
      ])
      if (catalogError || userError) setError((catalogError || userError).message)
      else {
        setFigures(catalog || [])
        setStates(Object.fromEntries((userRows || []).map((row) => [row.figure_id, row])))
      }
      setLoading(false)
    }
    load()
  }, [session.user.id])

  const save = useCallback(async (figure, patch) => {
    const current = states[figure.id] || EMPTY
    const next = { ...current, ...patch }
    if (Number(next.quantity) > 0) next.owned = true
    if (!next.owned) next.quantity = 0
    const payload = { user_id: session.user.id, figure_id: figure.id, owned: Boolean(next.owned), quantity: Number(next.quantity || 0), wishlist: Boolean(next.wishlist), for_trade: Boolean(next.for_trade), favorite: Boolean(next.favorite) }
    setStates((old) => ({ ...old, [figure.id]: { ...old[figure.id], ...payload } }))
    const { data, error: saveError } = await supabase.from('user_figures').upsert(payload, { onConflict: 'user_id,figure_id' }).select().single()
    if (saveError) { setError(saveError.message); setStates((old) => ({ ...old, [figure.id]: current })) }
    else setStates((old) => ({ ...old, [figure.id]: data }))
  }, [session.user.id, states])

  const stats = useMemo(() => ({
    owned: figures.filter((f) => states[f.id]?.owned).length,
    total: figures.reduce((sum, f) => sum + Number(states[f.id]?.quantity || 0), 0),
    duplicates: figures.reduce((sum, f) => sum + Math.max(0, Number(states[f.id]?.quantity || 0) - 1), 0),
    iso: figures.filter((f) => states[f.id]?.wishlist).length,
    trade: figures.filter((f) => states[f.id]?.for_trade).length,
    favorites: figures.filter((f) => states[f.id]?.favorite).length,
  }), [figures, states])

  const seriesNames = useMemo(() => [...new Set(figures.map((f) => f.series?.name).filter(Boolean))].sort(), [figures])
  const shownFigures = figures.filter((figure) => {
    const state = states[figure.id] || EMPTY
    const text = `${figure.name} ${figure.series?.name || ''} ${figure.rarity || ''}`.toLowerCase().includes(query.toLowerCase())
    const series = seriesFilter === 'all' || figure.series?.name === seriesFilter
    const status = statusFilter === 'all' || (statusFilter === 'owned' && state.owned) || (statusFilter === 'iso' && state.wishlist) || (statusFilter === 'trade' && state.for_trade) || (statusFilter === 'duplicates' && Number(state.quantity || 0) > 1) || (statusFilter === 'favorites' && state.favorite)
    return text && series && status
  })
  const completion = figures.length ? Math.round((stats.owned / figures.length) * 100) : 0
  const toggleFilter = (filter) => setStatusFilter(statusFilter === filter ? 'all' : filter)

  return <main className="collection-page">
    <header className="page-header"><div><span className="eyebrow">Your personal vault</span><h1>My Collection</h1></div><p>{session.user.email}</p></header>
    <section className="stats-grid">
      <StatCard value={stats.owned} label="Unique owned" active={statusFilter === 'owned'} onClick={() => toggleFilter('owned')} />
      <StatCard value={stats.total} label="Total figures" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
      <StatCard value={stats.duplicates} label="Duplicates" active={statusFilter === 'duplicates'} onClick={() => toggleFilter('duplicates')} />
      <StatCard value={stats.iso} label="ISO" active={statusFilter === 'iso'} onClick={() => toggleFilter('iso')} />
      <StatCard value={stats.trade} label="Trade" active={statusFilter === 'trade'} onClick={() => toggleFilter('trade')} />
    </section>
    <section className="completion-card"><div><strong>{completion}% complete</strong><span>{stats.owned} of {figures.length} figures</span></div><div className="completion-bar"><div style={{ width: `${completion}%` }} /></div></section>
    <section className="collection-tools">
      <input placeholder="Search figures, series, or rarity…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <select value={seriesFilter} onChange={(e) => setSeriesFilter(e.target.value)}><option value="all">All series</option>{seriesNames.map((name) => <option value={name} key={name}>{name}</option>)}</select>
      <button className={`filter-button ${statusFilter === 'favorites' ? 'active' : ''}`} onClick={() => toggleFilter('favorites')}>★ Favorites ({stats.favorites})</button>
    </section>
    {error && <p className="error-banner">{error}</p>}
    {loading ? <div className="center compact">Loading your collection…</div> : <><p className="result-count">Showing {shownFigures.length} figure{shownFigures.length === 1 ? '' : 's'}</p><div className="figure-grid">{shownFigures.map((figure) => <FigureCard key={figure.id} figure={figure} state={states[figure.id] || EMPTY} onOpen={setSelectedFigure} onSave={save} />)}</div>{!shownFigures.length && <div className="empty-state"><span>🔎</span><h2>No figures found</h2><p>Try clearing a filter or using another search.</p></div>}</>}
    {selectedFigure && <FigureDrawer figure={selectedFigure} state={states[selectedFigure.id] || EMPTY} onClose={() => setSelectedFigure(null)} onSave={save} />}
  </main>
}
