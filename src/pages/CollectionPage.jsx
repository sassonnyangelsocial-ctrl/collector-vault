import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import StatCard from '../components/StatCard'
import FigureCard from '../components/FigureCard'
import FigureDrawer from '../components/FigureDrawer'
import CollectionShareTools from '../components/CollectionShareTools'
import CatalogRequest from '../components/CatalogRequest'
import './CollectionPage.css'
import '../brand.css'

const EMPTY = { owned: false, quantity: 0, wishlist: false, iso: false, diso: false, incoming: false, for_trade: false, favorite: false }

const VIEW_COPY = {
  collection: ['My Collection', 'Everything you own and collect.'],
  missing: ['Missing', 'Figures you still need to complete the catalog.'],
  'iso-diso': ['ISO/DISO', 'Keep your wishlist, ISO, DISO, and incoming figures together.'],
  trade: ['Trades', 'Duplicates and figures you are ready to trade.'],
}

const CATALOG_PAGE_SIZE = 1000

async function loadAllFigures() {
  const allFigures = []
  for (let from = 0; ; from += CATALOG_PAGE_SIZE) {
    const { data, error } = await supabase.from('figures')
      .select('id,name,aliases,rarity,edition_type,image_url,image_source_url,image_verified_at,sort_order,series:series_id!inner(name,active,source_url,verified_at,brand:brand_id(name,slug)),market_values:figure_market_values(estimated_value,low_value,high_value,currency,as_of_date,confidence,methodology,source_urls)')
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
  const [brandFilter, setBrandFilter] = useState('all')
  const [seriesFilter, setSeriesFilter] = useState('all')
  const [browseAll, setBrowseAll] = useState(false)
  const [huntFilter, setHuntFilter] = useState('all')
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
      diso: Boolean(next.diso), incoming: Boolean(next.incoming), for_trade: Boolean(next.for_trade), favorite: Boolean(next.favorite),
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
    incoming: figures.filter((f) => states[f.id]?.incoming).length,
    hunt: figures.filter((f) => states[f.id]?.iso || states[f.id]?.diso || states[f.id]?.incoming).length,
    isoDiso: figures.filter((f) => states[f.id]?.wishlist || states[f.id]?.iso || states[f.id]?.diso || states[f.id]?.incoming).length,
    trade: figures.filter((f) => states[f.id]?.for_trade).length,
    missing: figures.filter((f) => !states[f.id]?.owned).length,
  }), [figures, states])

  const brands = useMemo(() => [...new Set(figures.map((f) => f.series?.brand?.name).filter(Boolean))].sort(), [figures])
  const seriesNames = useMemo(() => [...new Set(figures.filter((f) => brandFilter === 'all' || f.series?.brand?.name === brandFilter).map((f) => f.series?.name).filter(Boolean))].sort(), [brandFilter, figures])
  const searchingWholeDirectory = view === 'iso-diso' && (browseAll || query.trim().length > 0 || seriesFilter !== 'all' || brandFilter !== 'all')
  const matchesView = useCallback((figure) => {
    const state = states[figure.id] || EMPTY
    if (searchingWholeDirectory) return true
    if (view === 'iso-diso') {
      if (huntFilter === 'wishlist') return state.wishlist
      if (huntFilter === 'iso') return state.iso
      if (huntFilter === 'diso') return state.diso
      if (huntFilter === 'incoming') return state.incoming
      return state.wishlist || state.iso || state.diso || state.incoming
    }
    if (view === 'trade') return state.for_trade
    if (view === 'missing') return !state.owned
    return true
  }, [huntFilter, searchingWholeDirectory, states, view])
  const shownFigures = figures.filter((figure) => {
    const text = `${figure.name} ${(figure.aliases || []).join(' ')} ${figure.series?.name || ''} ${figure.series?.brand?.name || ''} ${figure.rarity || ''}`.toLowerCase().includes(query.toLowerCase())
    return text && (brandFilter === 'all' || figure.series?.brand?.name === brandFilter) && (seriesFilter === 'all' || figure.series?.name === seriesFilter) && matchesView(figure)
  })
  const seriesGroups = Object.values(shownFigures.reduce((groups, figure) => {
    const brand = figure.series?.brand?.name || 'Other'
    const series = figure.series?.name || 'Uncategorized'
    const key = `${brand}::${series}`
    if (!groups[key]) groups[key] = { key, brand, series, figures: [], owned: 0 }
    groups[key].figures.push(figure)
    if (states[figure.id]?.owned) groups[key].owned += 1
    return groups
  }, {})).sort((a, b) => a.brand.localeCompare(b.brand) || a.series.localeCompare(b.series))
  const completion = figures.length ? Math.round((stats.owned / figures.length) * 100) : 0

  if (loading) return <div className="center compact">Loading your vault...</div>

  if (view === 'dashboard') return <main className="collection-page">
    <header className="page-header"><div><span className="eyebrow">Collector dashboard</span><h1>Welcome back</h1><p>Everything important in your vault, at a glance.</p></div><p>{session.user.email}</p></header>
    {error && <p className="error-banner">{error}</p>}
    <section className="dashboard-grid">
      <button className="dashboard-hero" onClick={() => onNavigate('collection')}><span>Collection progress</span><strong>{completion}%</strong><p>{stats.owned} of {figures.length} unique figures owned</p><div className="completion-bar"><div style={{ width: `${completion}%` }} /></div></button>
      <DashboardTile label="ISO/DISO" value={stats.isoDiso} tone="pink" onClick={() => onNavigate('iso-diso')} />
      <DashboardTile label="Ready to trade" value={stats.trade} tone="green" onClick={() => onNavigate('trade')} />
      <DashboardTile label="Missing" value={stats.missing} tone="orange" onClick={() => onNavigate('missing')} />
    </section>
    <section className="dashboard-section"><div className="section-heading"><div><span className="eyebrow">Priority hunt</span><h2>Your DISO list</h2></div><button className="text-button" onClick={() => onNavigate('iso-diso')}>View all</button></div>
      <div className="figure-grid compact-grid">{figures.filter((f) => states[f.id]?.diso).slice(0, 3).map((figure) => <FigureCard key={figure.id} figure={figure} state={states[figure.id] || EMPTY} onOpen={setSelectedFigure} onSave={save} />)}</div>
      {!stats.diso && <div className="empty-panel"><h3>No DISO figures yet</h3><p>Open any figure and mark your most-wanted pieces as DISO.</p><button className="primary-button" onClick={() => onNavigate('collection')}>Browse catalog</button></div>}
    </section>
    {selectedFigure && <FigureDrawer figure={selectedFigure} state={states[selectedFigure.id] || EMPTY} onClose={() => setSelectedFigure(null)} onSave={save} />}
  </main>

  const [title, description] = VIEW_COPY[view] || VIEW_COPY.collection
  return <main className="collection-page">
    <header className="page-header"><div><span className="eyebrow">Your personal vault</span><h1>{title}</h1><p>{description}</p></div><p>{shownFigures.length} figure{shownFigures.length === 1 ? '' : 's'}</p></header>
    <section className="brand-switcher" aria-label="Choose a collectible brand"><button className={brandFilter === 'all' ? 'active' : ''} onClick={() => { setBrandFilter('all'); setSeriesFilter('all') }}>All brands</button>{brands.map((brand) => <button key={brand} className={brandFilter === brand ? 'active' : ''} onClick={() => { setBrandFilter(brand); setSeriesFilter('all'); setBrowseAll(true) }}>{brand}</button>)}</section>
    {view === 'iso-diso' && <><section className="hunt-filter" aria-label="Filter ISO and DISO lists"><button className={huntFilter === 'all' ? 'active' : ''} onClick={() => setHuntFilter('all')}>All lists</button><button className={huntFilter === 'wishlist' ? 'active' : ''} onClick={() => setHuntFilter('wishlist')}>Wishlist ({stats.wishlist})</button><button className={huntFilter === 'iso' ? 'active' : ''} onClick={() => setHuntFilter('iso')}>ISO ({stats.iso})</button><button className={huntFilter === 'diso' ? 'active' : ''} onClick={() => setHuntFilter('diso')}>DISO ({stats.diso})</button><button className={huntFilter === 'incoming' ? 'active' : ''} onClick={() => setHuntFilter('incoming')}>Incoming ({stats.incoming})</button></section><section className="catalog-scope" aria-label={`${title} directory scope`}><button className={!searchingWholeDirectory ? 'active' : ''} onClick={() => { setBrowseAll(false); setQuery(''); setSeriesFilter('all'); setBrandFilter('all') }}>My lists</button><button className={browseAll && brandFilter === 'all' ? 'active' : ''} onClick={() => { setBrowseAll(true); setBrandFilter('all'); setSeriesFilter('all') }}>Browse full directory</button><button className={brandFilter.toLowerCase().includes('sonny') ? 'active' : ''} onClick={() => { setBrowseAll(true); setBrandFilter(brands.find((brand) => brand.toLowerCase().includes('sonny')) || 'Sonny Angel'); setSeriesFilter('all') }}>Complete Sonny Angel directory</button><span>{searchingWholeDirectory ? `Searching ${shownFigures.length} matching catalog figures` : `${stats.wishlist} wishlist · ${stats.iso} ISO · ${stats.diso} DISO`}</span></section></>}
    <section className="collection-tools"><input type="search" aria-label={`Search the full collectible directory for ${title}`} placeholder={view === 'iso-diso' ? 'Search every series, figure, Secret, or Robby...' : 'Search figures, series, brand, or rarity...'} value={query} onChange={(e) => setQuery(e.target.value)} /><select aria-label="Filter by series" value={seriesFilter} onChange={(e) => setSeriesFilter(e.target.value)}><option value="all">All series</option>{seriesNames.map((name) => <option value={name} key={name}>{name}</option>)}</select></section>
    <CatalogRequest session={session} />
    <CollectionShareTools title={title} figures={shownFigures} states={states} includeUntracked={view === 'missing'} />
    {error && <p className="error-banner">{error}</p>}
    <div className="series-directory">{seriesGroups.map((group) => {
      const missing = group.figures.length - group.owned
      const percent = group.figures.length ? Math.round((group.owned / group.figures.length) * 100) : 0
      return <section className="series-group" key={group.key} aria-labelledby={`series-${group.key.replace(/[^a-z0-9]/gi, '-')}`}>
        <header className="series-group-header">
          <div><span className="series-brand">{group.brand}</span><h2 id={`series-${group.key.replace(/[^a-z0-9]/gi, '-')}`}>{group.series}</h2></div>
          <div className="series-progress-copy"><strong>{group.owned} of {group.figures.length} owned</strong><span>{missing} missing · {percent}% complete</span></div>
        </header>
        <div className="series-progress" aria-label={`${percent}% of ${group.series} owned`}><div style={{ width: `${percent}%` }} /></div>
        <div className="figure-grid">{group.figures.map((figure) => {
          const state = states[figure.id] || EMPTY
          return <div className="series-figure" key={figure.id}>
            <span className={`ownership-status ${state.owned ? 'owned' : state.incoming ? 'incoming' : 'missing'}`}>{state.owned ? 'Owned' : state.incoming ? 'Incoming' : 'Missing'}</span>
            <FigureCard figure={figure} state={state} onOpen={setSelectedFigure} onSave={save} />
          </div>
        })}</div>
      </section>
    })}</div>
    {!shownFigures.length && <div className="empty-state"><h2>{searchingWholeDirectory ? 'No matching figures' : `No figures saved to ${title} yet`}</h2><p>{searchingWholeDirectory ? 'Try a different figure name, series, rarity, or series filter.' : 'Search the complete directory, then mark any figure Wishlist, ISO, DISO, or Incoming.'}</p>{view === 'iso-diso' ? <button className="primary-button" onClick={() => setBrowseAll(true)}>Browse full directory</button> : <button className="primary-button" onClick={() => onNavigate('collection')}>Browse collection</button>}</div>}
    {selectedFigure && <FigureDrawer figure={selectedFigure} state={states[selectedFigure.id] || EMPTY} onClose={() => setSelectedFigure(null)} onSave={save} />}
  </main>
}

function DashboardTile({ label, value, tone, onClick }) {
  return <button className={`dashboard-tile ${tone}`} onClick={onClick}><span>{label}</span><strong>{value}</strong><small>Open list →</small></button>
}
