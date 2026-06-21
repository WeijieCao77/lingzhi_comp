// 纯语音消息录音 · MediaRecorder。start() → 控制器 {stop, cancel}。
export function recordSupported() {
  return (
    typeof navigator !== "undefined" &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
    typeof window !== "undefined" &&
    !!window.MediaRecorder
  );
}

// 选一个本浏览器真正支持的录音格式：Chrome→webm，iOS Safari→mp4。
function pickMime() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  for (const t of ["audio/webm", "audio/mp4", "audio/ogg"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export async function startRecording() {
  if (!recordSupported()) throw new Error("recording-unsupported");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  const started = Date.now();
  rec.start();
  const cleanup = () => stream.getTracks().forEach((t) => t.stop());
  const finalType = () => rec.mimeType || mime || "audio/webm";  // 实际用的格式
  return {
    stop: () =>
      new Promise((resolve) => {
        rec.onstop = () => {
          cleanup();
          const type = finalType();
          resolve({ blob: new Blob(chunks, { type }), durationMs: Date.now() - started, mimeType: type });
        };
        try {
          rec.stop();
        } catch {
          cleanup();
          resolve({ blob: new Blob(chunks), durationMs: Date.now() - started, mimeType: finalType() });
        }
      }),
    cancel: () => {
      try {
        rec.stop();
      } catch {}
      cleanup();
    },
  };
}
