import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './CatalogRequest.css'

export default function CatalogRequest({ session }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ brand: '', series: '', details: '' })
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setStatus('')
    const message = `Catalog request — Brand: ${form.brand.trim()}; Series: ${form.series.trim()}; Details: ${form.details.trim() || 'No additional details.'}`
    const { error } = await supabase.from('public_inquiries').insert({ name: session.user.user_metadata?.full_name || session.user.email.split('@')[0], email: session.user.email, kind: 'catalog-correction', message, source: 'about-page' })
    setBusy(false)
    if (error) return setStatus('The request could not be sent. Please try again.')
    setStatus('Catalog request sent. Thank you!')
    setForm({ brand: '', series: '', details: '' })
  }

  return <section className="catalog-request"><div><strong>Can’t find a collection?</strong><span>Request a missing brand or series for the catalog.</span></div><button type="button" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Request series'}</button>{open && <form onSubmit={submit}><input required maxLength="80" placeholder="Brand" value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} /><input required maxLength="120" placeholder="Series" value={form.series} onChange={(event) => setForm({ ...form, series: event.target.value })} /><textarea maxLength="1200" placeholder="Official link or helpful details (optional)" value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} /><button className="primary-button" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>{status && <p role="status">{status}</p>}</form>}</section>
}
