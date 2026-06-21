"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "../lib/api";
import ChatComposer from "./ChatComposer";
import VoiceBubble from "./VoiceBubble";

// 同频小屋：你 + 3~4 个情绪相近的匿名人。室友由后端 AI 各自按人设回应。支持文字 / 听写 / 纯语音。
export default function RoomScreen({ room, onLeave }) {
  const me = room.user_identity;
  const [msgs, setMsgs] = useState(room.messages || []);
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);

  const deliver = async (displayMsg, aiText) => {
    if (typing) return;
    setMsgs((m) => [...m, displayMsg]);
    setTyping(true);
    try {
      const res = await api.sendRoomMessage(room.room_id, aiText);
      setMsgs((m) => [...m, ...(res.replies || [])]);
    } catch {
      setMsgs((m) => [...m, { sender: "sys", name: "", avatar: "🌙", text: "（信号断了一下…大家还在。）" }]);
    } finally {
      setTyping(false);
    }
  };

  const sendText = (t) => deliver({ sender: "user", name: me.anon_name, avatar: me.avatar, text: t }, t);
  const sendVoice = ({ audioUrl, durationMs, text }) =>
    deliver({ sender: "user", name: me.anon_name, avatar: me.avatar, kind: "voice", audioUrl, durationMs, text }, text);

  return (
    <div className="fade">
      {/* 房间头部：氛围 + 成员 */}
      <div className="card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700 }}>「{room.vibe}」· 此刻聚在这里的人</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>同频小屋 · 共 {(room.members?.length || 0) + 1} 人 · 全程匿名</div>
          </div>
          <button className="btn" style={{ padding: "6px 12px", fontSize: 13 }} onClick={onLeave}>离开</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <span title="你" style={{ fontSize: 20 }}>{me.avatar}</span>
          {room.members?.map((m) => (
            <span key={m.id} title={`${m.anon_name} · ${m.similarity}%`} style={{ fontSize: 20, opacity: 0.9 }}>{m.avatar}</span>
          ))}
        </div>
      </div>

      {/* 消息流 */}
      <div className="card" style={{ minHeight: 340, maxHeight: 460, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {msgs.map((m, i) => {
          const mine = m.sender === "user";
          return (
            <div key={i} style={{ display: "flex", flexDirection: mine ? "row-reverse" : "row", gap: 8, alignItems: "flex-start" }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{m.avatar}</span>
              <div style={{ maxWidth: "74%" }}>
                {!mine && <div className="muted" style={{ fontSize: 11, marginBottom: 3 }}>{m.name}</div>}
                {m.kind === "voice"
                  ? <VoiceBubble url={m.audioUrl} durationMs={m.durationMs} text={m.text} mine={mine} />
                  : <div className={"bubble " + (mine ? "me" : "them")}>{m.text}</div>}
              </div>
            </div>
          );
        })}
        {typing && (
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 22 }}>💬</span>
            <div className="bubble them dots"><span>·</span><span>·</span><span>·</span></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <ChatComposer onSendText={sendText} onSendVoice={sendVoice} placeholder="在小屋里说点什么…" disabled={typing} />
      <div className="muted center" style={{ fontSize: 12, marginTop: 10 }}>
        你是「{me.anon_name}」{me.avatar} · 屋里的人不知道你是谁
      </div>
    </div>
  );
}
