// 情绪星座 · 本地沉淀（localStorage，纯本地、匿名、不上传，重部署也不丢）。
const KEY = "gravity_constellation_v1";
const MAX = 60;

export function addEntry(emotion, identity) {
  if (typeof window === "undefined" || !emotion) return;
  try {
    const list = getEntries();
    list.push({
      t: Date.now(),
      label: emotion.label || "复杂",
      poetic: emotion.poetic || "",
      valence: emotion.valence,
      arousal: emotion.arousal,
      color: emotion.color || "#b3a8ff",
      keywords: emotion.keywords || [],
      avatar: (identity && identity.avatar) || "",
      anon_name: (identity && identity.anon_name) || "",
    });
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {}
}

export function getEntries() {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function clearEntries() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
