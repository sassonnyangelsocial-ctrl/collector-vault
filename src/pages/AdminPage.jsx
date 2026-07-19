import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'

const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export default function AdminPage() {
  const [tab, setTab] = useState('figures')
  const [series, setSeries] = useState([])
  const [figures, setFigures] = useState([])
  const [brands, setBrands] = useState([])
  const [message, setMessage] = useState('')

  async function load() {
    const [{ data: seriesRows }, { data: figureRows }, { data: brandRows }] = await Promise.all([
      supabase.from('series').select('*,brand:brand_id(name)').order('name'),
      supabase.from('figures').select('*,series:series_id(name)').order('name'),
      supabase.from('brands').select('*').order('name'),
    ])
    setSeries(seriesRows || []); setFigures(figureRows || []); setBrands(brandRows || [])
  }
  useEffect(() => { load() }, [])

  return <main className="admin-page">
    <header className="page-header"><div><span className="eyebrow">Protected workspace</span><h1>Catalog Manager</h1></div><p>{figures.length} figures · {series.length} series</p></header>
    <div className="tabs"><button className={tab === 'figures' ? 'active' : ''} onClick={() => setTab('figures')}>Figures</button><button className={tab === 'series' ? 'active' : ''} onClick={() => setTab('series')}>Series</button><button className={tab === 'csv' ? 'active' : ''} onClick={() => setTab('csv')}>CSV Import</button></div>
    {tab === 'figures' && <Figures series={series} figures={figures} load={load} setMessage={setMessage} />}
    {tab === 'series' && <Series brands={brands} series={series} load={load} setMessage={setMessage} />}
    {tab === 'csv' && <CsvImport series={series} load={load} setMessage={setMessage} />}
    {message && <p className="admin-message">{message}</p>}
  </main>
}

function Figures({ series, figures, load, setMessage }) {
  const [name, setName] = useState(''); const [seriesId, setSeriesId] = useState(''); const [rarity, setRarity] = useState('Regular')
  async function add(event) {
    event.preventDefault()
    const { error } = await supabase.from('figures').insert({ series_id: seriesId || series[0]?.id, name, slug: slugify(name), rarity, sort_order: 999 })
    setMessage(error?.message || 'Figure added successfully.'); if (!error) { setName(''); load() }
  }
  return <section className="admin-layout"><form className="admin-form" onSubmit={add}><h2>Add Figure</h2><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Figure name" required /><select value={seriesId} onChange={(e) => setSeriesId(e.target.value)}>{series.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><select value={rarity} onChange={(e) => setRarity(e.target.value)}>{['Regular', 'Secret', 'Robby', 'Limited', 'Custom'].map((item) => <option key={item}>{item}</option>)}</select><button className="primary-button">Add figure</button></form><div className="catalog-list">{figures.map((figure) => <div key={figure.id}><strong>{figure.name}</strong><small>{figure.series?.name} · {figure.rarity}</small></div>)}</div></section>
}

function Series({ brands, series, load, setMessage }) {
  const [name, setName] = useState(''); const [brandId, setBrandId] = useState('')
  async function add(event) {
    event.preventDefault()
    const { error } = await supabase.from('series').insert({ brand_id: brandId || brands[0]?.id, name, slug: slugify(name), category: 'Mini Figure', sort_order: 999 })
    setMessage(error?.message || 'Series added successfully.'); if (!error) { setName(''); load() }
  }
  return <section className="admin-layout"><form className="admin-form" onSubmit={add}><h2>Add Series</h2><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Series name" required /><select value={brandId} onChange={(e) => setBrandId(e.target.value)}>{brands.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><button className="primary-button">Add series</button></form><div className="catalog-list">{series.map((item) => <div key={item.id}><strong>{item.name}</strong><small>{item.brand?.name}</small></div>)}</div></section>
}

function CsvImport({ series, load, setMessage }) {
  const [rows, setRows] = useState([])
  function pick(event) { Papa.parse(event.target.files[0], { header: true, skipEmptyLines: true, complete: (result) => setRows(result.data) }) }
  async function run() {
    const output = rows.map((row) => { const match = series.find((item) => item.name.toLowerCase() === (row.series || '').toLowerCase()); return match ? { series_id: match.id, name: row.name, slug: slugify(row.name), rarity: row.rarity || 'Regular', sort_order: Number(row.sort_order) || 999 } : null }).filter(Boolean)
    const { error } = await supabase.from('figures').upsert(output, { onConflict: 'series_id,slug' })
    setMessage(error?.message || `${output.length} figures imported.`); if (!error) load()
  }
  return <section className="import-card"><h2>CSV Import</h2><p>Required columns: <code>series,name,rarity,sort_order</code></p><input type="file" accept=".csv" onChange={pick} />{rows.length > 0 && <button className="primary-button" onClick={run}>Import {rows.length} rows</button>}</section>
}
