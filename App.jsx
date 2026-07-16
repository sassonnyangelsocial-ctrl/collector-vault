import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

export default function App(){
  const [session,setSession]=useState(null)
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)})
    const {data}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s))
    return ()=>data.subscription.unsubscribe()
  },[])
  if(loading) return <div className="center">Opening Collector Vault…</div>
  return session ? <Catalog session={session}/> : <Auth/>
}

function Auth(){
  const [mode,setMode]=useState('signup'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
  async function submit(e){
    e.preventDefault(); setBusy(true); setMessage('')
    const r=mode==='signup'?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password})
    setBusy(false)
    if(r.error)setMessage(r.error.message); else if(mode==='signup')setMessage('Account created. Check your email if confirmation is enabled.')
  }
  return <main className="auth"><section className="brand"><p className="eyebrow">COLLECT • TRACK • TRADE</p><h1>Collector Vault</h1><p>Your Sonny Angel collection, ISO list, duplicates, and trades in one place.</p></section><form className="panel" onSubmit={submit}><h2>{mode==='signup'?'Create your vault':'Welcome back'}</h2><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" minLength="6" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{message&&<p className="message">{message}</p>}<button className="primary" disabled={busy}>{busy?'Please wait…':mode==='signup'?'Create account':'Sign in'}</button><button type="button" className="link" onClick={()=>setMode(mode==='signup'?'login':'signup')}>{mode==='signup'?'Already have an account? Sign in':'Need an account? Sign up'}</button></form></main>
}

function Catalog({session}){
  const [figures,setFigures]=useState([]),[states,setStates]=useState({}),[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[seriesFilter,setSeriesFilter]=useState('all'),[notice,setNotice]=useState('')
  useEffect(()=>{load()},[])
  async function load(){
    const [{data:cats,error:e1},{data:user,error:e2}]=await Promise.all([
      supabase.from('figures').select('id,name,rarity,sort_order,series:series_id(id,name,category,sort_order,brand:brand_id(name))').eq('active',true),
      supabase.from('user_figures').select('*').eq('user_id',session.user.id)
    ])
    if(e1||e2){setNotice((e1||e2).message);return}
    setFigures((cats||[]).sort((a,b)=>(a.series.sort_order-b.series.sort_order)||(a.sort_order-b.sort_order)))
    const map={}; (user||[]).forEach(x=>map[x.figure_id]=x); setStates(map)
  }
  async function toggle(fig,field){
    const cur=states[fig.id]||{owned:false,quantity:0,wishlist:false,for_trade:false,favorite:false}
    const next={...cur,[field]:!cur[field]}
    if(field==='owned')next.quantity=next.owned?Math.max(1,next.quantity||0):0
    const payload={user_id:session.user.id,figure_id:fig.id,owned:next.owned,quantity:next.quantity||0,wishlist:next.wishlist,for_trade:next.for_trade,favorite:next.favorite||false,notes:next.notes||null}
    const {data,error}=await supabase.from('user_figures').upsert(payload,{onConflict:'user_id,figure_id'}).select().single()
    if(error)setNotice(error.message); else setStates(s=>({...s,[fig.id]:data}))
  }
  const seriesNames=[...new Set(figures.map(f=>f.series.name))]
  const visible=useMemo(()=>figures.filter(f=>{
    const st=states[f.id]||{}
    const q=`${f.name} ${f.series.name}`.toLowerCase().includes(query.toLowerCase())
    const fs=seriesFilter==='all'||f.series.name===seriesFilter
    const ok=filter==='all'||(filter==='missing'?!st.owned:filter==='trade'?st.for_trade:filter==='wishlist'?st.wishlist:st.owned)
    return q&&fs&&ok
  }),[figures,states,query,filter,seriesFilter])
  const grouped=visible.reduce((a,f)=>((a[f.series.name]||=[]).push(f),a),{})
  const owned=figures.filter(f=>states[f.id]?.owned).length, pct=figures.length?Math.round(owned/figures.length*100):0
  return <div className="shell">
    <header><div><p className="eyebrow">MY COLLECTION</p><h1>Collector Vault</h1><small>Sonny Angel catalog beta</small></div><button className="signout" onClick={()=>supabase.auth.signOut()}>Sign out</button></header>
    <section className="stats"><Stat v={`${owned}/${figures.length}`} l="Collected"/><Stat v={`${pct}%`} l="Complete"/><Stat v={figures.filter(f=>states[f.id]?.wishlist).length} l="ISO"/><Stat v={figures.filter(f=>states[f.id]?.for_trade).length} l="Trade"/></section>
    <section className="tools"><input placeholder="Search figures or series…" value={query} onChange={e=>setQuery(e.target.value)}/><select value={seriesFilter} onChange={e=>setSeriesFilter(e.target.value)}><option value="all">All series</option>{seriesNames.map(s=><option key={s}>{s}</option>)}</select></section>
    <nav className="tabs">{[['all','All'],['owned','Owned'],['wishlist','ISO'],['trade','Trade'],['missing','Missing']].map(([k,l])=><button key={k} className={filter===k?'active':''} onClick={()=>setFilter(k)}>{l}</button>)}</nav>
    {Object.entries(grouped).map(([name,list])=>{const count=list.filter(f=>states[f.id]?.owned).length;return <section className="series" key={name}><div className="series-title"><div><h2>{name}</h2><p>{list[0].series.category}</p></div><span>{count}/{list.length} owned</span></div><div className="grid">{list.map(f=>{const st=states[f.id]||{};return <article className="card" key={f.id}><div className="art">👼</div><div className="copy"><h3>{f.name}{st.quantity>1?` ×${st.quantity}`:''}</h3><p>{f.rarity}</p></div><div className="actions"><button className={st.owned?'on':''} onClick={()=>toggle(f,'owned')}>✓ Owned</button><button className={st.wishlist?'on':''} onClick={()=>toggle(f,'wishlist')}>♡ ISO</button><button className={st.for_trade?'on':''} onClick={()=>toggle(f,'for_trade')}>⇄ Trade</button></div></article>})}</div></section>})}
    {!visible.length&&<div className="empty">No figures match this view.</div>}
    {notice&&<div className="notice" onClick={()=>setNotice('')}>{notice}</div>}
  </div>
}
function Stat({v,l}){return <div className="stat"><strong>{v}</strong><span>{l}</span></div>}
