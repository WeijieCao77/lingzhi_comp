"use client";
import { useEffect, useRef, useState } from "react";

// 情绪星空：每个人是一颗星，位置由情绪(valence×arousal)决定——所以情绪相近的星，天然靠得近。
// 匹配时：你和对象那两颗星变亮、脱离星层、慢慢靠近，相触一刻"匹配完成"。
// 把"匹配由情绪驱动"变成一场看得见的星空相遇。

const W = 340, H = 300, PAD = 36;
const xOf = (v) => PAD + ((v + 1) / 2) * (W - 2 * PAD);
const yOf = (a) => (H - PAD) - a * (H - 2 * PAD);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function sparkle(r) {
  return `M0,${-r * 3} L${r * 0.5},${-r * 0.5} L${r * 3},0 L${r * 0.5},${r * 0.5} L0,${r * 3} L${-r * 0.5},${r * 0.5} L${-r * 3},0 L${-r * 0.5},${-r * 0.5} Z`;
}

export default function StarMap({ user, partner, similarity, pool = [], onComplete }) {
  const [t, setT] = useState(0);
  const raf = useRef();
  const called = useRef(false);
  const DUR = 2600;

  useEffect(() => {
    if (!partner) { setT(0); called.current = false; return; }
    let start = null;
    called.current = false;
    const finish = () => { if (!called.current) { called.current = true; setT(1); onComplete && onComplete(); } };
    const tick = (now) => {
      if (start == null) start = now;
      const p = Math.min(1, (now - start) / DUR);
      setT(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else finish();
    };
    raf.current = requestAnimationFrame(tick);
    // 兜底：rAF 在后台标签会被节流/暂停，这个超时确保流程一定走到"匹配完成"，绝不卡死
    const fallback = setTimeout(finish, DUR + 1200);
    return () => { raf.current && cancelAnimationFrame(raf.current); clearTimeout(fallback); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner]);

  if (!user) return null;
  const u0 = [xOf(user.valence), yOf(user.arousal)];
  const matching = !!partner;
  let uPos = u0;
  let pPos = partner ? [xOf(partner.valence), yOf(partner.arousal)] : null;
  let othersOp = 0.55, scale = 1, touch = 0;

  if (matching) {
    const rise = Math.min(1, t / 0.16);
    const ap = ease(Math.max(0, Math.min(1, (t - 0.16) / (0.74 - 0.16))));
    touch = Math.max(0, Math.min(1, (t - 0.74) / 0.26));
    const mid = [(u0[0] + pPos[0]) / 2, (u0[1] + pPos[1]) / 2];
    uPos = [lerp(u0[0], mid[0], ap), lerp(u0[1], mid[1], ap)];
    pPos = [lerp(pPos[0], mid[0], ap), lerp(pPos[1], mid[1], ap)];
    othersOp = lerp(0.55, 0.08, rise);
    scale = lerp(1, 1.6, rise);
  }
  const mid = pPos ? [(uPos[0] + pPos[0]) / 2, (uPos[1] + pPos[1]) / 2] : null;

  const uColor = user.color || "#b3a8ff";
  const pColor = (partner && partner.color) || "#d8a6ff";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 380, display: "block", margin: "0 auto" }}>
      <defs>
        <filter id="glow" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="neb" cx="50%" cy="42%" r="75%">
          <stop offset="0%" stopColor="rgba(140,100,230,0.26)" />
          <stop offset="55%" stopColor="rgba(70,80,190,0.12)" />
          <stop offset="100%" stopColor="rgba(10,8,30,0)" />
        </radialGradient>
      </defs>
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="16" fill="url(#neb)" stroke="rgba(150,140,235,0.12)" />

      {/* 四象限：valence(横) × arousal(纵) */}
      <line x1={xOf(0)} y1={PAD - 8} x2={xOf(0)} y2={H - PAD + 8} stroke="rgba(165,155,240,0.16)" strokeDasharray="2 6" />
      <line x1={PAD - 8} y1={yOf(0.5)} x2={W - PAD + 8} y2={yOf(0.5)} stroke="rgba(165,155,240,0.16)" strokeDasharray="2 6" />
      <text x={PAD - 4} y={17} fill="rgba(214,208,255,0.78)" fontSize="11">焦灼而起伏</text>
      <text x={W - PAD + 4} y={17} fill="rgba(214,208,255,0.78)" fontSize="11" textAnchor="end">明亮而热烈</text>
      <text x={PAD - 4} y={H - 8} fill="rgba(214,208,255,0.78)" fontSize="11">低落而安静</text>
      <text x={W - PAD + 4} y={H - 8} fill="rgba(214,208,255,0.78)" fontSize="11" textAnchor="end">平静而温柔</text>

      {/* 星层：池子里的人 */}
      {pool.map((p, i) => (
        <circle key={i} cx={xOf(p.valence)} cy={yOf(p.arousal)} r={1.6 + (i % 3) * 0.5}
          fill="#fff" opacity={othersOp * (0.45 + (i % 4) * 0.13)} />
      ))}

      {/* 靠近时的连线 */}
      {matching && t > 0.16 && touch < 0.5 && (
        <line x1={uPos[0]} y1={uPos[1]} x2={pPos[0]} y2={pPos[1]}
          stroke={uColor} strokeWidth="1" opacity="0.5" strokeDasharray="3 3" />
      )}

      {/* 相触一刻：光环 + 匹配完成 */}
      {touch > 0 && mid && (
        <g>
          <circle cx={mid[0]} cy={mid[1]} r={6 + touch * 66} fill="none" stroke="#fff" strokeWidth="2" opacity={(1 - touch) * 0.85} />
          <circle cx={mid[0]} cy={mid[1]} r={7 + touch * 16} fill="#fff" opacity={Math.min(1, touch * 2.2) * (1 - touch * 0.25)} filter="url(#glow)" />
          <text x={W / 2} y={36} textAnchor="middle" fill="#fff" fontSize="16" fontWeight="800" opacity={touch}>✦ 匹配完成 ✦</text>
          {typeof similarity === "number" && (
            <text x={W / 2} y={56} textAnchor="middle" fill="#d8d2ff" fontSize="12" opacity={touch}>{similarity}% 同频</text>
          )}
        </g>
      )}

      {/* 对象星 */}
      {partner && touch < 0.55 && (
        <g transform={`translate(${pPos[0]},${pPos[1]}) scale(${scale})`} filter="url(#glow)">
          <path d={sparkle(3.2)} fill={pColor} opacity="0.9" />
          <circle r="2.6" fill="#fff" />
        </g>
      )}
      {/* 你 */}
      {touch < 0.55 && (
        <g transform={`translate(${uPos[0]},${uPos[1]}) scale(${scale})`} filter="url(#glow)">
          <path d={sparkle(3.6)} fill={uColor} opacity="0.95" />
          <circle r="2.8" fill="#fff" />
        </g>
      )}
      {!matching && (
        <text x={u0[0]} y={u0[1] + 17} fill="#ece9fb" fontSize="10" textAnchor="middle" fontWeight="700">你</text>
      )}
    </svg>
  );
}
