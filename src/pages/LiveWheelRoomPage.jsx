import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { WheelDisplay } from '../components/LiveWheel'
import LiveWheelChat from '../components/LiveWheelChat'
import './LiveWheelRoomPage.css'

export default function LiveWheelRoomPage({roomCode}){
 const [room,setRoom]=useState(null),[status,setStatus]=useState('Joining live room...')
 const code=useMemo(()=>String(roomCode||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,24),[roomCode])
 useEffect(()=>{let mounted=true;async function load(){const {data,error}=await supabase.from('live_wheel_rooms').select('id,room_code,title,prize,eligibility,entries,rotation,winner,draw_status,draw_sequence,is_live,started_at,updated_at').eq('room_code',code).eq('is_live',true).maybeSingle();if(!mounted)return;if(error||!data)setStatus('This live wheel is unavailable or has ended.');else{setRoom(data);setStatus('')}}load();const channel=supabase.channel(`live-wheel:${code}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'live_wheel_rooms',filter:`room_code=eq.${code}`},payload=>{if(!mounted)return;if(!payload.new.is_live){setRoom(null);setStatus('This live wheel has ended.')}else setRoom(payload.new)}).subscribe();return()=>{mounted=false;supabase.removeChannel(channel)}},[code])
 if(!room)return <main className="live-viewer-page"><section className="live-viewer-empty"><strong>Collector Vault Live</strong><h1>{status}</h1><a href="#about">Explore Collector Vault</a></section></main>
 const spinning=room.draw_status==='spinning'
 return <main className="live-viewer-page"><header className="live-viewer-header"><a href="#about">Collector Vault</a><span><i/>LIVE</span></header><section className="live-viewer-intro"><p>Live giveaway wheel</p><h1>{room.title}</h1><div><strong>Prize: {room.prize}</strong><span>{room.eligibility}</span></div></section><section className="live-viewer-layout"><div className="live-wheel-column"><WheelDisplay entries={room.entries||[]} rotation={Number(room.rotation||0)} spinning={spinning} winner={room.winner} interactive={false}/><footer className="live-viewer-footer"><span>{(room.entries||[]).length} entrants</span><span>{spinning?'Drawing now...':room.winner?'Winner selected':'Waiting for the host'}</span></footer></div><LiveWheelChat roomId={room.id} roomCode={room.room_code}/></section></main>
}
