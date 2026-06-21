// 纯语音消息录音 · MediaRecorder。start() → 控制器 {stop, cancel}。
export function recordSupported() {
  return (
    typeof navigator !== "undefined" &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
    typeof window !== "undefined" &&
    !!window.MediaRecorder
  );
}

export async function startRecording() {
  if (!recordSupported()) throw new Error("recording-unsupported");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  const started = Date.now();
  rec.start();
  const cleanup = () => stream.getTracks().forEach((t) => t.stop());
  return {
    stop: () =>
      new Promise((resolve) => {
        rec.onstop = () => {
          cleanup();
          resolve({
            blob: new Blob(chunks, { type: mime || "audio/webm" }),
            durationMs: Date.now() - started,
          });
        };
        try {
          rec.stop();
        } catch {
          cleanup();
          resolve({ blob: new Blob(chunks), durationMs: Date.now() - started });
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
