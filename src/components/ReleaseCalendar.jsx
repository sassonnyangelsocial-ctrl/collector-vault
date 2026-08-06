import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { apiUrl } from '../lib/runtime'
import { releaseCalendarFile } from '../lib/calendar'
import './ReleaseCalendar.css'

const EMPTY_RELEASE = { title: '', alert_type: 'launch', event_at: '', product_url: '', description: '', source_id: '', event_location: 'Online' }

export default function ReleaseCalendar({ alerts, isAdmin, onRefresh }) {
  const [sources, setSources] = useState([])
  const [form, setForm] = useState(EMPTY_RELEASE)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const releases = useMemo(() => alerts.filter((alert) => alert.event_at).toSorted((a, b) => new Date(a.event_at) - new Date(b.event_at)), [alerts])

  useEffect(() => {
    if (!isAdmin) return
    supabase.from('alert_sources').select('id,name,verified').eq('active', true).order('name').then(({ data }) => setSources(data || []))
  }, [isAdmin])

  function downloadEvent(alert) {
    const blob = new Blob([releaseCalendarFile(alert)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${alert.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  async function addRelease(event) {
    event.preventDefault()
    setBusy(true)
    setStatus('')
    try {
      const { data } = await supabase.auth.getSession()
      const response = await fetch(apiUrl('/api/admin-releases'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }, body: JSON.stringify(form) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Release could not be added.')
      setForm(EMPTY_RELEASE)
      setStatus('Release added to the verified calendar.')
      onRefresh()
    } catch (error) {
      setStatus(error.message)
    } finally {
      setBusy(false)
    }
  }

  return <section className="release-calendar" aria-labelledby="release-calendar-title">
    <div className="release-calendar-heading"><div><span className="eyebrow">Verified schedule</span><h2 id="release-calendar-title">Release calendar</h2><p>Save verified launches, drops, and restocks to your phone calendar.</p></div><strong>{releases.length} scheduled</strong></div>
    <div className="release-list">{releases.map((alert) => <article key={alert.id} className="release-card"><time dateTime={alert.event_at}><strong>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(alert.event_at))}</strong><span>{new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(alert.event_at))}</span></time><div><span className={`alert-type ${alert.alert_type}`}>{alert.alert_type}</span><h3>{alert.title}</h3><p>{alert.event_location || alert.region || 'Online'} · {alert.source?.name || 'Verified source'}</p></div><button type="button" onClick={() => downloadEvent(alert)}>Add to calendar</button></article>)}</div>
    {!releases.length && <div className="empty-panel"><h3>No scheduled releases yet</h3><p>Verified dates will appear here as they are announced.</p></div>}
    {isAdmin && <details className="release-admin"><summary>Add verified release</summary><form onSubmit={addRelease}><input required placeholder="Release title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /><select required value={form.source_id} onChange={(event) => setForm({ ...form, source_id: event.target.value })}><option value="">Verified source</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.name}{source.verified ? ' ✓' : ''}</option>)}</select><select value={form.alert_type} onChange={(event) => setForm({ ...form, alert_type: event.target.value })}><option value="launch">Launch</option><option value="drop">Drop</option><option value="restock">Restock</option><option value="inventory">Inventory</option></select><input required type="datetime-local" value={form.event_at} onChange={(event) => setForm({ ...form, event_at: event.target.value })} /><input required type="url" placeholder="Official product URL" value={form.product_url} onChange={(event) => setForm({ ...form, product_url: event.target.value })} /><input placeholder="Location or website" value={form.event_location} onChange={(event) => setForm({ ...form, event_location: event.target.value })} /><textarea placeholder="Verified details" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /><button className="primary-button" disabled={busy}>{busy ? 'Publishing…' : 'Publish release'}</button></form>{status && <p role="status">{status}</p>}</details>}
  </section>
}
