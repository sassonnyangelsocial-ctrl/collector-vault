import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import './AdminPage.css'

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export default function AdminPage({ session }) {
  const [tab, setTab] = useState('subscribers'); const [series, setSeries] = useState([]); const [figures, setFigures] = useState([]); const [brands, setBrands] = useState([]); const [message, setMessage] = useState('')
  async function load() {
    const [{ data: seriesRows }, { data: figureRows }, { data: brandRows }] = await Promise.all([
      supabase.from('series').select('*,brand:brand_id(name)').order('name'),
      supabase.from('figures').select('*,series:series_id(name)').order('name'),
      supabase.from('brands').select('*').order('name'),
    ])
    setSeries(seriesRows || []); setFigures(figureRows || []); setBrands(brandRows || [])
  }
  useEffect(() => { load() }, [])
  return <main className="admin-page"><header className="page-header"><div><span className="eyebrow">Protected workspace</span><h1>Admin Dashboard</h1></div><p>{figures.length} figures · {figures.filter((item) => item.image_url).length} images</p></header>
    <div className="tabs"><button className={tab === 'subscribers' ? 'active' : ''} onClick={() => setTab('subscribers')}>Subscribers</button><button className={tab === 'pricing' ? 'active' : ''} onClick={() => setTab('pricing')}>Market pricing</button><button className={tab === 'figures' ? 'active' : ''} onClick={() => setTab('figures')}>Figures & images</button><button className={tab === 'series' ? 'active' : ''} onClick={() => setTab('series')}>Series</button><button className={tab === 'csv' ? 'active' : ''} onClick={() => setTab('csv')}>CSV Import</button></div>
    {tab === 'subscribers' && <Subscribers session={session} />}{tab === 'pricing' && <MarketPricing session={session} figures={figures.filter((item) => item.active)} setMessage={setMessage} />}{tab === 'figures' && <Figures series={series} figures={figures} load={load} setMessage={setMessage} />}{tab === 'series' && <Series brands={brands} series={series} load={load} setMessage={setMessage} />}{tab === 'csv' && <CsvImport series={series} load={load} setMessage={setMessage} />}{message && <p className="admin-message">{message}</p>}
  </main>
}

const median = (values) => { const list = [...values].sort((a, b) => a - b); const middle = Math.floor(list.length / 2); return list.length % 2 ? list[middle] : (list[middle - 1] + list[middle]) / 2 }

function MarketPricing({ session, figures, setMessage }) {
  const [query, setQuery] = useState(''); const [selectedId, setSelectedId] = useState(''); const [comparables, setComparables] = useState([])
  const [form, setForm] = useState({ source: 'eBay sold', title: '', source_url: '', price: '', shipping: '0', sold_on: new Date().toISOString().slice(0, 10), condition: 'Used' })
  const selected = figures.find((item) => item.id === selectedId)
  const shown = figures.filter((item) => `${item.name} ${item.series?.name || ''}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 60)
  const search = selected ? encodeURIComponent(`Sonny Angel ${selected.series?.name || ''} ${selected.name}`) : ''
  async function loadComparables(id) { const { data, error } = await supabase.from('market_comparables').select('*').eq('figure_id', id).order('sold_on', { ascending: false }); setComparables(data || []); if (error) setMessage(error.message) }
  async function choose(id) { setSelectedId(id); await loadComparables(id) }
  async function add(event) { event.preventDefault(); const payload = { ...form, figure_id: selectedId, created_by: session.user.id, price: Number(form.price), shipping: Number(form.shipping || 0) }; const { error } = await supabase.from('market_comparables').insert(payload); setMessage(error?.message || 'Verified comparable saved.'); if (!error) { setForm({ ...form, title: '', source_url: '', price: '', shipping: '0' }); loadComparables(selectedId) } }
  async function remove(id) { const { error } = await supabase.from('market_comparables').delete().eq('id', id); setMessage(error?.message || 'Comparable removed.'); if (!error) loadComparables(selectedId) }
  async function publish() {
    const recent = comparables.filter((item) => Date.now() - new Date(`${item.sold_on}T12:00:00`).getTime() <= 180 * 86400000)
    if (recent.length < 2) return setMessage('Add at least two verified sold comparables from the last 180 days before publishing.')
    const totals = recent.map((item) => Number(item.price) + Number(item.shipping || 0)).sort((a, b) => a - b), middle = median(totals)
    const filtered = recent.filter((item) => { const total = Number(item.price) + Number(item.shipping || 0); return total >= middle * .35 && total <= middle * 2.5 })
    if (filtered.length < 2) return setMessage('The comparable prices are too inconsistent to publish reliably.')
    const prices = filtered.map((item) => Number(item.price) + Number(item.shipping || 0)).sort((a, b) => a - b), today = new Date().toISOString().slice(0, 10)
    const record = { figure_id: selectedId, currency: 'USD', estimated_value: median(prices).toFixed(2), low_value: prices[Math.floor((prices.length - 1) * .25)].toFixed(2), high_value: prices[Math.ceil((prices.length - 1) * .75)].toFixed(2), as_of_date: today, source_urls: filtered.map((item) => item.source_url), sample_size: filtered.length, methodology: 'Median verified completed-sale total (item price plus shipping), exact figure and series; records older than 180 days and price outliers excluded.', confidence: filtered.length >= 8 ? 'high' : filtered.length >= 4 ? 'medium' : 'low' }
    const { error } = await supabase.from('figure_market_values').upsert(record, { onConflict: 'figure_id,currency,as_of_date' }); setMessage(error?.message || `Published a ${record.confidence}-confidence estimate from ${filtered.length} verified sales.`)
  }
  return <section className="pricing-admin"><aside className="pricing-directory"><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search figure or series" />{shown.map((figure) => <button key={figure.id} className={selectedId === figure.id ? 'active' : ''} onClick={() => choose(figure.id)}><strong>{figure.name}</strong><small>{figure.series?.name}</small></button>)}</aside>{selected ? <div className="pricing-workspace"><header><div><span className="eyebrow">Evidence-backed estimate</span><h2>{selected.name}</h2><p>{selected.series?.name}</p></div><button className="primary-button" onClick={publish}>Publish estimate</button></header><div className="research-links"><a href={`https://www.ebay.com/sch/i.html?_nkw=${search}&LH_Sold=1&LH_Complete=1`} target="_blank" rel="noreferrer">eBay sold results ↗</a><a href={`https://www.mercari.com/search/?keyword=${search}&status=sold_out`} target="_blank" rel="noreferrer">Mercari sold results ↗</a><a href={`https://www.whatnot.com/search?q=${search}`} target="_blank" rel="noreferrer">Whatnot search ↗</a><a href={`https://www.google.com/search?q=${search}+sold+price`} target="_blank" rel="noreferrer">Google cross-check ↗</a></div><form className="comparable-form" onSubmit={add}><select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}>{['eBay sold','Mercari sold','Whatnot sold','Other verified sale'].map((item) => <option key={item}>{item}</option>)}</select><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Exact sold-listing title" required /><input type="url" value={form.source_url} onChange={(event) => setForm({ ...form, source_url: event.target.value })} placeholder="https:// sold listing or research URL" required /><input type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="Sold price" required /><input type="number" min="0" step="0.01" value={form.shipping} onChange={(event) => setForm({ ...form, shipping: event.target.value })} placeholder="Shipping" /><input type="date" value={form.sold_on} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setForm({ ...form, sold_on: event.target.value })} required /><select value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })}>{['New','Used','Unknown'].map((item) => <option key={item}>{item}</option>)}</select><button className="primary-button">Add verified sale</button></form><div className="comparable-list"><h3>{comparables.length} saved comparable{comparables.length === 1 ? '' : 's'}</h3>{comparables.map((item) => <article key={item.id}><div><strong>${(Number(item.price) + Number(item.shipping)).toFixed(2)} · {item.source}</strong><a href={item.source_url} target="_blank" rel="noreferrer">{item.title} ↗</a><small>{item.sold_on} · {item.condition}</small></div><button onClick={() => remove(item.id)}>Remove</button></article>)}</div></div> : <div className="empty-panel"><h2>Select a figure</h2><p>Add exact completed-sale evidence, then publish a transparent estimate. Asking prices are not treated as sales.</p></div>}</section>
}

function Subscribers({ session }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let live = true
    fetch('/api/admin-subscribers', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Could not load subscribers.')
        return body
      })
      .then((body) => { if (live) setData(body) })
      .catch((requestError) => { if (live) setError(requestError.message) })
    return () => { live = false }
  }, [session.access_token])

  if (error) return <p className="error-banner">{error}</p>
  if (!data) return <div className="center compact">Loading subscribers…</div>
  const shown = data.subscribers.filter((item) => item.email.toLowerCase().includes(query.trim().toLowerCase()))
  const date = (value) => value ? new Date(value).toLocaleDateString() : '—'

  return <section className="subscriber-admin">
    <div className="subscriber-stats">
      <article><strong>{data.summary.total}</strong><span>Total signups</span></article>
      <article><strong>{data.summary.marketing_opted_in || 0}</strong><span>Email opt-ins</span></article>
      <article><strong>{data.summary.free}</strong><span>Free plan</span></article>
      <article><strong>{data.summary.trialing}</strong><span>In trial</span></article>
      <article><strong>{data.summary.active}</strong><span>Active Pro</span></article>
    </div>
    <div className="subscriber-toolbar"><div><h2>Customer accounts</h2><p>Authentication and subscription information only. Passwords and card details are never available here.</p></div><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer email" /></div>
    <div className="subscriber-table-wrap"><table className="subscriber-table"><thead><tr><th>Email</th><th>Email permission</th><th>Joined</th><th>Last sign-in</th><th>Status</th><th>Plan</th><th>Trial/renewal</th></tr></thead><tbody>{shown.map((item) => <tr key={item.id}><td><strong>{item.email || 'No email'}</strong><small>{item.email_confirmed_at ? 'Verified' : 'Not verified'}</small></td><td><strong>{item.marketing_opt_in ? 'Opted in' : 'Not subscribed'}</strong><small>{date(item.marketing_opt_in ? item.marketing_opt_in_at : item.marketing_unsubscribed_at)}</small></td><td>{date(item.created_at)}</td><td>{date(item.last_sign_in_at)}</td><td><span className={`subscriber-status ${item.status}`}>{item.status.replaceAll('_', ' ')}</span></td><td>{item.grandfathered ? 'Complimentary' : item.billing_interval || 'No paid plan'}</td><td>{date(item.current_period_end || item.trial_end)}</td></tr>)}</tbody></table>{!shown.length && <div className="empty-panel"><h3>No matching customers</h3><p>Try a different email search.</p></div>}</div>
  </section>
}

function Figures({ series, figures, load, setMessage }) {
  const [name, setName] = useState(''); const [seriesId, setSeriesId] = useState(''); const [rarity, setRarity] = useState('Regular'); const [imageUrl, setImageUrl] = useState('')
  async function add(event) {
    event.preventDefault()
    const { error } = await supabase.from('figures').insert({ series_id: seriesId || series[0]?.id, name, slug: slugify(name), rarity, image_url: imageUrl || null, sort_order: 999 })
    setMessage(error?.message || 'Figure added successfully.'); if (!error) { setName(''); setImageUrl(''); load() }
  }
  const missing = figures.filter((item) => !item.image_url).length
  return <section className="admin-layout"><form className="admin-form" onSubmit={add}><h2>Add Figure</h2><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Figure name" required /><select value={seriesId} onChange={(e) => setSeriesId(e.target.value)}>{series.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><select value={rarity} onChange={(e) => setRarity(e.target.value)}>{['Regular', 'Secret', 'Robby', 'Limited', 'Custom'].map((item) => <option key={item}>{item}</option>)}</select><input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Official image URL" /><button className="primary-button">Add figure</button></form><div><div className="catalog-summary"><strong>{missing ? `${missing} images still needed` : 'All images assigned'}</strong><span>Use verified product images so each card matches the correct figure.</span></div><div className="catalog-list">{figures.map((figure) => <FigureCatalogRow key={figure.id} figure={figure} load={load} setMessage={setMessage} />)}</div></div></section>
}

function FigureCatalogRow({ figure, load, setMessage }) {
  const [url, setUrl] = useState(figure.image_url || '')
  async function saveImage() {
    const { error } = await supabase.from('figures').update({ image_url: url.trim() || null }).eq('id', figure.id)
    setMessage(error?.message || `Image saved for ${figure.name}.`); if (!error) load()
  }
  return <div className={`catalog-row ${figure.image_url ? '' : 'missing-image-row'}`}><div className="catalog-identity">{figure.image_url ? <img src={figure.image_url} alt="" /> : <span className="catalog-placeholder">No image</span>}<div><strong>{figure.name}</strong><small>{figure.series?.name} · {figure.rarity}</small></div></div><div className="image-url-editor"><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Paste verified official image URL" /><button onClick={saveImage}>Save</button></div></div>
}

function Series({ brands, series, load, setMessage }) {
  const [name, setName] = useState(''); const [brandId, setBrandId] = useState('')
  async function add(event) { event.preventDefault(); const { error } = await supabase.from('series').insert({ brand_id: brandId || brands[0]?.id, name, slug: slugify(name), category: 'Mini Figure', sort_order: 999 }); setMessage(error?.message || 'Series added successfully.'); if (!error) { setName(''); load() } }
  return <section className="admin-layout"><form className="admin-form" onSubmit={add}><h2>Add Series</h2><input value={name} onChange={(e) => setName(e.target.value)} required /><select value={brandId} onChange={(e) => setBrandId(e.target.value)}>{brands.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><button className="primary-button">Add series</button></form><div className="catalog-list">{series.map((item) => <div key={item.id}><strong>{item.name}</strong><small>{item.brand?.name}</small></div>)}</div></section>
}

function CsvImport({ series, load, setMessage }) {
  const [rows, setRows] = useState([])
  function pick(event) { Papa.parse(event.target.files[0], { header: true, skipEmptyLines: true, complete: (result) => setRows(result.data) }) }
  async function run() { const output = rows.map((row) => { const match = series.find((item) => item.name.toLowerCase() === (row.series || '').toLowerCase()); return match ? { series_id: match.id, name: row.name, slug: slugify(row.name), rarity: row.rarity || 'Regular', image_url: row.image_url || null, sort_order: Number(row.sort_order) || 999 } : null }).filter(Boolean); const { error } = await supabase.from('figures').upsert(output, { onConflict: 'series_id,slug' }); setMessage(error?.message || `${output.length} figures imported.`); if (!error) load() }
  return <section className="import-card"><h2>CSV Import</h2><p>Columns: <code>series,name,rarity,image_url,sort_order</code></p><input type="file" accept=".csv" onChange={pick} />{rows.length > 0 && <button className="primary-button" onClick={run}>Import {rows.length} rows</button>}</section>
}
