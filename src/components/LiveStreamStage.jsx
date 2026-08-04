import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import "./LiveStreamStage.css";

const rtcConfig = { iceServers: [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
] };
const makeRoomCode = () => crypto.randomUUID().replaceAll("-", "").slice(0, 12);

export default function LiveStreamStage({ userId }) {
  const [rooms, setRooms] = useState([]);
  const [room, setRoom] = useState(null);
  const [title, setTitle] = useState("Collector Vault live giveaway");
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [displayName, setDisplayName] = useState("Collector");
  const [notice, setNotice] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const localStream = useRef(null);
  const channel = useRef(null);
  const peers = useRef(new Map());
  const participantId = useRef(crypto.randomUUID());
  const isHost = room?.host_user_id === userId;

  useEffect(() => {
    loadRooms();
    supabase.from("profiles").select("display_name,username").eq("id", userId)
      .maybeSingle().then(({ data }) => setDisplayName(data?.display_name || data?.username || "Collector"));
  }, [userId]);

  useEffect(() => {
    if (!room) return undefined;
    loadMessages(room.id);
    const realtime = supabase
      .channel("live-wheel-" + room.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_wheel_chat_messages", filter: "room_id=eq." + room.id }, ({ new: item }) => {
        setMessages((current) => current.some((message) => message.id === item.id) ? current : [...current, item]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_wheel_rooms", filter: "id=eq." + room.id }, ({ new: updated }) => setRoom(updated))
      .on("broadcast", { event: "webrtc-offer" }, ({ payload }) => receiveOffer(payload))
      .on("broadcast", { event: "webrtc-answer" }, ({ payload }) => receiveAnswer(payload))
      .on("broadcast", { event: "webrtc-ice" }, ({ payload }) => receiveIce(payload))
      .on("presence", { event: "sync" }, () => {
        const people = Object.values(realtime.presenceState()).flat();
        setViewerCount(people.filter((person) => person.role === "viewer").length);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        if (!isHost || !localStream.current) return;
        newPresences.filter((person) => person.role === "viewer")
          .forEach((person) => callViewer(person.participant_id));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await realtime.track({ participant_id: participantId.current, role: isHost ? "host" : "viewer" });
        }
      });
    channel.current = realtime;
    return () => {
      stopConnections();
      supabase.removeChannel(realtime);
      channel.current = null;
    };
  }, [room?.id, isHost]);

  async function loadRooms() {
    const { data } = await supabase.from("live_wheel_rooms").select("*")
      .eq("is_live", true).order("started_at", { ascending: false });
    setRooms(data || []);
  }
  async function loadMessages(id) {
    const { data } = await supabase.from("live_wheel_chat_messages").select("*")
      .eq("room_id", id).order("created_at").limit(100);
    setMessages(data || []);
  }
  async function createRoom() {
    const { data, error } = await supabase.from("live_wheel_rooms").insert({
      host_user_id: userId,
      room_code: makeRoomCode(),
      title: title.trim() || "Collector Vault live giveaway",
      prize: "Live giveaway",
      eligibility: "See host rules",
      entries: [],
    }).select().single();
    if (error) return setNotice(error.message);
    setRoom(data);
    setNotice("Live room created. Start your camera when you are ready.");
    loadRooms();
  }
  function makePeer(target) {
    const peer = new RTCPeerConnection(rtcConfig);
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) channel.current?.send({ type: "broadcast", event: "webrtc-ice", payload: { target, sender: participantId.current, candidate } });
    };
    peer.ontrack = ({ streams }) => {
      if (remoteVideo.current) remoteVideo.current.srcObject = streams[0];
    };
    peer.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(peer.connectionState)) {
        peer.close();
        peers.current.delete(target);
      }
    };
    peers.current.set(target, peer);
    return peer;
  }
  async function callViewer(target) {
    peers.current.get(target)?.close();
    const peer = makePeer(target);
    localStream.current?.getTracks().forEach((track) => peer.addTrack(track, localStream.current));
    await peer.setLocalDescription(await peer.createOffer());
    await channel.current?.send({ type: "broadcast", event: "webrtc-offer", payload: { target, sender: participantId.current, sdp: peer.localDescription } });
  }
  async function receiveOffer(payload) {
    if (payload.target !== participantId.current || isHost) return;
    const peer = makePeer(payload.sender);
    await peer.setRemoteDescription(payload.sdp);
    await peer.setLocalDescription(await peer.createAnswer());
    await channel.current?.send({ type: "broadcast", event: "webrtc-answer", payload: { target: payload.sender, sender: participantId.current, sdp: peer.localDescription } });
  }
  async function receiveAnswer(payload) {
    if (payload.target !== participantId.current || !isHost) return;
    const peer = peers.current.get(payload.sender);
    if (peer) await peer.setRemoteDescription(payload.sdp);
  }
  async function receiveIce(payload) {
    if (payload.target !== participantId.current) return;
    const peer = peers.current.get(payload.sender);
    if (peer && payload.candidate) await peer.addIceCandidate(payload.candidate).catch(() => {});
  }
  async function startStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStream.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;
      await supabase.from("live_wheel_rooms").update({
        stream_status: "live", stream_started_at: new Date().toISOString(), stream_stopped_at: null,
      }).eq("id", room.id);
      setRoom((current) => ({ ...current, stream_status: "live" }));
      Object.values(channel.current?.presenceState() || {}).flat()
        .filter((person) => person.role === "viewer")
        .forEach((person) => callViewer(person.participant_id));
      setNotice("You are live. Viewers can now watch and chat.");
    } catch (error) {
      setNotice(error.name === "NotAllowedError" ? "Camera or microphone permission was denied." : error.message);
    }
  }
  async function stopStream() {
    localStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null;
    if (localVideo.current) localVideo.current.srcObject = null;
    stopConnections();
    await supabase.from("live_wheel_rooms").update({
      stream_status: "offline", stream_stopped_at: new Date().toISOString(),
    }).eq("id", room.id);
    setRoom((current) => ({ ...current, stream_status: "offline" }));
    setNotice("Camera and microphone are off.");
  }
  function stopConnections() {
    peers.current.forEach((peer) => peer.close());
    peers.current.clear();
  }
  async function endRoom() {
    await stopStream();
    await supabase.from("live_wheel_rooms").update({
      is_live: false, draw_status: "ended", ended_at: new Date().toISOString(),
    }).eq("id", room.id);
    setRoom(null);
    setMessages([]);
    loadRooms();
  }
  async function sendMessage(event) {
    event.preventDefault();
    const body = chatText.trim().slice(0, 300);
    if (!body) return;
    const { error } = await supabase.from("live_wheel_chat_messages").insert({
      room_id: room.id, sender_user_id: userId, participant_id: participantId.current,
      display_name: displayName.slice(0, 32), body,
    });
    if (error) setNotice(error.message);
    else setChatText("");
  }

  if (!room) return (
    <section className="live-lobby seller-panel">
      <div className="live-heading">
        <div><span className="eyebrow">Live wheel room</span><h2>Stream your giveaway live</h2><p>Hosts can share camera and microphone while viewers watch the wheel and chat.</p></div>
        <span className="live-pill">BETA</span>
      </div>
      <div className="live-create">
        <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength="160" aria-label="Live room title"/>
        <button className="primary-button" onClick={createRoom}>Create host room</button>
      </div>
      <div className="live-room-list">
        <h3>Rooms live now</h3>
        {rooms.map((item) => <button key={item.id} onClick={() => setRoom(item)}>
          <span className={item.stream_status === "live" ? "live-dot on" : "live-dot"}/>
          <b>{item.title}</b><small>{item.stream_status === "live" ? "Watch live" : "Waiting for host"}</small>
        </button>)}
        {!rooms.length && <p>No live wheel rooms yet.</p>}
      </div>
      {notice && <p className="live-notice">{notice}</p>}
    </section>
  );

  return (
    <section className="live-show-shell">
      <header className="live-show-header">
        <div><span className="eyebrow">Room {room.room_code}</span><h2>{room.title}</h2></div>
        <div className="live-status"><span className={room.stream_status === "live" ? "live-dot on" : "live-dot"}/>{room.stream_status === "live" ? "LIVE" : "OFFLINE"} · {viewerCount} watching</div>
      </header>
      <div className="live-show-grid">
        <article className="video-stage">
          {isHost ? <video ref={localVideo} autoPlay muted playsInline/> : <video ref={remoteVideo} autoPlay playsInline/>}
          {room.stream_status !== "live" && <div className="video-placeholder"><span>📹</span><strong>{isHost ? "Start your camera when ready" : "The host has not started video yet"}</strong></div>}
          {isHost && <div className="stream-controls">
            {room.stream_status === "live" ? <button className="stop-live" onClick={stopStream}>Stop camera & mic</button> : <button className="go-live" onClick={startStream}>Start camera & mic</button>}
            <button onClick={endRoom}>End room</button>
          </div>}
          {!isHost && <button className="leave-room" onClick={() => setRoom(null)}>Leave room</button>}
        </article>
        <aside className="live-chat">
          <div className="chat-title"><b>Live chat</b><span>{messages.length} messages</span></div>
          <div className="chat-feed">
            {messages.map((message) => <div key={message.id}><b>{message.sender_user_id === room.host_user_id ? "HOST · " : ""}{message.display_name}</b><p>{message.body}</p></div>)}
            {!messages.length && <p className="chat-empty">Say hello when the stream begins.</p>}
          </div>
          <form onSubmit={sendMessage}><input value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="Write a message…" maxLength="300"/><button>Send</button></form>
        </aside>
      </div>
      {notice && <p className="live-notice">{notice}</p>}
    </section>
  );
}
