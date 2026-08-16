import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './TradeHubPage.css'
import './SubscriberInvite.css'

export default function TradeHubPage({ session }) {
  const userId = session.user.id
  const [profile, setProfile] = useState({ display_name: '', discoverable: true, contact_email: session.user.email || '', email_visible: false })
  const [matches, setMatches] = useState([]), [subscribers, setSubscribers] = useState([]), [subscriberQuery, setSubscriberQuery] = useState('')
  const [threads, setThreads] = useState([]), [active, setActive] = useState(null), [messages, setMessages] = useState([])
  const [body, setBody] = useState(''), [notice, setNotice] = useState(''), [loading, setLoading] = useState(true)
  const [inviteLink, setInviteLink] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')

  const loadThreads = useCallback(async () => {
    const { data, error } = await supabase.from('trade_threads').select('*,requested:requested_figure_id(name),offered:offered_figure_id(name)').order('updated_at', { ascending: false })
    if (error) setNotice(error.message); setThreads(data || [])
  }, [])
  const loadMatches = useCallback(async () => {
    const { data, error } = await supabase.rpc('find_trade_matches')
    if (error) setNotice(error.message); setMatches(data || [])
  }, [])
  const loadSubscribers = useCallback(async () => {
    const { data, error } = await supabase.from('trade_profiles').select('user_id,display_name,discoverable,contact_email,email_visible').eq('discoverable', true).neq('user_id', userId).order('display_name')
    if (error) setNotice(error.message); setSubscribers(data || [])
  }, [userId])

  useEffect(() => {
    Promise.all([supabase.from('trade_profiles').select('*').eq('user_id', userId).maybeSingle(), loadThreads(), loadSubscribers(), supabase.from('subscriber_invite_links').select('code').eq('user_id', userId).maybeSingle()]).then(([{ data },,, invite]) => { if (data) setProfile(data); if (invite.data?.code) setInviteLink(makeInviteLink(invite.data.code)); setLoading(false) })
  }, [userId, loadThreads, loadSubscribers])
  useEffect(() => { if (profile.discoverable) { loadMatches(); loadSubscribers() } else setMatches([]) }, [profile.discoverable, loadMatches, loadSubscribers])

  const openThread = useCallback(async (thread) => {
    setActive(thread)
    const { data, error } = await supabase.from('trade_messages').select('*').eq('thread_id', thread.id).order('created_at')
    if (error) setNotice(error.message); setMessages(data || [])
  }, [])
  useEffect(() => {
    if (!active) return
    const channel = supabase.channel(`trade-${active.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trade_messages', filter: `thread_id=eq.${active.id}` }, ({ new: row }) => setMessages((old) => old.some((item) => item.id === row.id) ? old : [...old, row])).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [active])

  async function saveProfile(event) {
    event.preventDefault()
    const emailVisible = Boolean(profile.email_visible)
    const payload = { user_id: userId, display_name: profile.display_name.trim(), discoverable: profile.discoverable, contact_email: emailVisible ? (profile.contact_email || session.user.email || '').trim().toLowerCase() || null : null, email_visible: emailVisible, updated_at: new Date().toISOString() }
    const { data, error } = await supabase.from('trade_profiles').upsert(payload).select().single()
    setNotice(error ? error.message : 'Messaging preferences saved.'); if (data) setProfile(data)
  }
  async function loadAndOpen(threadId, otherName) {
    await loadThreads()
    const { data } = await supabase.from('trade_threads').select('*,requested:requested_figure_id(name),offered:offered_figure_id(name)').eq('id', threadId).single()
    if (data) openThread({ ...data, other_name: otherName })
  }
  async function startTrade(match) {
    const { data, error } = await supabase.rpc('start_trade_conversation', { p_other: match.other_user_id, p_requested: match.requested_figure_id, p_offered: match.offered_figure_id })
    if (error) return setNotice(error.message); loadAndOpen(data, match.display_name)
  }
  async function startDirect(other) {
    const { data, error } = await supabase.rpc('start_direct_conversation', { p_other: other.user_id })
    if (error) return setNotice(error.message); loadAndOpen(data, other.display_name)
  }
  function makeInviteLink(code) {
    return `${window.location.origin}/?invite=${encodeURIComponent(code)}#signin-signup`
  }
  async function copyInviteLink(link = inviteLink) {
    try { await navigator.clipboard.writeText(link); setNotice('Your special signup link was copied.') }
    catch { setNotice('Copy the special link shown below.') }
  }
  async function createInviteLink() {
    const code = crypto.randomUUID().replaceAll('-', '').slice(0, 16)
    const { data, error } = await supabase.from('subscriber_invite_links').insert({ user_id: userId, code }).select('code').single()
    if (error) return setNotice(error.message)
    const link = makeInviteLink(data.code); setInviteLink(link); await copyInviteLink(link)
  }
  async function shareInviteLink() {
    if (!navigator.share) return copyInviteLink()
    try { await navigator.share({ title: 'Join me on Collector Vault', text: 'Create a free Collector Vault account and organize your collection with me.', url: inviteLink }) } catch { /* Sharing was canceled. */ }
  }
  function emailInvite(event) {
    event.preventDefault()
    const recipient = inviteEmail.trim()
    if (!recipient || !inviteLink) return
    const subject = encodeURIComponent('Join me on Collector Vault')
    const message = encodeURIComponent(`I invited you to Collector Vault, a community for organizing collections, avoiding duplicates, and connecting with other collectors. Create your free account here:\n\n${inviteLink}`)
    window.location.href = `mailto:${encodeURIComponent(recipient)}?subject=${subject}&body=${message}`
    setNotice('Your email app is ready with the Collector Vault invitation.')
  }
  async function send(event) {
    event.preventDefault(); if (!body.trim() || !active) return
    const text = body.trim(); setBody('')
    const { error } = await supabase.from('trade_messages').insert({ thread_id: active.id, sender_id: userId, body: text })
    if (error) { setBody(text); setNotice(error.message) }
  }
  async function updateStatus(status) {
    const { error } = await supabase.from('trade_threads').update({ status, updated_at: new Date().toISOString() }).eq('id', active.id)
    if (error) return setNotice(error.message); setActive({ ...active, status }); loadThreads()
  }
  async function block() {
    const other = active.member_a === userId ? active.member_b : active.member_a
    const { error } = await supabase.from('trade_blocks').insert({ blocker_id: userId, blocked_id: other })
    if (error) return setNotice(error.message); await updateStatus('closed'); setNotice('Member blocked. They can no longer start or continue conversations with you.')
  }
  async function report() {
    const reason = window.prompt('Briefly describe the safety or conduct concern:'); if (!reason) return
    const other = active.member_a === userId ? active.member_b : active.member_a
    const { error } = await supabase.from('trade_reports').insert({ reporter_id: userId, reported_user_id: other, thread_id: active.id, reason })
    setNotice(error ? error.message : 'Report submitted for review.')
  }

  if (loading) return <div className="center compact">Loading Trade Chat...</div>
  const profileNames = Object.fromEntries(subscribers.map((member) => [member.user_id, member.display_name]))
  const threadName = (thread) => thread.other_name || profileNames[thread.member_a === userId ? thread.member_b : thread.member_a] || 'Collector'
  const threadTitle = (thread) => thread.conversation_kind === 'direct' ? threadName(thread) : `${thread.requested?.name || 'Figure'} ⇄ ${thread.offered?.name || 'Figure'}`
  const visibleSubscribers = subscribers.filter((member) => {
    const query = subscriberQuery.trim().toLowerCase()
    return member.display_name.toLowerCase().includes(query) || (member.email_visible && member.contact_email?.toLowerCase().includes(query))
  })

  return <main className="trade-hub">
    <header className="page-header"><div><span className="eyebrow">Collector-to-collector</span><h1>Trade Chat</h1><p>Message another subscriber directly or discuss a reciprocal trade match privately.</p></div></header>{notice && <p className="form-message trade-notice">{notice}</p>}
    <section className="trade-safety"><strong>Trade safely</strong><span>Keep communication here, verify photos and condition, use tracked shipping, and never send passwords or verification codes. Collector Vault does not guarantee users or trades.</span></section>
    <form className="trade-profile seller-panel" onSubmit={saveProfile}><div className="trade-profile-heading"><span className="eyebrow">Messaging profile</span><h2>How other collectors see you</h2><p>Use a collector name and choose exactly what other signed-in collectors can see.</p></div><label>Display name<input required minLength="2" maxLength="40" value={profile.display_name} onChange={(event) => setProfile({ ...profile, display_name: event.target.value })} placeholder="Collector name" /></label><label>Contact email<input type="email" maxLength="254" value={profile.contact_email || ''} onChange={(event) => setProfile({ ...profile, contact_email: event.target.value })} placeholder="you@example.com" /><small className="email-privacy-note">Only visible when you turn on the sharing option below.</small></label><label className="toggle-row"><input type="checkbox" checked={profile.discoverable} onChange={(event) => setProfile({ ...profile, discoverable: event.target.checked })} /><span>Let subscribers find and message me, and include me in trade matching</span></label><label className="toggle-row"><input type="checkbox" checked={Boolean(profile.email_visible)} onChange={(event) => setProfile({ ...profile, email_visible: event.target.checked })} /><span>Show my contact email to signed-in subscribers</span></label><button className="primary-button">Save preferences</button></form>
    <section className="subscriber-directory seller-panel"><div><span className="eyebrow">Subscriber directory</span><h2>Start a conversation</h2><p>Find subscribers by collector name or a shared contact email, then open a private Trade Chat.</p></div><input type="search" aria-label="Search subscribers" value={subscriberQuery} onChange={(event) => setSubscriberQuery(event.target.value)} placeholder="Search by collector name" /><div className="subscriber-grid">{visibleSubscribers.map((member) => <div className="subscriber-card" key={member.user_id}><span className="subscriber-avatar">{member.display_name.slice(0, 1).toUpperCase()}</span><div className="subscriber-card-copy"><strong>{member.display_name}</strong>{member.email_visible && member.contact_email ? <a href={`mailto:${member.contact_email}`}>{member.contact_email}</a> : <small>Email private</small>}</div><button disabled={!profile.discoverable} onClick={() => startDirect(member)}>Message</button></div>)}</div>{!profile.discoverable && <p className="directory-note">Save a display name and enable subscriber messages before starting a conversation.</p>}{profile.discoverable && !visibleSubscribers.length && <p className="directory-note">No matching subscribers are currently available.</p>}</section>
    <section className="subscriber-invite seller-panel"><div><span className="eyebrow">Invite friends</span><h2>Send a special signup invitation</h2><p>Share your personal link or prepare an addressed invitation in your email app.</p></div>{inviteLink ? <><div className="invite-link-row"><input aria-label="Your special Collector Vault signup link" readOnly value={inviteLink} /><button onClick={() => copyInviteLink()}>Copy link</button><button className="primary-button" onClick={shareInviteLink}>Share</button></div><form className="invite-email-form" onSubmit={emailInvite}><input required type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="friend@example.com" aria-label="Friend's email address" /><button className="primary-button">Email invite</button></form></> : <button className="primary-button" onClick={createInviteLink}>Create my special link</button>}</section>
    <section className="trade-layout"><article className="seller-panel"><span className="eyebrow">Reciprocal matches</span><h2>{matches.length} possible trade{matches.length === 1 ? '' : 's'}</h2>{matches.map((match, index) => <div className="match-card" key={`${match.other_user_id}-${match.requested_figure_id}-${match.offered_figure_id}-${index}`}><strong>{match.display_name}</strong><p>You want <b>{match.requested_name}</b></p><p>They want <b>{match.offered_name}</b></p><button onClick={() => startTrade(match)}>Discuss this trade</button></div>)}{!profile.discoverable && <p>Choose a display name and enable messages to see matches.</p>}{profile.discoverable && !matches.length && <p>No reciprocal matches yet. Keep your ISO/DISO and trade lists updated.</p>}</article>
      <article className="seller-panel"><span className="eyebrow">Inbox</span><h2>{threads.length} conversation{threads.length === 1 ? '' : 's'}</h2>{threads.map((thread) => <button className={`thread-card ${active?.id === thread.id ? 'active' : ''}`} key={thread.id} onClick={() => openThread(thread)}><strong>{threadTitle(thread)}</strong><small>{thread.status} · {new Date(thread.updated_at).toLocaleDateString()}</small></button>)}{!threads.length && <p>Your private conversations will appear here.</p>}</article>
      <article className="seller-panel chat-panel"><span className="eyebrow">Private conversation</span>{active ? <><h2>{threadTitle(active)}</h2><div className="message-list">{messages.map((message) => <div className={`trade-message ${message.sender_id === userId ? 'mine' : ''}`} key={message.id}><p>{message.body}</p><small>{new Date(message.created_at).toLocaleString()}</small></div>)}{!messages.length && <p>Introduce yourself. Never share passwords, verification codes, or sensitive payment information.</p>}</div><form className="message-form" onSubmit={send}><textarea maxLength="2000" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message..." disabled={['closed', 'declined'].includes(active.status)} /><button className="primary-button" disabled={!body.trim() || ['closed', 'declined'].includes(active.status)}>Send</button></form><div className="conversation-actions">{active.status === 'pending' && <button onClick={() => updateStatus('active')}>Accept discussion</button>}<button onClick={() => updateStatus('closed')}>Close</button><button onClick={report}>Report</button><button onClick={block}>Block</button></div></> : <div className="empty-panel"><h3>Select a conversation</h3><p>Direct messages and proposed trades stay private to the two collectors.</p></div>}</article>
    </section>
  </main>
}
