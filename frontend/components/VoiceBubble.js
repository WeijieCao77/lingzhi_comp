"use client";
import { useRef, useState } from "react";

// 语音气泡：播放 + 时长 + 转文字（点开看转写）。
export default function VoiceBubble({ url, durationMs, text, mine = true }) {
  const [show, setShow] = useState(false);
  const audioRef = useRef(null);
  const secs = Math.max(1, Math.round((durationMs || 0) / 1000));
  return (
    <div className={"bubble " + (mine ? "me" : "them")} style={{ minWidth: 120 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span onClick={() => audioRef.current && audioRef.current.play()}
          style={{ cursor: "pointer", fontSize: 14 }} title="播放">▶</span>
        <span style={{ flex: 1, letterSpacing: 1 }}>语音 {secs}″</span>
        <span onClick={() => setShow((s) => !s)}
          style={{ cursor: "pointer", fontSize: 11, opacity: 0.75, textDecoration: "underline" }}>转文字</span>
        <audio ref={audioRef} src={url} preload="none" />
      </div>
      {show && <div style={{ marginTop: 7, fontSize: 14, opacity: 0.92 }}>{text}</div>}
    </div>
  );
}
