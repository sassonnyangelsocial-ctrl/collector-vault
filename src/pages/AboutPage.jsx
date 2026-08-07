import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './AboutPage.css'

const features = [
  ['Multi-brand Collection Vault', 'Track 3,400+ Sonny Angel, SMISKI, and POP MART collectibles across owned, missing, favorites, duplicates, wishlist, ISO, DISO, and trade lists.'],
  ['Search & price context', 'Search every brand and series, including Secrets and Robbys, with verified source links and current price context where available.'],
  ['Trade Chat', 'Opt into match discovery, find collectors whose lists line up with yours, and talk directly inside the app.'],
  ['Collector Alerts', 'Follow restocks, drops, launches, and inventory updates from stores and websites you choose.'],
  ['Seller Pro', 'Organize suppliers, purchase orders, cases, costs, inventory, sales, fees, expenses, and profit.'],
  ['Whatnot tools', 'Import your own Seller Hub CSV without sharing your Whatnot password.'],
  ['Share & export', 'Copy, share, or download filtered collection, missing, wishlist, ISO, DISO, and trade lists without rebuilding a post.'],
  ['Live Giveaway Studio', 'Host a synchronized elimination wheel with guest viewers, participant lists, shuffle and spin updates, live chat, and optional audio or video.'],
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
    <aside className="free-launch-banner"><strong>FREE LAUNCH IS LIVE</strong><span>Build your complete collector vault for $0—no card, no countdown.</span><button onClick={session ? openApp : () => signIn('signup')}>{session ? 'Open my vault' : 'Start free now'}</button></aside>
    <header className="about-nav"><button className="about-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Collector Vault</button><nav aria-label="About page navigation"><a href="#features">Features</a><a href="#tour">Live tour</a><a href="#pricing">Pricing</a><a href="/partners">Partners</a><a href="#contact">Contact</a>{session ? <button className="about-nav-cta" onClick={openApp}>Open my vault</button> : <button onClick={() => signIn('login')}>Sign in</button>}</nav></header>

    <section className="about-hero"><div><span className="eyebrow">Now free for every collector</span><h1>Build your vault free. Upgrade when you want more.</h1><p>Track your figures, missing pieces, quantities, duplicates, favorites, wishlist, ISO, DISO, and trades for free—then unlock matching, live hosting, alerts, and seller tools with Pro.</p><div className="about-actions"><button className="primary-button" onClick={session ? openApp : () => signIn('signup')}>{session ? 'Open my vault' : 'Create my free vault'}</button><a className="secondary-button" href="#pricing">Compare plans</a></div><small>No card required for the Free plan. Keep it as long as you want.</small></div><figure className="hero-product-shot"><img src="/product-tour/01-dashboard.png" alt="Live Collector Vault dashboard showing collection progress and organized lists" /><figcaption>Actual Collector Vault dashboard</figcaption></figure></section>

    <section className="trust-strip" aria-label="Collector Vault highlights"><strong>3,400+ active catalog entries</strong><span>Sonny Angel · SMISKI · POP MART</span><span>Missing • Wishlist • ISO • DISO • Trades</span><span>Live Giveaway Studio</span><span>Seller Pro</span><span>Shareable social images</span></section>

    <section className="about-section" id="features"><span className="eyebrow">What Collector Vault offers</span><h2>Made for collectors. Built to grow with sellers.</h2><div className="feature-tour-grid">{features.map(([title, copy], index) => <article key={title} className="feature-tour-card"><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

    <section className="about-section tour-section" id="tour"><div className="tour-heading"><div><span className="eyebrow">The actual platform</span><h2>See it before you sign up.</h2></div><p>Every image and video below comes from the live Collector Vault experience. Select any image to open it full size.</p></div><div className="demo-video-card"><video controls playsInline preload="metadata" poster="/product-tour/demo-cover.png" aria-label="Collector Vault live platform demo reel"><source src="/product-tour/collector-vault-demo-reel.mp4" type="video/mp4" /></video><div><span className="eyebrow">Launch demo</span><h3>Tour Collector Vault in under 30 seconds.</h3><p>Dashboard, directory search, Trade Chat, alerts, Seller Pro, Whatnot import, and the giveaway wheel.</p></div></div><div className="live-gallery">{tour.map(([file, title, copy]) => <figure key={file}><a href={`/product-tour/${file}`} target="_blank" rel="noreferrer"><img src={`/product-tour/${file}`} alt={`Actual Collector Vault ${title} screen`} loading="lazy" /></a><figcaption><strong>{title}</strong><span>{copy}</span></figcaption></figure>)}</div></section>

    <section className="about-section pricing-preview freemium-pricing" id="pricing"><div><span className="eyebrow">Free to start. Pro when ready.</span><h2>Every collector gets a real vault.</h2><p>Start free with the complete tracking experience. Upgrade to Pro for reciprocal trade matching and chat, verified alerts and release calendars, Live Wheel hosting, Seller Pro, Whatnot importing, and future premium analytics.</p></div><article><span>Free forever</span><strong>$0</strong><small>No card required</small></article><article><span>Pro monthly</span><strong>$4.99<small>/month</small></strong><small>7-day Pro trial</small></article><article className="featured"><span>Pro yearly</span><strong>$49.99<small>/year</small></strong><small>Best value</small></article>{!session && <button className="primary-button" onClick={() => signIn('signup')}>Create my free vault</button>}</section>

    <section className="about-section contact-section" id="contact"><div><span className="eyebrow">Questions & suggestions</span><h2>Help shape Collector Vault.</h2><p>Ask about membership or features, report a catalog correction, suggest an improvement, or tell us what would make your collector or seller workflow easier.</p><p>Email us directly at <a href="mailto:SASsonnyangelsocial@gmail.com">SASsonnyangelsocial@gmail.com</a>.</p></div><form className="contact-form" onSubmit={submit}><label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength="80" required /></label><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength="254" required /></label><label>What can we help with?<select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}><option value="question">Question</option><option value="suggestion">Suggestion</option><option value="catalog-correction">Catalog correction</option><option value="seller-pro">Seller Pro</option><option value="billing">Membership or billing</option></select></label><label>Message<textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} minLength="10" maxLength="2000" required /></label><label className="contact-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label><button className="primary-button" disabled={sending}>{sending ? 'Sending…' : 'Send message'}</button>{status && <p className="form-message" role="status">{status}</p>}</form></section>

    <footer className="about-footer"><div><strong>Collector Vault</strong><br /><a href="mailto:SASsonnyangelsocial@gmail.com">SASsonnyangelsocial@gmail.com</a></div><p>Independent collector platform. Not affiliated with Sonny Angel®, SMISKI®, POP MART®, or Whatnot®. Market values are estimates. Giveaway tools are for free-entry promotions only; users are responsible for applicable rules and laws.</p></footer>
  </main>
}
