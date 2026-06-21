"use client";
import { useRef, useState } from "react";
import { api } from "../lib/api";
import { speechSupported, startDictation } from "../lib/speech";
import { recordSupported, startRecording } from "../lib/recorder";

// 仿微信输入：键盘 ⇄ 语音。
// 键盘模式：文字输入 + 🎙听写(Web Speech 即时转文字) + 发送。
// 语音模式：按住说话 → 录音 → Whisper 转写 → 作为语音气泡发出。
export default function ChatComposer({ onSendText, onSendVoice, placeholder = "说点什么…", disabled }) {
  const [mode, setMode] = useState("text"); // text | voice
  const [text, setText] = useState("");
  const [dictating, setDictating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busyVoice, setBusyVoice] = useState(false);
  const [note, setNote] = useState("");
  const stopDict = useRef(null);
  const recRef = useRef(null);

  const canDictate = speechSupported();
  const canRecord = recordSupported();

  const stopDictation = () => {
    if (stopDict.current) { stopDict.current(); stopDict.current = null; }
    setDictating(false);
  };

  const sendText = () => {
    const t = text.trim();
    if (!t || disabled) return;
    stopDictation();
    setText("");
    onSendText(t);
  };

  const toggleDictation = () => {
    if (dictating) { stopDictation(); return; }
    setNote("");
    setDictating(true);
    stopDict.current = startDictation({
      onText: (t) => setText(t),
      onEnd: () => { setDictating(false); stopDict.current = null; },
      onError: () => { setDictating(false); stopDict.current = null; setNote("听写暂不可用，请直接打字"); },
    });
  };

  const startHold = async (e) => {
    if (disabled || busyVoice) return;
    setNote("");
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    try {
      recRef.current = await startRecording();
      setRecording(true);
    } catch {
      setNote("无法使用麦克风（请允许权限）");
    }
  };

  const endHold = async () => {
    const ctrl = recRef.current;
    recRef.current = null;
    if (!ctrl) return;
    setRecording(false);
    setBusyVoice(true);
    let res;
    try { res = await ctrl.stop(); } catch { setBusyVoice(false); return; }
    if (!res || res.durationMs < 700) { setBusyVoice(false); setNote("说话时间太短"); return; }
    let txt = "";
    try { const r = await api.transcribe(res.blob); txt = (r.text || "").trim(); } catch { txt = ""; }
    setBusyVoice(false);
    if (!txt) { setNote("语音转写暂不可用，请改用文字"); return; }
    onSendVoice({ audioUrl: URL.createObjectURL(res.blob), durationMs: res.durationMs, text: txt });
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        {canRecord && (
          <button className="btn iconbtn" title={mode === "text" ? "切到语音" : "切到键盘"}
            onClick={() => { setNote(""); stopDictation(); setMode(mode === "text" ? "voice" : "text"); }}>
            {mode === "text" ? "🎙" : "⌨️"}
          </button>
        )}

        {mode === "text" ? (
          <>
            <input className="input" placeholder={placeholder} value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }} />
            {canDictate && (
              <button className={"btn iconbtn" + (dictating ? " rec" : "")} title="按一下开始/停止听写"
                onClick={toggleDictation}>{dictating ? "■" : "🎤"}</button>
            )}
            <button className="btn btn-primary" onClick={sendText} disabled={disabled}>发送</button>
          </>
        ) : (
          <button
            className={"btn holdtalk" + (recording ? " rec" : "")}
            style={{ flex: 1 }}
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerCancel={endHold}
            disabled={disabled || busyVoice}>
            {busyVoice ? <span className="spin" /> : recording ? "● 录音中…松开发送" : "按住 说话"}
          </button>
        )}
      </div>
      {note && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{note}</div>}
    </div>
  );
}
