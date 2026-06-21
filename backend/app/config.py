"""集中读取环境变量。两套标准接口的配置都在这里。"""
import os
from dotenv import load_dotenv

load_dotenv()

# anthropic | openai —— 决定主用哪套标准接口
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "anthropic").strip().lower()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-8").strip()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "").strip() or None

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*").strip()


def has_key(provider: str) -> bool:
    return bool(ANTHROPIC_API_KEY) if provider == "anthropic" else bool(OPENAI_API_KEY)
