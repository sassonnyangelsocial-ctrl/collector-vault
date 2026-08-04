import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './PartnersPage.css'

const opportunities = [
  ['Creator collaborations', 'Tutorials, collection tours, live-wheel demos, launch content, and honest product reviews for collector audiences.'],
  ['Community partnerships', 'Collector groups, events, conventions, live sellers, and communities that want better collection and giveaway tools.'],
  ['Retail and brand partnerships', 'Campaigns, verified release information, collector education, and co-marketing opportunities that serve the hobby.'],
]

const facts = [
  'Web-based collector and seller platform',
  'Sonny Angel, SMISKI, and POP MART catalog support',
  'Wishlist, ISO, DISO, trade, alert, and Seller Pro tools',
  'Live synchronized giveaway wheel with host controls and viewer chat',
  '7-day free trial; $4.99 monthly or $49.99 yearly',
  'Independent platform; not affiliated with collectible manufacturers',
]

export default function PartnersPage({ session }) {
  const [form, setForm] = useState({ name: '', email: session?.user?.email || '', handle: '', type: 'creator', message: '', website: '' })
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (form.website) return setStatus('Thanks — your request was received.')
    setSending(true)
    setStatus('')
    const details = `PARTNERSHIP REQUEST\nType: ${form.type}\nSocial handle or website: ${form.handle || 'Not provided'}\n\n${form.message}`
    const { error } = await supabase.from('public_inquiries').insert({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      kind: 'suggestion',
      message: details.slice(0, 2000),
      source: 'about-page',
    })
    setSending(false)
    if (error) return setStatus('Your request could not be sent right now. Please email SASsonnyangelsocial@gmail.com.')
    setStatus('Thank you! Your partnership request is in the Collector Vault inbox.')
    setForm((current) => ({ ...current, name: '', handle: '', message: '', website: '' }))
  }

  function openApp() {
    window.location.href = session ? '/#app' : '/#signin-signup'
  }

  return <main className="partners-page">
    <header className="partner-nav"><a className="partner-brand" href="/">Collector Vault</a><nav aria-label="Partner page navigation"><a href="#opportunities">Opportunities</a><a href="#brand-kit">Brand kit</a><a href="#apply">Apply</a><button onClick={openApp}>{session ? 'Open my vault' : 'Try Collector Vault'}</button></nav></header>

    <section className="partner-hero"><div><span className="eyebrow">Collector Vault partnerships</span><h1>Let’s build something collectors will talk about.</h1><p>Collector Vault partners with creators, collector communities, sellers, events, retailers, and brands that want to help people collect, connect, and host better live experiences.</p><div className="partner-actions"><a className="primary-button" href="#apply">Start a conversation</a><a className="secondary-button" href="/partners/collector-vault-partner-guide.txt" download>Download partner guide</a></div></div><figure><img src="/product-tour/08-giveaway-wheel.png" alt="Collector Vault live synchronized giveaway wheel" /><figcaption>Actual Collector Vault live-wheel experience</figcaption></figure></section>

    <section className="partner-proof" aria-label="Collector Vault partnership highlights"><strong>@collectorvaultapp</strong><span>Creator-ready campaigns</span><span>Live product demonstrations</span><span>Trackable campaign links</span><span>Clear sponsorship disclosure</span></section>

    <section className="partner-section" id="opportunities"><span className="eyebrow">Ways to work together</span><h2>Partnerships designed around real collector communities.</h2><div className="opportunity-grid">{opportunities.map(([title, copy], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

    <section className="partner-section partner-showcase"><div><span className="eyebrow">The product</span><h2>Show the real experience, not a mockup.</h2><p>Partners can demonstrate the collection dashboard, catalog search, Trade Chat, collector alerts, Seller Pro, Whatnot import, and the live giveaway wheel.</p></div><div className="partner-gallery"><img src="/product-tour/01-dashboard.png" alt="Collector Vault collection dashboard" /><img src="/product-tour/03-trade-chat.png" alt="Collector Vault Trade Chat" /><img src="/product-tour/08-giveaway-wheel.png" alt="Collector Vault live wheel" /></div></section>

    <section className="partner-section brand-kit" id="brand-kit"><div><span className="eyebrow">Partner brand kit</span><h2>Everything needed to represent Collector Vault accurately.</h2><p>Use the official name, live product imagery, approved facts, and a clear paid-partnership or affiliate disclosure whenever compensation or value is exchanged.</p><div className="kit-links"><a className="primary-button" href="/partners/collector-vault-partner-guide.txt" download>Download partner guide</a><a className="secondary-button" href="/icon.svg" download>Download logo mark</a></div></div><ul>{facts.map((fact) => <li key={fact}>{fact}</li>)}</ul></section>

    <section className="partner-section disclosure-card"><span className="eyebrow">Social partnership standard</span><h2>Transparent by design.</h2><p>Partners should use the platform’s Paid Partnership label and clearly disclose gifted access, sponsorships, affiliate compensation, or any other material connection. Product claims must match the current live experience. Partnership approval never implies affiliation with Sonny Angel®, SMISKI®, POP MART®, or Whatnot®.</p></section>

    <section className="partner-section apply-section" id="apply"><div><span className="eyebrow">Partner with Collector Vault</span><h2>Tell us about your audience and your idea.</h2><p>Share your social handle, community, event, store, or campaign concept. We’ll review fit and follow up by email.</p><p>Direct contact: <a href="mailto:SASsonnyangelsocial@gmail.com?subject=Collector%20Vault%20Partnership">SASsonnyangelsocial@gmail.com</a></p></div><form className="partner-form" onSubmit={submit}><label>Name or organization<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength="80" required /></label><label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength="254" required /></label><label>Social handle or website<input value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} maxLength="180" placeholder="@handle or https://…" /></label><label>Partnership type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="creator">Creator collaboration</option><option value="community">Community or event</option><option value="retail">Retail or brand</option><option value="affiliate">Affiliate opportunity</option><option value="other">Other</option></select></label><label className="full">Tell us about your audience and idea<textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} minLength="10" maxLength="1750" required /></label><label className="partner-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label><button className="primary-button full" disabled={sending}>{sending ? 'Sending…' : 'Submit partnership request'}</button>{status && <p className="form-message full" role="status">{status}</p>}</form></section>

    <footer className="partner-footer"><div><strong>Collector Vault</strong><br /><a href="https://www.instagram.com/collectorvaultapp/" target="_blank" rel="noreferrer">@collectorvaultapp</a></div><p>Independent collector platform. Partnership opportunities are reviewed individually and are not guaranteed. Sponsored and affiliate content must be disclosed.</p></footer>
  </main>
}
