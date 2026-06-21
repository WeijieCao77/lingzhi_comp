"use client";

// 情绪卡片：把识别出的情绪呈现成一团会发光的颜色 + 标签/强度/关键词。
export default function EmotionCard({ emotion, kindred }) {
  if (!emotion) return null;
  const c = emotion.color || "#8b91a1";
  return (
    <div className="card fade" style={{ borderColor: "color-mix(in srgb, " + c + " 40%, var(--border))" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
          background: `radial-gradient(circle at 35% 30%, ${c}, color-mix(in srgb, ${c} 30%, #000))`,
          boxShadow: `0 0 26px ${c}aa`,
        }} />
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{emotion.label}</div>
          {emotion.poetic && <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>“{emotion.poetic}”</div>}
        </div>
      </div>

      {emotion.explanation && (
        <p style={{ lineHeight: 1.75, marginTop: 14, marginBottom: 12 }}>{emotion.explanation}</p>
      )}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }} className="muted">
        <Meter label="强度" value={emotion.intensity} color={c} />
        <Meter label="唤醒" value={emotion.arousal} color={c} />
        <span>正负向 {emotion.valence > 0 ? "＋" : emotion.valence < 0 ? "－" : "0"}{Math.abs(emotion.valence).toFixed(1)}</span>
      </div>

      {emotion.keywords?.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {emotion.keywords.map((k, i) => (
            <span key={i} className="chip" style={{ padding: "4px 11px", fontSize: 12, cursor: "default" }}>{k}</span>
          ))}
        </div>
      )}

      {typeof kindred === "number" && kindred > 0 && (
        <div style={{ marginTop: 14, fontSize: 13 }} className="muted">
          此刻有 <b style={{ color: "var(--text)" }}>{kindred}</b> 个人，和你站在相近的情绪里。
        </div>
      )}
    </div>
  );
}

function Meter({ label, value, color }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {label}
      <span style={{ width: 54, height: 6, background: "var(--surface-2)", borderRadius: 99, overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${Math.round((value || 0) * 100)}%`, background: color }} />
      </span>
    </span>
  );
}
