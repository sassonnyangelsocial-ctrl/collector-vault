import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './AboutPage.css'

const features = [
  ['Collection Vault', 'Track owned figures, quantities, favorites, duplicates, wishlist, ISO, DISO, and trades across a 749-figure directory.'],
  ['Search & market context', 'Search by figure, series, rarity, Secret, or Robby and review current estimated market-price context.'],
  ['Trade Chat', 'Opt into match discovery, find collectors whose lists line up with yours, and talk directly inside the app.'],
  ['Collector Alerts', 'Follow restocks, drops, launches, and inventory updates from stores and websites you choose.'],
  ['Seller Pro', 'Organize suppliers, purchase orders, cases, costs, inventory, sales, fees, expenses, and profit.'],
  ['Whatnot tools', 'Import your own Seller Hub CSV without sharing your Whatnot password.'],
  ['Giveaway Wheel', 'Run free-entry promotional drawings and save private draw history.'],
  ['Installable app', 'Add Collector Vault to a phone home screen for an app-like experience.'],
]

const tour = [
  ['02-catalog-search.png', 'Directory search', 'Find figures such as Carousel Lop across the live catalog.'],
  ['03-trade-chat.png', 'Trade Chat', 'Turn matching lists into private collector conversations.'],
  ['04-alerts.png', 'Collector alerts', 'Keep restocks, drops, launches, and inventory on one watchlist.'],
  ['06-purchase-orders.png', 'Seller purchase orders', 'Record supplier, case, cost, payment, shipment, and receiving details.'],
  ['07-whatnot-import.png', 'Whatnot import', 'Bring your own Seller Hub export into Seller Pro.'],
  ['08-giveaway-wheel.png', 'Giveaway wheel', 'Manage free-entry promotional drawings and private history.'],
]

function signIn(mode = 'signup') {
  window.location.hash = `signin-${mode}`
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

export default function AboutPage({ session }) {
  const [form, setForm] = useState({ name: '', email: session?.user?.email || '', kind: 'question', message: '', website: '' })
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (form.website) return setStatus('Thanks — your message was received.')
    setSending(true)
    setStatus('')
    const { error } = await supabase.from('public_inquiries').insert({ name: form.name.trim(), email: form.email.trim().toLowerCase(), kind: form.kind, message: form.message.trim(), source: 'about-page' })
    setSending(false)
    if (error) return setStatus('Your message could not be sent right now. Please try again in a moment.')
    setStatus('Thank you! Your message is in the Collector Vault inbox.')
    setForm((current) => ({ ...current, name: '', message: '', website: '' }))
  }

  const openApp = () => { window.location.hash = 'app' }
  return <main className="about-page">
    <header className="about-nav"><button className="about-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Collector Vault</button><nav aria-label="About page navigation"><a href="#features">Features</a><a href="#tour">Live tour</a><a href="#pricing">Pricing</a><a href="#contact">Contact</a>{session ? <button className="about-nav-cta" onClick={openApp}>Open my vault</button> : <button onClick={() => signIn('login')}>Sign in</button>}</nav></header>

    <section className="about-hero"><div><span className="eyebrow">The collection and seller workspace</span><h1>Everything your collection needs. One organized vault.</h1><p>Catalog your figures, build wishlist and trade lists, discover matches, follow collector alerts, and run the business side of selling—all before the next box arrives.</p><div className="about-actions"><button className="primary-button" onClick={session ? openApp : () => signIn('signup')}>{session ? 'Open my vault' : 'Start 7-day free trial'}</button><a className="secondary-button" href="#tour">Explore the live app</a></div><small>$4.99/month or $49.99/year after the trial. Cancel anytime.</small></div><figure className="hero-product-shot"><img src="/product-tour/01-dashboard.png" alt="Live Collector Vault dashboard showing collection progress and organized lists" /><figcaption>Actual Collector Vault dashboard</figcaption></figure></section>

    <section className="trust-strip" aria-label="Collector Vault highlights"><strong>749 cataloged figures</strong><span>Wishlist • ISO • DISO • Trades</span><span>Seller Pro</span><span>Restock alerts</span><span>Installable on phones</span></section>

    <section className="about-section" id="features"><span className="eyebrow">What Collector Vault offers</span><h2>Made for collectors. Built to grow with sellers.</h2><div className="feature-tour-grid">{features.map(([title, copy], index) => <article key={title} className="feature-tour-card"><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

    <section className="about-section tour-section" id="tour"><div className="tour-heading"><div><span className="eyebrow">The actual platform</span><h2>See it before you sign up.</h2></div><p>Every image and video below comes from the live Collector Vault experience. Select any image to open it full size.</p></div><div className="demo-video-card"><video controls playsInline preload="metadata" poster="/product-tour/demo-cover.png" aria-label="Collector Vault live platform demo reel"><source src="/product-tour/collector-vault-demo-reel.mp4" type="video/mp4" /></video><div><span className="eyebrow">Launch demo</span><h3>Tour Collector Vault in under 30 seconds.</h3><p>Dashboard, directory search, Trade Chat, alerts, Seller Pro, Whatnot import, and the giveaway wheel.</p></div></div><div className="live-gallery">{tour.map(([file, title, copy]) => <figure key={file}><a href={`/product-tour/${file}`} target="_blank" rel="noreferrer"><img src={`/product-tour/${file}`} alt={`Actual Collector Vault ${title} screen`} loading="lazy" /></a><figcaption><strong>{title}</strong><span>{copy}</span></figcaption></figure>)}</div></section>

    <section className="about-section pricing-preview" id="pricing"><div><span className="eyebrow">Simple membership</span><h2>Try the full vault for 7 days.</h2><p>Collector tools, alerts, Trade Chat, and Seller Pro are included.</p></div><article><span>Monthly</span><strong>$4.99<small>/month</small></strong></article><article className="featured"><span>Best value</span><strong>$49.99<small>/year</small></strong></article>{!session && <button className="primary-button" onClick={() => signIn('signup')}>Create my vault</button>}</section>

    <section className="about-section contact-section" id="contact"><div><span className="eyebrow">Questions & suggestions</span><h2>Help shape Collector Vault.</h2><p>Ask about membership or features, report a catalog correction, suggest an improvement, or tell us what would make your collector or seller workflow easier.</p><p>Email us directly at <a href="mailto:SASsonnyangelsocial@gmail.com">SASsonnyangelsocial@gmail.com</a>.</p></div><form className="contact-form" onSubmit={submit}><label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength="80" required /></label><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength="254" required /></label><label>What can we help with?<select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}><option value="question">Question</option><option value="suggestion">Suggestion</option><option value="catalog-correction">Catalog correction</option><option value="seller-pro">Seller Pro</option><option value="billing">Membership or billing</option></select></label><label>Message<textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} minLength="10" maxLength="2000" required /></label><label className="contact-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label><button className="primary-button" disabled={sending}>{sending ? 'Sending…' : 'Send message'}</button>{status && <p className="form-message" role="status">{status}</p>}</form></section>

    <footer className="about-footer"><div><strong>Collector Vault</strong><br /><a href="mailto:SASsonnyangelsocial@gmail.com">SASsonnyangelsocial@gmail.com</a></div><p>Independent collector platform. Not affiliated with Sonny Angel® or Whatnot®. Market values are estimates. Giveaway tools are for free-entry promotions only; users are responsible for applicable rules and laws.</p></footer>
  </main>
}
