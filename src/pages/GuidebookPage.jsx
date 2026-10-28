import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import './GuidebookPage.css'

const PAGE_SIZE = 6
const CATALOG_BATCH = 1000

async function loadSonnyCatalog() {
  const figures = []
  for (let from = 0; ; from += CATALOG_BATCH) {
    const { data, error } = await supabase.from('figures')
      .select('id,name,rarity,edition_type,image_url,sort_order,series:series_id!inner(name,release_year,active,brand:brand_id!inner(name,slug))')
      .eq('active', true).eq('series.active', true)
      .order('sort_order').order('id').range(from, from + CATALOG_BATCH - 1)
    if (error) throw error
    figures.push(...(data || []).filter((figure) => figure.series?.brand?.slug === 'sonny-angel'))
    if (!data || data.length < CATALOG_BATCH) return figures
  }
}

function BookPage({ page }) {
  if (!page) return <article className="book-page book-page-blank" aria-hidden="true" />
  if (page.type === 'cover') return <article className="book-page book-cover"><span>THE COLLECTOR VAULT</span><div className="cover-crown">♛</div><h2>Sonny Angel</h2><p>Complete Collector Guide</p><small>{page.figureCount.toLocaleString()} figures · {page.seriesCount.toLocaleString()} series</small></article>
  return <article className="book-page">
    <header><div><span>{page.releaseYear || 'Archive'}</span><h2>{page.seriesName}</h2></div><small>{page.partLabel}</small></header>
    <div className="guide-figure-grid">{page.figures.map((figure) => <figure key={figure.id}>
      <div className="guide-figure-image">{figure.image_url ? <img src={figure.image_url} alt={figure.name} loading="lazy" /> : <img src="/icon.svg" alt={`${figure.name} image unavailable`} />}</div>
      <figcaption><strong>{figure.name}</strong><span>{figure.edition_type || figure.rarity || 'regular'}</span></figcaption>
    </figure>)}</div>
    <footer>Collector Vault · Track · Trade · Discover <b>{page.number}</b></footer>
  </article>
}

export default function GuidebookPage() {
  const [figures, setFigures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [spread, setSpread] = useState(0)
  const [query, setQuery] = useState('')
  const [seriesFilter, setSeriesFilter] = useState('all')
  const [singlePage, setSinglePage] = useState(() => window.matchMedia('(max-width: 850px)').matches)

  useEffect(() => {
    let active = true
    loadSonnyCatalog().then((rows) => { if (active) setFigures(rows) }).catch((requestError) => { if (active) setError(requestError.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 850px)')
    const update = () => { setSinglePage(media.matches); setSpread(0) }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const series = useMemo(() => Object.values(figures.reduce((groups, figure) => {
    const name = figure.series?.name || 'Uncategorized'
    if (!groups[name]) groups[name] = { name, releaseYear: figure.series?.release_year, figures: [] }
    groups[name].figures.push(figure)
    return groups
  }, {})).sort((a, b) => (Number(b.releaseYear) || 0) - (Number(a.releaseYear) || 0) || a.name.localeCompare(b.name)), [figures])

  const pages = useMemo(() => {
    const filter = query.trim().toLowerCase()
    const content = series.filter((group) => seriesFilter === 'all' || group.name === seriesFilter).flatMap((group) => {
      const visible = filter ? group.figures.filter((figure) => `${figure.name} ${group.name}`.toLowerCase().includes(filter)) : group.figures
      if (!visible.length) return []
      const count = Math.ceil(visible.length / PAGE_SIZE)
      return Array.from({ length: count }, (_, part) => ({ type: 'series', seriesName: group.name, releaseYear: group.releaseYear, figures: visible.slice(part * PAGE_SIZE, (part + 1) * PAGE_SIZE), partLabel: count > 1 ? `${part + 1} of ${count}` : `${visible.length} figures` }))
    })
    return [{ type: 'cover', figureCount: figures.length, seriesCount: series.length }, ...content].map((page, index) => ({ ...page, number: index + 1 }))
  }, [figures, query, series, seriesFilter])

  useEffect(() => { setSpread(0) }, [query, seriesFilter])
  const maxSpread = singlePage ? Math.max(0, pages.length - 1) : Math.max(0, Math.ceil(pages.length / 2) - 1)
  const go = (direction) => setSpread((current) => Math.min(maxSpread, Math.max(0, current + direction)))
  const firstPage = singlePage ? spread : spread * 2

  if (loading) return <main className="guidebook-page"><div className="guidebook-status">Binding your complete Sonny Angel guide…</div></main>
  if (error) return <main className="guidebook-page"><p className="error-banner">{error}</p></main>

  return <main className="guidebook-page">
    <header className="guidebook-header"><div><span className="eyebrow">Subscriber collector guide</span><h1>Sonny Angel Guidebook</h1><p>Every cataloged series and figure, automatically kept current with the Collector Vault.</p></div><span className="guidebook-member-badge">{figures.length.toLocaleString()} figures</span></header>
    <div className="guidebook-filters"><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a figure or series" aria-label="Search the guidebook" /><select value={seriesFilter} onChange={(event) => setSeriesFilter(event.target.value)} aria-label="Filter by series"><option value="all">Every series</option>{series.map((group) => <option key={group.name}>{group.name}</option>)}</select></div>
    <section className="flipbook-shell" aria-label="Sonny Angel flipbook">
      <div className="book-spread" key={`${spread}-${query}-${seriesFilter}`}><BookPage page={pages[firstPage]} />{!singlePage ? <BookPage page={pages[firstPage + 1]} /> : null}</div>
      <div className="flipbook-toolbar"><button type="button" onClick={() => go(-1)} disabled={spread === 0} aria-label="Previous spread">← Previous</button><span>{singlePage ? `Page ${firstPage + 1}` : `Pages ${firstPage + 1}–${Math.min(firstPage + 2, pages.length)}`} of {pages.length}</span><button type="button" onClick={() => go(1)} disabled={spread === maxSpread} aria-label="Next spread">Next →</button></div>
    </section>
  </main>
}
