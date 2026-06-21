"use client";
import { useState, useEffect, useRef } from "react";
import { api } from "../lib/api";
import EmotionCard from "../components/EmotionCard";
import StarMap from "../components/StarMap";
import ChatScreen from "../components/ChatScreen";
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
  const stopDict = useRef(null);

  useEffect(() => { api.personas().then((d) => setPool(d.personas || [])).catch(() => {}); }, []);
  useEffect(() => { setHistory(getEntries()); setMounted(true); }, []);

  const reset = () => {
    setStep("input"); setText(""); setEmotion(null); setKindred(null); setIdentity(null);
    setMatched(null); setMatching(false); setMatchDone(false);
    setSafety(null); setMode("resonance"); setStyle(null);
    setChatMode("solo"); setRoom(null);
  };
  const remix = () => { setMatched(null); setMatching(false); setMatchDone(false); };

  const doRoom = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api.createRoom(emotion, style, identity);
      setRoom(res); setStep("room");
    } catch {
      alert("进入小屋失败，请重试");
    } finally { setBusy(false); }
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
        addEntry(res.emotion, res.user_identity); setHistory(getEntries());   // 沉淀进情绪星座
      }
    } catch {
      alert("分析失败，请确认后端已启动");
    } finally { setBusy(false); }
  };

  const adjustStar = (valence, arousal) => setEmotion((e) => (e ? { ...e, valence, arousal } : e));
  const clearHistory = () => { clearEntries(); setHistory([]); };

  const doMatch = async () => {
    if (busy) return;
    setBusy(true); setMatched(null); setMatchDone(false); setMatching(true);
    try {
      const res = await api.match(emotion, mode, style, identity);
      setMatched(res);   // 传给 StarMap 后触发"靠近"动画
    } catch {
      alert("匹配失败，请重试"); setMatching(false);
    } finally { setBusy(false); }
  };

  const partnerColor = matched
    ? (pool.find((p) => p.anon_name === matched.partner.anon_name)?.color || "#b98cff")
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
            {!matching && !matchDone && (
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
              <button className="btn btn-primary" style={{ width: "100%", marginTop: 14 }} onClick={() => setStep("chat")}>
                进入聊天室 →
              </button>
              <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={remix}>换一种方式，重新找</button>
            </div>
          )}

          {!matching && !matchDone && (
            <button className="btn" onClick={reset}>← 重新写一段心情</button>
          )}
        </div>
      )}

      {step === "chat" && matched && (
        <ChatScreen conv={matched} onRestart={reset} />
      )}

      {step === "room" && room && (
        <RoomScreen room={room} onLeave={reset} />
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
