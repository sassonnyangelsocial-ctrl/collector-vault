import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const TYPES = ['all', 'restock', 'drop', 'launch', 'inventory']

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  useEffect(() => {
    supabase.from('stock_alerts').select('*,source:source_id(name,source_type,url,verified)').order('published_at', { ascending: false })
      .then(({ data, error: loadError }) => { setAlerts(data || []); if (loadError) setError(loadError.message) })
  }, [])
  const shown = useMemo(() => filter === 'all' ? alerts : alerts.filter((alert) => alert.alert_type === filter), [alerts, filter])
  return <main className="collection-page alerts-page">
    <header className="page-header"><div><span className="eyebrow">Verified collector intelligence</span><h1>Restock alerts</h1><p>Drops, launches, and inventory updates from official sources, dealers, suppliers, stores, and online shops.</p></div></header>
    <div className="alert-filters">{TYPES.map((type) => <button key={type} className={filter === type ? 'active' : ''} onClick={() => setFilter(type)}>{type}</button>)}</div>
    {error && <p className="error-banner">{error}</p>}
    <section className="alerts-grid">{shown.map((alert) => <article className="alert-card" key={alert.id}>
      <div className="alert-card-top"><span className={`alert-type ${alert.alert_type}`}>{alert.alert_type}</span>{alert.source?.verified && <span className="verified-badge">Verified source</span>}</div>
      <h2>{alert.title}</h2><p>{alert.description}</p>
      <div className="alert-meta"><strong>{alert.source?.name}</strong><span>{alert.region || 'Online'}</span><span>{alert.availability}</span></div>
      <a className="primary-button alert-link" href={alert.product_url} target="_blank" rel="noreferrer">Check availability</a>
    </article>)}</section>
    {!shown.length && <div className="empty-panel"><h3>No alerts in this category yet</h3><p>New verified updates will appear here.</p></div>}
    <p className="alerts-note">Availability can change quickly. Always confirm price and stock with the linked seller.</p>
  </main>
}
