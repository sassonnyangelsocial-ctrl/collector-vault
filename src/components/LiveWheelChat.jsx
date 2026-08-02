import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import './LiveWheelChat.css'

const participantKey='collector-vault-live-chat-participant'
const nameKey='collector-vault-live-chat-name'

function participantId(){
 const saved=sessionStorage.getItem(participantKey)
 if(saved)return saved
 const next=crypto.randomUUID()
 sessionStorage.setItem(participantKey,next)
 return next
}

export default function LiveWheelChat({roomId,roomCode}){
 const [messages,setMessages]=useState([]),[name,setName]=useState(()=>sessionStorage.getItem(nameKey)||''),[body,setBody]=useState(''),[notice,setNotice]=useState(''),[sending,setSending]=useState(false),[userId,setUserId]=useState(null)
 const endRef=useRef(null),lastSentRef=useRef(0)

 useEffect(()=>{supabase.auth.getSession().then(({data})=>{const user=data.session?.user;setUserId(user?.id||null);if(user&&!sessionStorage.getItem(nameKey)){const suggested=user.user_metadata?.display_name||user.email?.split('@')[0]||'';setName(suggested.slice(0,32))}})},[])
 useEffect(()=>{let mounted=true;async function load(){const {data,error}=await supabase.from('live_wheel_chat_messages').select('id,participant_id,display_name,body,created_at').eq('room_id',roomId).order('created_at',{ascending:true}).limit(100);if(!mounted)return;if(error)setNotice('Chat is unavailable right now.');else setMessages(data||[])}load();const channel=supabase.channel(`live-wheel-chat:${roomCode}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'live_wheel_chat_messages',filter:`room_id=eq.${roomId}`},({new:message})=>{if(!mounted)return;setMessages(old=>old.some(item=>item.id===message.id)?old:[...old,message].slice(-100))}).subscribe();return()=>{mounted=false;supabase.removeChannel(channel)}},[roomId,roomCode])
 useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'})},[messages])

 async function send(event){
  event.preventDefault()
  const displayName=name.trim(),message=body.trim(),now=Date.now()
  if(displayName.length<2)return setNotice('Enter a display name with at least 2 characters.')
  if(!message)return
  if(now-lastSentRef.current<1500)return setNotice('Please wait a moment before sending another message.')
  setSending(true);setNotice('');sessionStorage.setItem(nameKey,displayName);lastSentRef.current=now
  const {error}=await supabase.from('live_wheel_chat_messages').insert({room_id:roomId,sender_user_id:userId,participant_id:participantId(),display_name:displayName,body:message})
  setSending(false)
  if(error){setNotice('Message could not be sent. Please try again.');return}
  setBody('')
 }

 return <aside className="live-chat" aria-label="Live chat"><header><div><span className="live-chat-dot"/><strong>Live chat</strong></div><small>{messages.length} message{messages.length===1?'':'s'}</small></header><div className="live-chat-messages" aria-live="polite">{messages.map(message=><article className="live-chat-message" key={message.id}><div><strong>{message.display_name}</strong><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</time></div><p>{message.body}</p></article>)}{!messages.length&&<div className="live-chat-empty"><strong>Chat is open</strong><p>Say hello to the collectors joining this wheel.</p></div>}<div ref={endRef}/></div><form onSubmit={send}><label>Display name<input required minLength="2" maxLength="32" value={name} onChange={event=>setName(event.target.value)} placeholder="Collector name"/></label><label>Message<textarea required maxLength="300" rows="2" value={body} onChange={event=>setBody(event.target.value)} placeholder="Join the conversation…"/></label><div><small>{body.length}/300</small><button disabled={sending||!body.trim()}>{sending?'Sending…':'Send'}</button></div>{notice&&<p className="live-chat-notice" role="status">{notice}</p>}</form></aside>
}
