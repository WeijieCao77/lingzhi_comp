"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "../lib/api";

// 匿名对话：对象由后端 AI 按人设+情绪基调扮演。真发真收。
export default function ChatScreen({ conv, onRestart }) {
  const partner = conv.partner;
  const me = conv.user_identity;
  const [msgs, setMsgs] = useState([{ sender: "them", text: conv.opener, name: partner.anon_name }]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);

  const send = async () => {
    const t = text.trim();
    if (!t || typing) return;
    setText("");
    setMsgs((m) => [...m, { sender: "me", text: t, name: me.anon_name }]);
    setTyping(true);
    try {
      const res = await api.sendMessage(conv.conversation_id, t);
      setMsgs((m) => [...m, { sender: "them", text: res.reply.text, name: partner.anon_name }]);
    } catch {
      setMsgs((m) => [...m, { sender: "them", text: "（信号好像断了一下…我还在。）", name: partner.anon_name }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="fade">
      {/* 对象头部 */}
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 26 }}>{partner.avatar}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{partner.anon_name}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {partner.label} · {partner.similarity}% {conv.mode === "counterbalance" ? "互补" : "同频"}
            {partner.style === "rational" ? " · 想被理清" : partner.style === "empathic" ? " · 想被懂" : ""}
          </div>
        </div>
        <button className="btn" style={{ padding: "6px 12px", fontSize: 13 }} onClick={onRestart}>换一个</button>
      </div>

      {/* 消息流 */}
      <div className="card" style={{ minHeight: 320, maxHeight: 440, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.sender === "me" ? "flex-end" : "flex-start", maxWidth: "82%" }}>
            <div className={"bubble " + (m.sender === "me" ? "me" : "them")}>{m.text}</div>
          </div>
        ))}
        {typing && (
          <div style={{ alignSelf: "flex-start" }}>
            <div className="bubble them dots"><span>·</span><span>·</span><span>·</span></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* 输入 */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input className="input" placeholder={`对 ${partner.anon_name} 说点什么…`} value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button className="btn btn-primary" onClick={send} disabled={typing}>发送</button>
      </div>
      <div className="muted center" style={{ fontSize: 12, marginTop: 10 }}>
        你是「{me.anon_name}」{me.avatar} · 全程匿名，TA 不知道你是谁
      </div>
    </div>
  );
}
