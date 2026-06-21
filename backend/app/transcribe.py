"""语音转文字（纯语音消息）。

只走 OpenAI Whisper —— Anthropic 标准接口没有 STT。
正好让一条语音同时用上 OpenAI（转写）+ Anthropic（对话回复），双接口都真用上了。
无 key 或失败时抛异常，由上层兜底（前端退回文字输入，绝不卡死演示）。
"""
from __future__ import annotations
import io
from . import config


def transcribe_audio(data: bytes, filename: str = "audio.webm") -> str:
    if not config.OPENAI_API_KEY:
        raise RuntimeError("未配置 OPENAI_API_KEY，无法转写语音")
    from openai import OpenAI
    kwargs = {"api_key": config.OPENAI_API_KEY}
    if config.OPENAI_BASE_URL:
        kwargs["base_url"] = config.OPENAI_BASE_URL
    client = OpenAI(**kwargs)

    buf = io.BytesIO(data)
    buf.name = filename  # SDK 靠文件名推断音频格式
    resp = client.audio.transcriptions.create(
        model=config.OPENAI_TRANSCRIBE_MODEL,
        file=buf,
        language="zh",
        timeout=30,
    )
    return (getattr(resp, "text", "") or "").strip()
