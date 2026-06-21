"use client";
import { useState } from "react";
import { api } from "../lib/api";

// 情绪星座 · 把你每一个"此刻"沉淀成天上的星。
// 设计：星图上只放星星（越新越大越亮、最近的会呼吸，不画连线避免交叉杂乱）；
// 下方一条横向时间带表达先后（左→右=早→近），点选与星图联动。
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
  const [report, setReport] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportErr, setReportErr] = useState("");
  const cur = sel >= 0 ? entries[sel] : null;
  const n = entries.length;

  const genReport = async () => {
    if (reporting || n < 2) return;
    setReporting(true); setReportErr("");
    try {
      // 只发情绪摘要（不含你写的原话）
      const r = await api.report(entries.map((e) => ({ label: e.label, valence: e.valence, arousal: e.arousal, t: e.t })));
      setReport((r.report || "").trim());
    } catch {
      setReportErr("生成失败，请重试");
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>我的情绪星座</div>
          <div className="muted" style={{ fontSize: 12 }}>已记录 {n} 个此刻</div>
        </div>

        {n === 0 ? (
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

              {/* 历史星点：越新越大越亮，最近的会呼吸；不画连线 */}
              {entries.map((e, i) => {
                const recency = n > 1 ? i / (n - 1) : 1;   // 0 最早 .. 1 最近
                const last = i === n - 1;
                const isSel = i === sel;
                const r = (2 + recency * 2.6) * (isSel ? 1.2 : 1);
                const op = 0.4 + recency * 0.6;
                const cx = xOf(e.valence), cy = yOf(e.arousal);
                return (
                  <g key={i} onClick={() => setSel(i)} style={{ cursor: "pointer" }}>
                    {isSel && <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="#fff" strokeWidth="1" opacity="0.85" />}
                    <circle cx={cx} cy={cy} r={r} fill={e.color || "#b3a8ff"} opacity={op} filter={last ? "url(#cglow)" : undefined}>
                      {last && <animate attributeName="opacity" values="1;0.5;1" dur="2.4s" repeatCount="indefinite" />}
                    </circle>
                  </g>
                );
              })}
            </svg>

            {/* 时间带：左→右 = 早→近，点选与星图联动 */}
            <div style={{ marginTop: 12 }}>
              <div className="muted" style={{ fontSize: 11, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                <span>最早</span><span>时间线 · 点圆点看那一刻</span><span>最近</span>
              </div>
              <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4 }}>
                {entries.map((e, i) => {
                  const isSel = i === sel;
                  return (
                    <button key={i} onClick={() => setSel(i)} title={`${fmt(e.t)} · ${e.label}`}
                      style={{
                        flex: "none", width: isSel ? 18 : 13, height: isSel ? 18 : 13, borderRadius: "50%",
                        background: e.color || "#b3a8ff", padding: 0, cursor: "pointer", transition: ".15s",
                        border: isSel ? "2px solid #fff" : "1px solid rgba(255,255,255,0.18)",
                        opacity: isSel ? 1 : 0.6, alignSelf: "center",
                      }} />
                  );
                })}
              </div>
            </div>

            <div className="muted center" style={{ fontSize: 13, margin: "12px 6px 0", lineHeight: 1.6 }}>{insight(entries)}</div>

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

            {/* 情绪小结（AI，只发情绪摘要，不含原话） */}
            {n >= 2 && (
              <div style={{ marginTop: 14 }}>
                {!report ? (
                  <button className="btn" style={{ width: "100%" }} onClick={genReport} disabled={reporting}>
                    {reporting ? <span className="spin" /> : "✨ 生成这段时间的情绪小结"}
                  </button>
                ) : (
                  <div style={{ padding: "14px 16px", borderRadius: 14, background: "color-mix(in srgb, var(--accent) 10%, rgba(10,8,30,0.4))", border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))" }}>
                    <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>✨ 你的情绪小结</div>
                    <div style={{ fontSize: 14.5, lineHeight: 1.8 }}>{report}</div>
                    <button className="btn" style={{ marginTop: 10, fontSize: 13, padding: "6px 12px" }} onClick={genReport} disabled={reporting}>
                      {reporting ? <span className="spin" /> : "重新生成"}
                    </button>
                  </div>
                )}
                {reportErr && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{reportErr}</div>}
                <div className="muted center" style={{ fontSize: 11, marginTop: 8 }}>小结只根据你的情绪走势生成，不会用到你写的原话</div>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onBack}>← 返回</button>
        {n > 0 && (
          <button className="btn" onClick={() => { if (confirm("清空你的情绪星座？此操作不可恢复。")) onClear(); }}>清空</button>
        )}
      </div>
    </div>
  );
}
