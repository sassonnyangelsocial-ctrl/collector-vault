import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import "./LiveStreamStage.css";

const rtcConfig = { iceServers: [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
] };
const wheelColors = ["#f26b8a", "#ffbd69", "#7dcfb6", "#7aa5ff", "#c99bff", "#ff8f70", "#6fd0e8", "#f6d365"];
const makeRoomCode = () => crypto.randomUUID().replaceAll("-", "").slice(0, 12);
const cleanEntries = (text) => [...new Set(text.split("\n").map((name) => name.trim()).filter(Boolean))].slice(0, 100);
function secureIndex(length) {
  const values = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / length) * length;
  do crypto.getRandomValues(values); while (values[0] >= limit);
  return values[0] % length;
}

export default function LiveStreamStage({ userId }) {
  const [rooms, setRooms] = useState([]);
  const [room, setRoom] = useState(null);
  const [title, setTitle] = useState("Collector Vault live giveaway");
  const [entriesText, setEntriesText] = useState("");
  const [prize, setPrize] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [displayName, setDisplayName] = useState("Collector");
  const [notice, setNotice] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [wheelActivity, setWheelActivity] = useState("");
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const localStream = useRef(null);
  const channel = useRef(null);
  const peers = useRef(new Map());
  const participantId = useRef(crypto.randomUUID());
  const isHost = room?.host_user_id === userId;
  const entries = Array.isArray(room?.entries) ? room.entries : [];
  const wheelGradient = entries.length
    ? "conic-gradient(" + entries.map((_, index) => {
      const start = index * 360 / entries.length;
      const end = (index + 1) * 360 / entries.length;
      return wheelColors[index % wheelColors.length] + " " + start + "deg " + end + "deg";
    }).join(",") + ")"
    : "#eadde2";

  useEffect(() => {
    loadRooms();
    supabase.from("profiles").select("display_name,username").eq("id", userId)
      .maybeSingle().then(({ data }) => setDisplayName(data?.display_name || data?.username || "Collector"));
  }, [userId]);

  useEffect(() => {
    if (!room) return undefined;
    setEntriesText((room.entries || []).join("\n"));
    setPrize(room.prize || "");
    window.location.hash = "live-wheel/" + room.room_code;
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
      .on("broadcast", { event: "wheel-shuffle" }, () => showWheelActivity("The host securely shuffled the entrants."))
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

  useEffect(() => {
    const code = window.location.hash.match(/^#live-wheel\/([a-z0-9]{8,24})$/)?.[1];
    if (!code || room) return;
    supabase.from("live_wheel_rooms").select("*").eq("room_code", code).eq("is_live", true)
      .maybeSingle().then(({ data }) => {
        if (data) setRoom(data);
      });
  }, [room]);

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
  async function saveWheelSetup() {
    const cleaned = cleanEntries(entriesText);
    const { error } = await supabase.from("live_wheel_rooms").update({
      entries: cleaned,
      prize: prize.trim() || "Live giveaway",
      winner: "",
      draw_status: "ready",
    }).eq("id", room.id);
    if (error) setNotice(error.message);
    else {
      setRoom((current) => ({ ...current, entries: cleaned, prize: prize.trim() || "Live giveaway", winner: "", draw_status: "ready" }));
      setNotice("Wheel setup shared with every viewer.");
    }
  }
  function showWheelActivity(message) {
    setWheelActivity(message);
    window.setTimeout(() => setWheelActivity(""), 3500);
  }
  async function shuffleWheel() {
    if (!isHost || entries.length < 2 || room.draw_status === "spinning") return;
    const shuffled = [...entries];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = secureIndex(index + 1);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    const { error } = await supabase.from("live_wheel_rooms").update({
      entries: shuffled,
      winner: "",
      draw_status: "ready",
    }).eq("id", room.id);
    if (error) return setNotice(error.message);
    setEntriesText(shuffled.join("\n"));
    setRoom((current) => ({ ...current, entries: shuffled, winner: "", draw_status: "ready" }));
    showWheelActivity("Entrants securely shuffled and shared live.");
    await channel.current?.send({ type: "broadcast", event: "wheel-shuffle", payload: { room_id: room.id } });
  }
  async function spinWheel() {
    if (!isHost || entries.length < 2 || room.draw_status === "spinning") return;
    const selectedIndex = secureIndex(entries.length);
    const selected = entries[selectedIndex];
    const currentRotation = Number(room.rotation || 0);
    const slice = 360 / entries.length;
    const target = 360 - (selectedIndex * slice + slice / 2);
    const nextRotation = currentRotation + 1800 + ((target - (currentRotation % 360) + 360) % 360);
    const sequence = Number(room.draw_sequence || 0) + 1;
    const { error } = await supabase.from("live_wheel_rooms").update({
      rotation: nextRotation,
      winner: "",
      draw_status: "spinning",
      draw_sequence: sequence,
    }).eq("id", room.id);
    if (error) return setNotice(error.message);
    setRoom((current) => ({ ...current, rotation: nextRotation, winner: "", draw_status: "spinning", draw_sequence: sequence }));
    window.setTimeout(async () => {
      const { error: winnerError } = await supabase.from("live_wheel_rooms").update({
        winner: selected,
        draw_status: "winner",
      }).eq("id", room.id);
      if (winnerError) setNotice(winnerError.message);
      else setRoom((current) => ({ ...current, winner: selected, draw_status: "winner" }));
    }, 4700);
  }
  async function copyInviteLink() {
    const url = window.location.origin + "/#live-wheel/" + room.room_code;
    await navigator.clipboard.writeText(url);
    setNotice("Invite link copied. Send it to your viewers.");
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
    window.location.hash = "";
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
        <div className="live-main-column">
          <article className="video-stage">
            {isHost ? <video ref={localVideo} autoPlay muted playsInline/> : <video ref={remoteVideo} autoPlay playsInline/>}
            {room.stream_status !== "live" && <div className="video-placeholder"><span>📹</span><strong>{isHost ? "Start your camera when ready" : "The host has not started video yet"}</strong></div>}
            {isHost && <div className="stream-controls">
              {room.stream_status === "live" ? <button className="stop-live" onClick={stopStream}>Stop camera & mic</button> : <button className="go-live" onClick={startStream}>Start camera & mic</button>}
              <button onClick={copyInviteLink}>Copy invite link</button>
              <button onClick={endRoom}>End room</button>
            </div>}
            {!isHost && <button className="leave-room" onClick={() => { setRoom(null); window.location.hash = ""; }}>Leave room</button>}
          </article>
          <article className="shared-wheel-stage">
            <div className="shared-wheel-copy"><span className="eyebrow">Live giveaway wheel</span><h2>{room.prize || "Live giveaway"}</h2><p>{entries.length} entrants · {room.draw_status === "spinning" ? "Selecting a winner…" : "Everyone sees this wheel update live"}</p></div>
            <div className="shared-wheel-wrap">
              <div className="shared-wheel-pointer"/>
              <div className="shared-prize-wheel" style={{ background: wheelGradient, transform: "rotate(" + Number(room.rotation || 0) + "deg)" }}>
                {entries.map((name, index) => <span key={name + "-" + index} style={{ transform: "rotate(" + (index * 360 / entries.length + 180 / entries.length) + "deg)" }}><b>{name}</b></span>)}
              </div>
              <div className="shared-wheel-hub">{room.draw_status === "spinning" ? "…" : "LIVE"}</div>
            </div>
            {wheelActivity && <div className="wheel-live-activity" role="status">{wheelActivity}</div>}
            {room.winner && <div className="shared-winner"><small>Selected winner</small><strong>{room.winner}</strong></div>}
            {isHost && <div className="shared-wheel-host-controls">
              <label>Prize<input value={prize} onChange={(event) => setPrize(event.target.value)} maxLength="500"/></label>
              <label>Entrants — one unique name per line<textarea value={entriesText} onChange={(event) => setEntriesText(event.target.value)} rows="7"/></label>
              <div><button onClick={saveWheelSetup}>Share wheel setup</button><button onClick={shuffleWheel} disabled={entries.length < 2 || room.draw_status === "spinning"}>Secure shuffle</button><button className="primary-button" onClick={spinWheel} disabled={entries.length < 2 || room.draw_status === "spinning"}>{room.draw_status === "spinning" ? "Spinning…" : "Spin live wheel"}</button></div>
            </div>}
            {!isHost && <div className="viewer-wheel-controls" aria-label="Host-only wheel controls"><button disabled>Secure shuffle · host only</button><button disabled>Spin wheel · host only</button></div>}
            {!isHost && !entries.length && <p className="chat-empty">Waiting for the host to add entrants.</p>}
          </article>
        </div>
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
