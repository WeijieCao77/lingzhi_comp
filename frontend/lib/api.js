const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function post(path, body) {
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}
async function get(path) {
  const r = await fetch(BASE + path);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}
async function postForm(path, formData) {
  const r = await fetch(BASE + path, { method: "POST", body: formData });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

export const api = {
  health: () => get("/api/health"),
  personas: () => get("/api/personas"),
  analyze: (text) => post("/api/analyze", { text }),
  match: (emotion, mode, prefer_style, user_identity) =>
    post("/api/match", { emotion, mode, prefer_style, user_identity }),
  sendMessage: (cid, text) => post(`/api/conversations/${cid}/messages`, { text }),
  createRoom: (emotion, prefer_style, user_identity) =>
    post("/api/room", { emotion, prefer_style, user_identity, size: 6 }),
  sendRoomMessage: (rid, text) => post(`/api/rooms/${rid}/messages`, { text }),
  report: (entries) => post("/api/report", { entries }),   // 只发情绪摘要，不含原话
  transcribe: (blob, filename = "voice.webm") => {
    const fd = new FormData();
    fd.append("audio", blob, filename);
    return postForm("/api/transcribe", fd);
  },
};
