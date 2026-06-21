"use client";
import { useState } from "react";

// 情绪星座 · 把你每一个"此刻"沉淀成天上的星，按时间连成你专属的情绪轨迹。
const W = 340, H = 300, PAD = 36;
const xOf = (v) => PAD + ((v + 1) / 2) * (W - 2 * PAD);
const yOf = (a) => (H - PAD) - a * (H - 2 * PAD);

function quadrant(v, a) {
  if (v >= 0 && a >= 0.5) return "明亮而热烈";
  if (v >= 0 && a < 0.5) return "平静而温柔";
  if (v < 0 && a >= 0.5) return "焦灼而起伏";
  return "低落而安静";
}
function fmt(t) {
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function insight(entries) {
  if (entries.length < 2) return "继续记录，你的每一个此刻都会连成一片星座。";
  const counts = {};
  entries.forEach((e) => { const q = quadrant(e.valence, e.arousal); counts[q] = (counts[q] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const half = Math.floor(entries.length / 2);
  const avg = (arr) => arr.reduce((s, e) => s + e.valence, 0) / (arr.length || 1);
  const trend = avg(entries.slice(half)) - avg(entries.slice(0, half));
  let tail = "";
  if (trend > 0.12) tail = " 而且，你在慢慢往更亮的方向走。";
  else if (trend < -0.12) tail = " 最近沉了一些——记得对自己温柔一点。";
  return `这些日子，你最常停留在「${top}」。${tail}`;
}

export default function Constellation({ entries = [], onBack, onClear }) {
  const [sel, setSel] = useState(entries.length ? entries.length - 1 : -1);
  const pts = entries.map((e) => [xOf(e.valence), yOf(e.arousal)]);
  const line = pts.map((p) => p.join(",")).join(" ");
  const cur = sel >= 0 ? entries[sel] : null;

  return (
    <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>我的情绪星座</div>
          <div className="muted" style={{ fontSize: 12 }}>已记录 {entries.length} 个此刻</div>
        </div>

        {entries.length === 0 ? (
          <div className="muted center" style={{ padding: "30px 0" }}>还没有记录。写下一段心情，你的第一颗星就会亮起来。</div>
        ) : (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 380, display: "block", margin: "4px auto 0" }}>
              <defs>
                <filter id="cglow" x="-120%" y="-120%" width="340%" height="340%">
                  <feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <radialGradient id="cneb" cx="50%" cy="42%" r="75%">
                  <stop offset="0%" stopColor="rgba(140,100,230,0.26)" />
                  <stop offset="55%" stopColor="rgba(70,80,190,0.12)" />
                  <stop offset="100%" stopColor="rgba(10,8,30,0)" />
                </radialGradient>
              </defs>
              <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="16" fill="url(#cneb)" stroke="rgba(150,140,235,0.12)" />
              <line x1={xOf(0)} y1={PAD - 8} x2={xOf(0)} y2={H - PAD + 8} stroke="rgba(165,155,240,0.16)" strokeDasharray="2 6" />
              <line x1={PAD - 8} y1={yOf(0.5)} x2={W - PAD + 8} y2={yOf(0.5)} stroke="rgba(165,155,240,0.16)" strokeDasharray="2 6" />
              <text x={PAD - 4} y={17} fill="rgba(214,208,255,0.7)" fontSize="11">焦灼而起伏</text>
              <text x={W - PAD + 4} y={17} fill="rgba(214,208,255,0.7)" fontSize="11" textAnchor="end">明亮而热烈</text>
              <text x={PAD - 4} y={H - 8} fill="rgba(214,208,255,0.7)" fontSize="11">低落而安静</text>
              <text x={W - PAD + 4} y={H - 8} fill="rgba(214,208,255,0.7)" fontSize="11" textAnchor="end">平静而温柔</text>

              {/* 时间轨迹连线 */}
              {pts.length > 1 && <polyline points={line} fill="none" stroke="rgba(179,168,255,0.35)" strokeWidth="1" />}

              {/* 历史星点 */}
              {entries.map((e, i) => {
                const last = i === entries.length - 1;
                const isSel = i === sel;
                return (
                  <g key={i} onClick={() => setSel(i)} style={{ cursor: "pointer" }}>
                    {isSel && <circle cx={pts[i][0]} cy={pts[i][1]} r="8" fill="none" stroke="#fff" strokeWidth="1" opacity="0.8" />}
                    <circle cx={pts[i][0]} cy={pts[i][1]} r={last ? 4.2 : 3} fill={e.color || "#b3a8ff"}
                      opacity={last ? 1 : 0.85} filter={last ? "url(#cglow)" : undefined}>
                      {last && <animate attributeName="opacity" values="1;0.5;1" dur="2.4s" repeatCount="indefinite" />}
                    </circle>
                  </g>
                );
              })}
            </svg>

            <div className="muted center" style={{ fontSize: 13, margin: "10px 6px 0", lineHeight: 1.6 }}>{insight(entries)}</div>

            {cur && (
              <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 14, background: "rgba(10,8,30,0.4)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{cur.avatar}</span>
                  <span style={{ fontWeight: 700 }}>{cur.label}</span>
                  <span className="muted" style={{ fontSize: 12, marginLeft: "auto" }}>{fmt(cur.t)}</span>
                </div>
                {cur.poetic && <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>“{cur.poetic}”</div>}
                {cur.text && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>你当时写下：</div>
                    <div style={{ fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap", maxHeight: 150, overflowY: "auto" }}>{cur.text}</div>
                  </div>
                )}
                {cur.keywords?.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                    {cur.keywords.map((k, i) => (
                      <span key={i} className="chip" style={{ padding: "3px 10px", fontSize: 11, cursor: "default" }}>{k}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="muted center" style={{ fontSize: 11, marginTop: 10 }}>点任意一颗星，回看那一刻你写下的话 · 仅存于本机，从不上传</div>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onBack}>← 返回</button>
        {entries.length > 0 && (
          <button className="btn" onClick={() => { if (confirm("清空你的情绪星座？此操作不可恢复。")) onClear(); }}>清空</button>
        )}
      </div>
    </div>
  );
}
