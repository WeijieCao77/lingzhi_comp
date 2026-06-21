"use client";
import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";
import EmotionCard from "../components/EmotionCard";
import StarMap from "../components/StarMap";
import ChatScreen from "../components/ChatScreen";
import RealChatScreen from "../components/RealChatScreen";
import RoomScreen from "../components/RoomScreen";
import SafetyCard from "../components/SafetyCard";
import Constellation from "../components/Constellation";
import { addEntry, getEntries, clearEntries } from "../lib/history";
import { speechSupported, startDictation } from "../lib/speech";

export default function Page() {
  const [step, setStep] = useState("input");   // input | emotion | chat | safety
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [emotion, setEmotion] = useState(null);
  const [kindred, setKindred] = useState(null);
  const [identity, setIdentity] = useState(null);       // 此刻的你：动物形象 + 匿名名
  const [pool, setPool] = useState([]);
  const [mode, setMode] = useState("resonance");        // resonance | counterbalance
  const [style, setStyle] = useState(null);             // null | empathic | rational
  const [matched, setMatched] = useState(null);
  const [matching, setMatching] = useState(false);   // 动画进行中
  const [matchDone, setMatchDone] = useState(false); // 动画结束、可进聊天室
  const [chatMode, setChatMode] = useState("solo");  // solo(一对一) | room(小房间)
  const [room, setRoom] = useState(null);
  const [safety, setSafety] = useState(null);
  const [history, setHistory] = useState([]);           // 情绪星座（本地）
  const [dictating, setDictating] = useState(false);    // 首页听写中
  const [mounted, setMounted] = useState(false);        // 避免 SSR 水合不一致
  const [convMsgs, setConvMsgs] = useState([]);         // 一对一消息（提到页面层，回退不丢）
  const [convCid, setConvCid] = useState(null);
  const [roomMsgs, setRoomMsgs] = useState([]);         // 小屋消息（同上）
  const [roomMsgsId, setRoomMsgsId] = useState(null);
  const [roomReady, setRoomReady] = useState(false);    // 小屋已匹配、待你确认是否进入
  const stopDict = useRef(null);
  const uidRef = useRef(null);                           // 本机匿名 id（真人池用）

  useEffect(() => { api.personas().then((d) => setPool(d.personas || [])).catch(() => {}); }, []);
  useEffect(() => {
    setHistory(getEntries()); setMounted(true);
    let u = null;
    try { u = localStorage.getItem("gravity_uid"); if (!u) { u = "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("gravity_uid", u); } } catch {}
    uidRef.current = u || ("u_" + Date.now());
  }, []);

  const reset = () => {
    setStep("input"); setText(""); setEmotion(null); setKindred(null); setIdentity(null);
    setMatched(null); setMatching(false); setMatchDone(false);
    setSafety(null); setMode("resonance"); setStyle(null);
    setChatMode("solo"); setRoom(null); setRoomReady(false);
    setConvMsgs([]); setConvCid(null); setRoomMsgs([]); setRoomMsgsId(null);
    try { api.liveLeave(uidRef.current); } catch {}      // 退出真人池
  };
  const remix = () => {
    setMatched(null); setMatching(false); setMatchDone(false);
    try { api.liveLeave(uidRef.current); } catch {}
  };

  // 进聊天室：真人 → 真人聊天室；否则 AI（首次进入才铺开场白，回退再进保留对话）
  const enterChat = () => {
    if (matched?.isReal) { setStep("livechat"); return; }
    if (matched && convCid !== matched.conversation_id) {
      setConvMsgs([{ sender: "them", text: matched.opener, name: matched.partner.anon_name }]);
      setConvCid(matched.conversation_id);
    }
    setStep("chat");
  };

  // 组小屋：先匹配出一个小屋（揭晓标签+人数），由你决定进不进——不再直接塞进群
  const doRoom = async () => {
    if (busy) return;
    setBusy(true); setRoomReady(false);
    try {
      const res = await api.createRoom(emotion, style, identity);
      setRoom(res); setMatched(null); setRoomReady(true);
    } catch {
      alert("召集小屋失败，请重试");
    } finally { setBusy(false); }
  };

  // 真正进小屋：首次进入才铺暖场消息；从「返回」再进则保留
  const enterRoom = () => {
    if (room && roomMsgsId !== room.room_id) {
      setRoomMsgs(room.messages || []);
      setRoomMsgsId(room.room_id);
    }
    setStep("room");
  };

  const stopDictation = () => { if (stopDict.current) { stopDict.current(); stopDict.current = null; } setDictating(false); };
  const toggleDictation = () => {
    if (dictating) { stopDictation(); return; }
    setDictating(true);
    stopDict.current = startDictation({
      onText: (t) => setText(t),
      onEnd: () => { setDictating(false); stopDict.current = null; },
      onError: () => { setDictating(false); stopDict.current = null; },
    });
  };

  const analyze = async () => {
    const t = text.trim();
    if (!t || busy) return;
    stopDictation();
    setBusy(true);
    try {
      const res = await api.analyze(t);
      if (res.safety) { setSafety(res.safety); setStep("safety"); }
      else {
        setEmotion(res.emotion); setKindred(res.kindred_count);
        setIdentity(res.user_identity || null); setMatched(null); setStep("emotion");
        addEntry(res.emotion, res.user_identity, t); setHistory(getEntries());   // 沉淀进情绪星座（含原话）
      }
    } catch {
      alert("分析失败，请确认后端已启动");
    } finally { setBusy(false); }
  };

  const adjustStar = (valence, arousal) => setEmotion((e) => (e ? { ...e, valence, arousal } : e));
  const clearHistory = () => { clearEntries(); setHistory([]); };

  const doMatch = async () => {
    if (busy) return;
    setBusy(true); setMatched(null); setMatchDone(false); setMatching(true); setRoom(null); setRoomReady(false);
    const uid = uidRef.current;
    try {
      // 真人优先：先找真人池；AI 并发跑着做保底（没真人时立刻顶上，不额外等）
      const aiPromise = api.match(emotion, mode, style, identity).catch(() => null);
      let real = null;
      try {
        const j = await api.liveJoin(uid, emotion, "solo", style, identity);
        if (j && j.status === "matched") real = j;
        else {
          for (let i = 0; i < 5 && !real; i++) {              // ~2.5s 等情绪相近的真人
            await new Promise((r) => setTimeout(r, 500));
            const s = await api.liveStatus(uid).catch(() => null);
            if (s && s.status === "matched") real = s;
          }
        }
      } catch {}

      if (real) {
        const pe = real.partner_emotion || [0, 0.5];
        const q = quadCN(pe[0], pe[1]);
        const sim = real.similarity || 90;
        // 注意：前端对真人/AI 一视同仁——文案、字段都和 AI 匹配完全一致，不露任何区别。
        setMatched({
          isReal: true, live_conv_id: real.conversation_id, mode,
          partner: {
            anon_name: real.partner_identity?.anon_name || "同温层的某人",
            avatar: real.partner_identity?.avatar || "🌙",
            valence: pe[0], arousal: pe[1], color: "#d8a6ff",
            label: QUAD_WORD[q] || "复杂", similarity: sim,
            reason: `你们都站在「${q}」里，${sim}% 同频。`,
          },
        });
      } else {
        try { await api.liveLeave(uid); } catch {}          // 没真人，退出等待池
        const res = await aiPromise;
        if (!res) { alert("匹配失败，请重试"); setMatching(false); return; }
        setMatched({ ...res, isReal: false });
      }
    } catch {
      alert("匹配失败，请重试"); setMatching(false);
    } finally { setBusy(false); }
  };

  const partnerColor = matched
    ? (matched.isReal
        ? (matched.partner.color || "#d8a6ff")
        : (pool.find((p) => p.anon_name === matched.partner.anon_name)?.color || "#b98cff"))
    : null;

  return (
    <div className="wrap">
      <header className="center" style={{ marginBottom: 22 }}>
        <h1 className="title">心引力 · Gravity</h1>
        <p className="muted" style={{ marginTop: 6, fontSize: 14, lineHeight: 1.6 }}>在你最有情绪的那一刻，找到和你处在同一片情绪星空下的人。</p>
      </header>

      {step === "input" && (
        <div className="card fade">
          <div style={{ fontSize: 16, marginBottom: 12 }}>此刻，你心里是什么样的？</div>
          <textarea className="input" rows={5} placeholder="随便写写……今天发生了什么，或者只是一种说不清的感觉。"
            value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") analyze(); }} />
          {mounted && speechSupported() && (
            <button className={"btn iconbtn" + (dictating ? " rec" : "")} style={{ marginTop: 10 }} onClick={toggleDictation}>
              {dictating ? "■ 停止听写" : "🎤 说出来（语音转文字）"}
            </button>
          )}
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={analyze} disabled={busy}>
            {busy ? <span className="spin" /> : "让此刻的我，被读懂 ✦"}
          </button>
          <p className="muted center" style={{ fontSize: 12, marginTop: 12 }}>全程匿名 · 你写下的不会暴露任何身份</p>
          {mounted && history.length > 0 && (
            <button className="btn" style={{ width: "100%", marginTop: 10 }} onClick={() => setStep("constellation")}>
              ✦ 我的情绪星座（{history.length}）
            </button>
          )}
        </div>
      )}

      {step === "emotion" && emotion && (
        <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <EmotionCard emotion={emotion} kindred={kindred} />

          {identity && (
            <div className="center muted" style={{ fontSize: 13, marginTop: -6 }}>
              此刻的你 ——{" "}
              <span style={{ fontSize: 18, verticalAlign: "middle" }}>{identity.avatar}</span>{" "}
              <span style={{ color: "var(--text)", fontWeight: 700 }}>{identity.anon_name}</span>
              <span style={{ opacity: 0.7 }}>，将以这个匿名形象出现</span>
            </div>
          )}

          <div className="card">
            <div style={{ fontSize: 14, marginBottom: 6, textAlign: "center" }} className="muted">
              {matchDone ? "你们的星，在这里相遇了"
                : matching ? (matched ? "正在靠近……" : "正在星海里，寻找和你同频的人……")
                : "你此刻，是情绪星空里的这颗星"}
            </div>
            <StarMap
              user={{ valence: emotion.valence, arousal: emotion.arousal, color: emotion.color }}
              partner={matched ? { valence: matched.partner.valence, arousal: matched.partner.arousal, color: partnerColor, anon_name: matched.partner.anon_name } : null}
              pool={pool}
              similarity={matched?.partner.similarity}
              editable={!matching && !matchDone}
              onUserAdjust={adjustStar}
              onComplete={() => { setMatchDone(true); setMatching(false); }}
            />

            {/* 控件：仅在尚未匹配时显示 */}
            {!matching && !matchDone && !roomReady && (
              <div style={{ marginTop: 14 }}>
                <div className="muted" style={{ fontSize: 13, marginBottom: 7 }}>想怎么聊？</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <Chip on={chatMode === "solo"} onClick={() => setChatMode("solo")}>一对一 · 找一个人</Chip>
                  <Chip on={chatMode === "room"} onClick={() => setChatMode("room")}>小房间 · 一屋同频的人</Chip>
                </div>

                {chatMode === "solo" && (
                  <>
                    <div className="muted" style={{ fontSize: 13, marginBottom: 7 }}>想找一个怎样的人？</div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                      <Chip on={mode === "resonance"} onClick={() => setMode("resonance")}>同频 · 和我一样</Chip>
                      <Chip on={mode === "counterbalance"} onClick={() => setMode("counterbalance")}>牵引 · 轻轻拉我一把</Chip>
                    </div>
                  </>
                )}

                <div className="muted" style={{ fontSize: 13, marginBottom: 7 }}>想被怎样陪着？</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Chip on={style === null} onClick={() => setStyle(null)}>随它</Chip>
                  <Chip on={style === "empathic"} onClick={() => setStyle("empathic")}>想被懂 (F)</Chip>
                  <Chip on={style === "rational"} onClick={() => setStyle("rational")}>想被理清 (T)</Chip>
                </div>

                <button className="btn btn-primary" style={{ width: "100%", marginTop: 16 }}
                  onClick={chatMode === "room" ? doRoom : doMatch} disabled={busy}>
                  {busy ? <span className="spin" /> : chatMode === "room" ? "把同频的人聚到一起 ✦" : "为我找一个同频的人 ✦"}
                </button>
              </div>
            )}
          </div>

          {/* 匹配揭晓：动画结束后 */}
          {matchDone && matched && (
            <div className="card fade" style={{ borderColor: "color-mix(in srgb, " + partnerColor + " 45%, var(--border))" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 30 }}>{matched.partner.avatar}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17 }}>{matched.partner.anon_name}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{matched.partner.reason}</div>
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: "100%", marginTop: 14 }} onClick={enterChat}>
                进入聊天室 →
              </button>
              <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={remix}>换一种方式，重新找</button>
            </div>
          )}

          {/* 小屋揭晓：先看清是个什么样的屋（标签+人数），再决定进不进 */}
          {roomReady && room && (
            <div className="card fade">
              <div className="muted" style={{ fontSize: 13, marginBottom: 8, textAlign: "center" }}>为你召集到一个同频小屋</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 28 }}>🛖</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>「{room.vibe}」· 同频小屋</div>
                  <div className="muted" style={{ fontSize: 13 }}>屋里已有 {room.members?.length || 0} 人，和你情绪相近</div>
                </div>
              </div>
              {(() => {
                const tags = [...new Set((room.members || []).map((m) => m.label).filter(Boolean))].slice(0, 5);
                return tags.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {tags.map((t, i) => <span key={i} className="chip" style={{ padding: "4px 11px", fontSize: 12, cursor: "default" }}>{t}</span>)}
                  </div>
                );
              })()}
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {room.members?.map((m) => (
                  <span key={m.id} title={`${m.anon_name} · ${m.similarity}%`} style={{ fontSize: 22 }}>{m.avatar}</span>
                ))}
              </div>
              <button className="btn btn-primary" style={{ width: "100%", marginTop: 14 }} onClick={enterRoom}>进入小屋 →</button>
              <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={doRoom} disabled={busy}>{busy ? <span className="spin" /> : "换一个小屋"}</button>
            </div>
          )}

          {!matching && (
            <button className="btn" onClick={() => setStep("input")}>← 返回修改（保留刚才写的）</button>
          )}
        </div>
      )}

      {step === "chat" && matched && !matched.isReal && (
        <ChatScreen conv={matched} messages={convMsgs} setMessages={setConvMsgs}
          onBack={() => setStep("emotion")} onRestart={reset} />
      )}

      {step === "livechat" && matched?.isReal && (
        <RealChatScreen convId={matched.live_conv_id} uid={uidRef.current} me={identity}
          partner={matched.partner} onBack={() => setStep("emotion")} onLeave={reset} />
      )}

      {step === "room" && room && (
        <RoomScreen room={room} messages={roomMsgs} setMessages={setRoomMsgs}
          onBack={() => setStep("emotion")} onLeave={reset} />
      )}

      {step === "safety" && safety && (
        <SafetyCard safety={safety} onBack={reset} />
      )}

      {step === "constellation" && (
        <Constellation entries={history} onBack={() => setStep("input")} onClear={clearHistory} />
      )}
    </div>
  );
}

function Chip({ on, onClick, children }) {
  return <span className={"chip" + (on ? " on" : "")} onClick={onClick}>{children}</span>;
}

function quadCN(v, a) {
  if (v >= 0 && a >= 0.5) return "明亮而热烈";
  if (v >= 0 && a < 0.5) return "平静而温柔";
  if (v < 0 && a >= 0.5) return "焦灼而起伏";
  return "低落而安静";
}
const QUAD_WORD = { "明亮而热烈": "明亮", "平静而温柔": "平静", "焦灼而起伏": "焦灼", "低落而安静": "低落" };
