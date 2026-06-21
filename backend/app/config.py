"""集中读取环境变量。两套标准接口的配置都在这里。"""
import os
from dotenv import load_dotenv

load_dotenv()

# anthropic | openai —— 决定主用哪套标准接口
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "anthropic").strip().lower()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-8").strip()
# 情绪分析用更快的模型（它在"点分析→出结果"的关键路径上，用户在等）；
# 聊天仍用上面的 ANTHROPIC_MODEL（要人味，且有"正在输入"动画掩盖延迟）。
ANTHROPIC_ANALYZE_MODEL = os.getenv("ANTHROPIC_ANALYZE_MODEL", "claude-sonnet-4-6").strip()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
OPENAI_ANALYZE_MODEL = os.getenv("OPENAI_ANALYZE_MODEL", OPENAI_MODEL).strip()  # gpt-4o-mini 本就快
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "").strip() or None
# 语音转文字（纯语音消息）用的模型——只走 OpenAI（Anthropic 无 STT）
OPENAI_TRANSCRIBE_MODEL = os.getenv("OPENAI_TRANSCRIBE_MODEL", "whisper-1").strip()

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*").strip()


def has_key(provider: str) -> bool:
    return bool(ANTHROPIC_API_KEY) if provider == "anthropic" else bool(OPENAI_API_KEY)
