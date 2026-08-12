import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import FigureImage from '../components/FigureImage'
import './IncomingPage.css'

const EMPTY_FORM = { figure_id: '', quantity: 1, status: 'ordered', seller: '', order_date: '', expected_date: '', tracking_url: '', notes: '' }
const ACTIVE_STATUSES = new Set(['ordered', 'shipped', 'out_for_delivery'])
const STATUS_LABELS = { ordered: 'Ordered', shipped: 'Shipped', out_for_delivery: 'Out for delivery', received: 'Received', cancelled: 'Cancelled' }

export default function IncomingPage({ session }) {
  const [figures, setFigures] = useState([])
  const [owned, setOwned] = useState({})
  const [items, setItems] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    const [catalogResult, ownedResult, incomingResult] = await Promise.all([
      supabase.from('figures').select('id,name,image_url,rarity,series:series_id!inner(name,active,brand:brand_id(name))').eq('active', true).eq('series.active', true).order('name').limit(5000),
      supabase.from('user_figures').select('figure_id,quantity').eq('user_id', session.user.id),
      supabase.from('incoming_figures').select('*,figure:figure_id(id,name,image_url,rarity,series:series_id(name,brand:brand_id(name)))').eq('user_id', session.user.id).order('created_at', { ascending: false }),
    ])
    const error = catalogResult.error || ownedResult.error || incomingResult.error
    if (error) setMessage(error.message)
    else {
      setFigures(catalogResult.data || [])
      setOwned(Object.fromEntries((ownedResult.data || []).map((row) => [row.figure_id, Number(row.quantity || 0)])))
      setItems(incomingResult.data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [session.user.id])

  const incomingByFigure = useMemo(() => items.reduce((totals, item) => {
    if (ACTIVE_STATUSES.has(item.status)) totals[item.figure_id] = (totals[item.figure_id] || 0) + Number(item.quantity)
    return totals
  }, {}), [items])
  const filteredFigures = useMemo(() => {
    const text = search.trim().toLowerCase()
    if (!text) return figures.slice(0, 80)
    return figures.filter((figure) => `${figure.name} ${figure.series?.name || ''} ${figure.series?.brand?.name || ''}`.toLowerCase().includes(text)).slice(0, 80)
  }, [figures, search])
  const selected = figures.find((figure) => figure.id === form.figure_id)
  const visibleItems = items.filter((item) => showHistory || ACTIVE_STATUSES.has(item.status))
  const activeCount = items.filter((item) => ACTIVE_STATUSES.has(item.status)).reduce((sum, item) => sum + Number(item.quantity), 0)

  function updateForm(event) { setForm((old) => ({ ...old, [event.target.name]: event.target.value })) }

  async function addIncoming(event) {
    event.preventDefault()
    if (!form.figure_id) return setMessage('Choose a figure first.')
    setSaving(true); setMessage('')
    const payload = { ...form, user_id: session.user.id, quantity: Number(form.quantity), seller: form.seller || null, order_date: form.order_date || null, expected_date: form.expected_date || null, tracking_url: form.tracking_url || null, notes: form.notes || null }
    const { data, error } = await supabase.from('incoming_figures').insert(payload).select('*,figure:figure_id(id,name,image_url,rarity,series:series_id(name,brand:brand_id(name)))').single()
    if (error) setMessage(error.message)
    else { setItems((old) => [data, ...old]); setForm(EMPTY_FORM); setSearch(''); setMessage(`${data.figure.name} added to Incoming.`) }
    setSaving(false)
  }

  async function updateStatus(item, status) {
    setMessage('')
    const { data, error } = await supabase.from('incoming_figures').update({ status, updated_at: new Date().toISOString() }).eq('id', item.id).select().single()
    if (error) setMessage(error.message)
    else setItems((old) => old.map((row) => row.id === item.id ? { ...row, ...data, figure: row.figure } : row))
  }

  async function receive(item) {
    setMessage('')
    const { error } = await supabase.rpc('receive_incoming_figure', { incoming_id: item.id })
    if (error) return setMessage(error.message)
    setOwned((old) => ({ ...old, [item.figure_id]: Number(old[item.figure_id] || 0) + Number(item.quantity) }))
    setItems((old) => old.map((row) => row.id === item.id ? { ...row, status: 'received', received_at: new Date().toISOString() } : row))
    setMessage(`${item.quantity} × ${item.figure.name} moved into your collection.`)
  }

  async function remove(item) {
    const { error } = await supabase.from('incoming_figures').delete().eq('id', item.id)
    if (error) setMessage(error.message)
    else setItems((old) => old.filter((row) => row.id !== item.id))
  }

  if (loading) return <div className="center compact">Loading incoming purchases...</div>

  return <main className="incoming-page">
    <header className="page-header"><div><span className="eyebrow">Purchase pipeline</span><h1>Incoming</h1><p>Track purchases before they reach your collection—and spot duplicates before buying again.</p></div><div className="incoming-total"><strong>{activeCount}</strong><span>on the way</span></div></header>
    {message && <p className="incoming-message" role="status">{message}</p>}
    <section className="incoming-layout">
      <form className="incoming-form" onSubmit={addIncoming}>
        <div><span className="eyebrow">Add a purchase</span><h2>What did you buy?</h2></div>
        <label>Search catalog<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Figure, series, or brand" /></label>
        <label>Figure<select name="figure_id" value={form.figure_id} onChange={updateForm} required><option value="">Choose a figure</option>{filteredFigures.map((figure) => <option key={figure.id} value={figure.id}>{figure.series?.brand?.name} · {figure.series?.name} · {figure.name}</option>)}</select></label>
        {selected && <div className={`duplicate-check ${(owned[selected.id] || incomingByFigure[selected.id]) ? 'warning' : ''}`}><strong>{selected.name}</strong><span>You own {owned[selected.id] || 0} · Incoming {incomingByFigure[selected.id] || 0}</span>{(owned[selected.id] || incomingByFigure[selected.id]) > 0 && <b>Duplicate check: you already own or expect this figure.</b>}</div>}
        <div className="incoming-form-row"><label>Quantity<input name="quantity" type="number" min="1" max="999" value={form.quantity} onChange={updateForm} required /></label><label>Status<select name="status" value={form.status} onChange={updateForm}><option value="ordered">Ordered</option><option value="shipped">Shipped</option><option value="out_for_delivery">Out for delivery</option></select></label></div>
        <label>Seller or store<input name="seller" value={form.seller} onChange={updateForm} maxLength="120" placeholder="Optional" /></label>
        <div className="incoming-form-row"><label>Order date<input name="order_date" type="date" value={form.order_date} onChange={updateForm} /></label><label>Expected arrival<input name="expected_date" type="date" value={form.expected_date} onChange={updateForm} /></label></div>
        <label>Tracking link<input name="tracking_url" type="url" value={form.tracking_url} onChange={updateForm} placeholder="https://..." /></label>
        <label>Notes<textarea name="notes" value={form.notes} onChange={updateForm} maxLength="1000" placeholder="Order number, bundle details, condition..." /></label>
        <button className="primary-button" disabled={saving}>{saving ? 'Adding...' : 'Add to Incoming'}</button>
      </form>
      <section className="incoming-list-section">
        <div className="incoming-list-heading"><div><span className="eyebrow">Your purchases</span><h2>{showHistory ? 'All activity' : 'Still incoming'}</h2></div><button className="text-button" onClick={() => setShowHistory((value) => !value)}>{showHistory ? 'Hide history' : 'Show history'}</button></div>
        <div className="incoming-list">{visibleItems.map((item) => <article className="incoming-card" key={item.id}>
          <FigureImage figure={item.figure} />
          <div className="incoming-card-body"><div className="incoming-card-title"><div><span className={`incoming-status ${item.status}`}>{STATUS_LABELS[item.status]}</span><h3>{item.quantity} × {item.figure?.name}</h3><p>{item.figure?.series?.brand?.name} · {item.figure?.series?.name}</p></div><strong>{owned[item.figure_id] || 0} owned</strong></div>
          <dl><div><dt>Seller</dt><dd>{item.seller || 'Not added'}</dd></div><div><dt>Ordered</dt><dd>{item.order_date ? new Date(`${item.order_date}T00:00:00`).toLocaleDateString() : 'Not added'}</dd></div><div><dt>Expected</dt><dd>{item.expected_date ? new Date(`${item.expected_date}T00:00:00`).toLocaleDateString() : 'Not added'}</dd></div></dl>
          {item.notes && <p className="incoming-notes">{item.notes}</p>}{item.tracking_url && <a href={item.tracking_url} target="_blank" rel="noreferrer">Open tracking ↗</a>}
          <div className="incoming-card-actions">{ACTIVE_STATUSES.has(item.status) && <><select aria-label={`Update status for ${item.figure?.name}`} value={item.status} onChange={(event) => updateStatus(item, event.target.value)}><option value="ordered">Ordered</option><option value="shipped">Shipped</option><option value="out_for_delivery">Out for delivery</option><option value="cancelled">Cancelled</option></select><button className="received-button" onClick={() => receive(item)}>Mark received</button></>}<button className="remove-button" onClick={() => remove(item)}>Remove</button></div>
          </div>
        </article>)}</div>
        {!visibleItems.length && <div className="empty-panel"><h3>Nothing is on the way</h3><p>Add a purchased figure to keep it separate from the collection until it arrives.</p></div>}
      </section>
    </section>
  </main>
}

