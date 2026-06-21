// 语音转文字（即时听写）· 浏览器原生 Web Speech API。
// Chrome/Edge 支持；不支持时优雅隐藏入口。
export function speechSupported() {
  if (typeof window === "undefined") return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

// 开始听写：onText(实时文本) 持续回调；返回 stop()。
export function startDictation({ onText, onEnd, onError } = {}) {
  const SR =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!SR) {
    onError && onError("unsupported");
    return () => {};
  }
  const rec = new SR();
  rec.lang = "zh-CN";
  rec.interimResults = true;
  rec.continuous = true;
  let finalText = "";
  rec.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    onText && onText((finalText + interim).trim());
  };
  rec.onerror = (e) => onError && onError(e.error || "error");
  rec.onend = () => onEnd && onEnd(finalText.trim());
  try {
    rec.start();
  } catch {}
  return () => {
    try {
      rec.stop();
    } catch {}
  };
}
