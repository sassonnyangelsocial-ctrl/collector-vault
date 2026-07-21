import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import StatCard from '../components/StatCard'
import FigureCard from '../components/FigureCard'
import FigureDrawer from '../components/FigureDrawer'
import './CollectionPage.css'

const EMPTY = { owned: false, quantity: 0, wishlist: false, iso: false, diso: false, for_trade: false, favorite: false }

const VIEW_COPY = {
  collection: ['My Collection', 'Everything you own and collect.'],
  wishlist: ['Wishlist', 'Figures you would love to add someday.'],
  iso: ['ISO', 'Figures you are actively in search of.'],
  diso: ['DISO', 'Your highest-priority, desperately-in-search-of figures.'],
  trade: ['Trades', 'Duplicates and figures you are ready to trade.'],
}

const CATALOG_PAGE_SIZE = 1000

async function loadAllFigures() {
  const allFigures = []
  for (let from = 0; ; from += CATALOG_PAGE_SIZE) {
    const { data, error } = await supabase.from('figures')
      .select('id,name,rarity,edition_type,image_url,image_source_url,image_verified_at,sort_order,series:series_id!inner(name,active,source_url,verified_at),market_values:figure_market_values(estimated_value,low_value,high_value,currency,as_of_date,confidence,methodology,source_urls)')
      .eq('active', true).eq('series.active', true).order('sort_order').order('id').range(from, from + CATALOG_PAGE_SIZE - 1)
    if (error) throw error
    allFigures.push(...(data || []))
    if (!data || data.length < CATALOG_PAGE_SIZE) return allFigures
  }
}

export default function CollectionPage({ session, view = 'dashboard', onNavigate }) {
  const [figures, setFigures] = useState([])
  const [states, setStates] = useState({})
  const [query, setQuery] = useState('')
  const [seriesFilter, setSeriesFilter] = useState('all')
  const [browseAll, setBrowseAll] = useState(false)
  const [selectedFigure, setSelectedFigure] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: catalog, error: catalogError }, { data: userRows, error: userError }] = await Promise.all([
        loadAllFigures().then((data) => ({ data, error: null })).catch((error) => ({ data: null, error })),
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
    if (next.diso) next.iso = true
    const payload = {
      user_id: session.user.id, figure_id: figure.id, owned: Boolean(next.owned),
      quantity: Number(next.quantity || 0), wishlist: Boolean(next.wishlist), iso: Boolean(next.iso),
      diso: Boolean(next.diso), for_trade: Boolean(next.for_trade), favorite: Boolean(next.favorite),
    }
    setStates((old) => ({ ...old, [figure.id]: { ...old[figure.id], ...payload } }))
    const { data, error: saveError } = await supabase.from('user_figures').upsert(payload, { onConflict: 'user_id,figure_id' }).select().single()
    if (saveError) { setError(saveError.message); setStates((old) => ({ ...old, [figure.id]: current })) }
    else setStates((old) => ({ ...old, [figure.id]: data }))
  }, [session.user.id, states])

  const stats = useMemo(() => ({
    owned: figures.filter((f) => states[f.id]?.owned).length,
    total: figures.reduce((sum, f) => sum + Number(states[f.id]?.quantity || 0), 0),
    wishlist: figures.filter((f) => states[f.id]?.wishlist).length,
    iso: figures.filter((f) => states[f.id]?.iso).length,
    diso: figures.filter((f) => states[f.id]?.diso).length,
    trade: figures.filter((f) => states[f.id]?.for_trade).length,
  }), [figures, states])

  const seriesNames = useMemo(() => [...new Set(figures.map((f) => f.series?.name).filter(Boolean))].sort(), [figures])
  const searchingWholeDirectory = ['iso', 'diso'].includes(view) && (browseAll || query.trim().length > 0 || seriesFilter !== 'all')
  const matchesView = useCallback((figure) => {
    const state = states[figure.id] || EMPTY
    if (searchingWholeDirectory) return true
    if (view === 'wishlist') return state.wishlist
    if (view === 'iso') return state.iso
    if (view === 'diso') return state.diso
    if (view === 'trade') return state.for_trade
    return true
  }, [searchingWholeDirectory, states, view])
  const shownFigures = figures.filter((figure) => {
    const text = `${figure.name} ${figure.series?.name || ''} ${figure.rarity || ''}`.toLowerCase().includes(query.toLowerCase())
    return text && (seriesFilter === 'all' || figure.series?.name === seriesFilter) && matchesView(figure)
  })
  const completion = figures.length ? Math.round((stats.owned / figures.length) * 100) : 0

  if (loading) return <div className="center compact">Loading your vault...</div>

  if (view === 'dashboard') return <main className="collection-page">
    <header className="page-header"><div><span className="eyebrow">Collector dashboard</span><h1>Welcome back</h1><p>Everything important in your vault, at a glance.</p></div><p>{session.user.email}</p></header>
    {error && <p className="error-banner">{error}</p>}
    <section className="dashboard-grid">
      <button className="dashboard-hero" onClick={() => onNavigate('collection')}><span>Collection progress</span><strong>{completion}%</strong><p>{stats.owned} of {figures.length} unique figures owned</p><div className="completion-bar"><div style={{ width: `${completion}%` }} /></div></button>
      <DashboardTile label="Wishlist" value={stats.wishlist} tone="pink" onClick={() => onNavigate('wishlist')} />
      <DashboardTile label="ISO" value={stats.iso} tone="blue" onClick={() => onNavigate('iso')} />
      <DashboardTile label="DISO" value={stats.diso} tone="orange" onClick={() => onNavigate('diso')} />
      <DashboardTile label="Ready to trade" value={stats.trade} tone="green" onClick={() => onNavigate('trade')} />
    </section>
    <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Priority hunt</span><h2>Your DISO list</h2></div><button className="text-button" onClick={() => onNavigate('diso')}>View all</button></div>
      <div className="figure-grid compact-grid">{figures.filter((f) => states[f.id]?.diso).slice(0, 3).map((figure) => <FigureCard key={figure.id} figure={figure} state={states[figure.id] || EMPTY} onOpen={setSelectedFigure} onSave={save} />)}</div>
      {!stats.diso && <div className="empty-panel"><h3>No DISO figures yet</h3><p>Open any figure and mark your most-wanted pieces as DISO.</p><button className="primary-button" onClick={() => onNavigate('collection')}>Browse catalog</button></div>}
    </section>
    {selectedFigure && <FigureDrawer figure={selectedFigure} state={states[selectedFigure.id] || EMPTY} onClose={() => setSelectedFigure(null)} onSave={save} />}
  </main>

  const [title, description] = VIEW_COPY[view] || VIEW_COPY.collection
  return <main className="collection-page">
    <header className="page-header"><div><span className="eyebrow">Your personal vault</span><h1>{title}</h1><p>{description}</p></div><p>{shownFigures.length} figure{shownFigures.length === 1 ? '' : 's'}</p></header>
    {['iso', 'diso'].includes(view) && <section className="catalog-scope" aria-label={`${title} directory scope`}><button className={!browseAll && !query && seriesFilter === 'all' ? 'active' : ''} onClick={() => { setBrowseAll(false); setQuery(''); setSeriesFilter('all') }}>My {title}</button><button className={searchingWholeDirectory ? 'active' : ''} onClick={() => setBrowseAll(true)}>Browse full directory</button><span>{searchingWholeDirectory ? `Searching all ${figures.length} catalog figures` : `${stats[view]} saved to your ${title} list`}</span></section>}
    <section className="collection-tools"><input type="search" aria-label={`Search the full Sonny Angel directory for ${title}`} placeholder={['iso', 'diso'].includes(view) ? `Search the full directory to add a ${title}...` : 'Search figures, series, or rarity...'} value={query} onChange={(e) => setQuery(e.target.value)} /><select aria-label="Filter by series" value={seriesFilter} onChange={(e) => setSeriesFilter(e.target.value)}><option value="all">All series</option>{seriesNames.map((name) => <option value={name} key={name}>{name}</option>)}</select></section>
    {error && <p className="error-banner">{error}</p>}
    <div className="figure-grid">{shownFigures.map((figure) => <FigureCard key={figure.id} figure={figure} state={states[figure.id] || EMPTY} onOpen={setSelectedFigure} onSave={save} />)}</div>
    {!shownFigures.length && <div className="empty-state"><h2>{searchingWholeDirectory ? 'No matching figures' : `No figures saved to ${title} yet`}</h2><p>{searchingWholeDirectory ? 'Try a different figure name, series, rarity, or series filter.' : `Search above or browse the full directory, then tap ${title} on any figure to add it.`}</p>{['iso', 'diso'].includes(view) ? <button className="primary-button" onClick={() => setBrowseAll(true)}>Browse full directory</button> : <button className="primary-button" onClick={() => onNavigate('collection')}>Browse collection</button>}</div>}
    {selectedFigure && <FigureDrawer figure={selectedFigure} state={states[selectedFigure.id] || EMPTY} onClose={() => setSelectedFigure(null)} onSave={save} />}
  </main>
}

function DashboardTile({ label, value, tone, onClick }) {
  return <button className={`dashboard-tile ${tone}`} onClick={onClick}><span>{label}</span><strong>{value}</strong><small>Open list →</small></button>
}
