"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "../lib/api";
import ChatComposer from "./ChatComposer";

// 真人聊天室：对面是另一个真实在线的人（情绪相近被配到一起）。
// 轮询收发，没有 AI 参与。语音/听写都转成文字发给对方。
export default function RealChatScreen({ convId, uid, me, partner, onBack, onLeave }) {
  const [msgs, setMsgs] = useState([]);
  const [ended, setEnded] = useState(false);
  const cursorRef = useRef(0);
  const seenRef = useRef(new Set());
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, ended]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await api.livePoll(convId, cursorRef.current);
        if (!alive) return;
        if (r.messages && r.messages.length) {
          const fresh = r.messages.filter((x) => !seenRef.current.has(x.id));
          fresh.forEach((x) => seenRef.current.add(x.id));
          cursorRef.current = Math.max(cursorRef.current, ...r.messages.map((x) => x.id));
          if (fresh.length) {
            setMsgs((m) => [...m, ...fresh.map((x) => ({ id: x.id, mine: x.sender === uid, name: x.name, avatar: x.avatar, text: x.text }))]);
          }
        }
        if (r.ended) setEnded(true);
      } catch {}
    };
    tick();
    const h = setInterval(tick, 1500);
    return () => { alive = false; clearInterval(h); };
  }, [convId, uid]);

  const send = async (t) => {
    const text = (t || "").trim();
    if (!text || ended) return;
    try {
      const r = await api.liveSend(convId, uid, text);
      if (r && r.message && !seenRef.current.has(r.message.id)) {
        seenRef.current.add(r.message.id);
        cursorRef.current = Math.max(cursorRef.current, r.message.id);
        setMsgs((m) => [...m, { id: r.message.id, mine: true, name: me.anon_name, avatar: me.avatar, text }]);
      }
    } catch {}
  };

  return (
    <div className="fade">
      {/* 对象头部 */}
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, marginBottom: 12 }}>
        <button className="btn" style={{ padding: "6px 11px", fontSize: 15 }} title="返回情绪页" onClick={onBack}>←</button>
        <div style={{ fontSize: 26 }}>{partner.avatar}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>
            {partner.anon_name}
            <span style={{ fontSize: 11, marginLeft: 8, padding: "2px 8px", borderRadius: 999, background: "color-mix(in srgb, var(--accent) 30%, transparent)", fontWeight: 700 }}>真人在线</span>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>{partner.similarity}% 同频 · 此刻和你在线</div>
        </div>
        <button className="btn" style={{ padding: "6px 12px", fontSize: 13 }} onClick={onLeave}>离开</button>
      </div>

      {/* 消息流 */}
      <div className="card" style={{ minHeight: 320, maxHeight: 440, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.length === 0 && !ended && (
          <div className="muted center" style={{ margin: "auto", fontSize: 13, padding: 20 }}>你们刚被同一片情绪连到一起 —— 说句话，打个招呼吧。</div>
        )}
        {msgs.map((m, i) => (
          <div key={m.id ?? i} style={{ alignSelf: m.mine ? "flex-end" : "flex-start", maxWidth: "82%" }}>
            <div className={"bubble " + (m.mine ? "me" : "them")}>{m.text}</div>
          </div>
        ))}
        {ended && <div className="muted center" style={{ fontSize: 12, marginTop: 6 }}>对方已离开。你可以返回，再找一个同频的人。</div>}
        <div ref={endRef} />
      </div>

      <ChatComposer onSendText={send} onSendVoice={({ text }) => send(text)} placeholder={`对 ${partner.anon_name} 说点什么…`} disabled={ended} />
      <div className="muted center" style={{ fontSize: 12, marginTop: 10 }}>
        你是「{me.anon_name}」{me.avatar} · 这是一个真实的人，全程匿名
      </div>
    </div>
  );
}
