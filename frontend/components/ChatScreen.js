"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "../lib/api";
import ChatComposer from "./ChatComposer";
import VoiceBubble from "./VoiceBubble";

// 匿名对话：对象由后端 AI 按人设+情绪基调扮演。真发真收。支持文字 / 听写 / 纯语音。
export default function ChatScreen({ conv, onRestart }) {
  const partner = conv.partner;
  const me = conv.user_identity;
  const [msgs, setMsgs] = useState([{ sender: "them", text: conv.opener, name: partner.anon_name }]);
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);

  // 把一条用户消息(文字气泡或语音气泡)发出，并取回 AI 回复。aiText = 给 AI 的文本(语音则为转写)。
  const deliver = async (displayMsg, aiText) => {
    if (typing) return;
    setMsgs((m) => [...m, displayMsg]);
    setTyping(true);
    try {
      const res = await api.sendMessage(conv.conversation_id, aiText);
      setMsgs((m) => [...m, { sender: "them", text: res.reply.text, name: partner.anon_name }]);
    } catch {
      setMsgs((m) => [...m, { sender: "them", text: "（信号好像断了一下…我还在。）", name: partner.anon_name }]);
    } finally {
      setTyping(false);
    }
  };

  const sendText = (t) => deliver({ sender: "me", text: t, name: me.anon_name }, t);
  const sendVoice = ({ audioUrl, durationMs, text }) =>
    deliver({ sender: "me", kind: "voice", audioUrl, durationMs, text, name: me.anon_name }, text);

  return (
    <div className="fade">
      {/* 对象头部 */}
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 26 }}>{partner.avatar}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{partner.anon_name}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {partner.label} · {partner.similarity}% {conv.mode === "counterbalance" ? "牵引" : "同频"}
            {partner.style === "rational" ? " · 想被理清" : partner.style === "empathic" ? " · 想被懂" : ""}
          </div>
        </div>
        <button className="btn" style={{ padding: "6px 12px", fontSize: 13 }} onClick={onRestart}>换一个</button>
      </div>

      {/* 消息流 */}
      <div className="card" style={{ minHeight: 320, maxHeight: 440, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.sender === "me" ? "flex-end" : "flex-start", maxWidth: "82%" }}>
            {m.kind === "voice"
              ? <VoiceBubble url={m.audioUrl} durationMs={m.durationMs} text={m.text} />
              : <div className={"bubble " + (m.sender === "me" ? "me" : "them")}>{m.text}</div>}
          </div>
        ))}
        {typing && (
          <div style={{ alignSelf: "flex-start" }}>
            <div className="bubble them dots"><span>·</span><span>·</span><span>·</span></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <ChatComposer
        onSendText={sendText}
        onSendVoice={sendVoice}
        placeholder={`对 ${partner.anon_name} 说点什么…`}
        disabled={typing}
      />
      <div className="muted center" style={{ fontSize: 12, marginTop: 10 }}>
        你是「{me.anon_name}」{me.avatar} · 全程匿名，TA 不知道你是谁
      </div>
    </div>
  );
}
