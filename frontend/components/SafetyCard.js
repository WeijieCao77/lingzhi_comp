"use client";

// 安全边界：识别到极端负面时，不匹配，温柔地给出陪伴与求助资源。
export default function SafetyCard({ safety, onBack }) {
  return (
    <div className="card fade" style={{ borderColor: "color-mix(in srgb, #7c8cff 45%, var(--border))" }}>
      <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 10 }}>{safety.title}</div>
      <p style={{ lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{safety.message}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "14px 0" }}>
        {safety.resources?.map((r, i) => (
          <div key={i} className="card" style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-2)" }}>
            <div>
              <div style={{ fontWeight: 600 }}>{r.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{r.region}</div>
            </div>
            <div style={{ fontWeight: 700, color: "var(--accent)" }}>{r.contact}</div>
          </div>
        ))}
      </div>
      {safety.gentle && <p className="muted" style={{ lineHeight: 1.7 }}>{safety.gentle}</p>}
      <button className="btn" style={{ marginTop: 8 }} onClick={onBack}>我想再写一段</button>
    </div>
  );
}
