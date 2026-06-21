"""Provider 工厂 + 弹性降级。

get_provider() 按 LLM_PROVIDER 返回主用接口，并用 ResilientProvider 包一层：
任何异常都自动回退本地分析器，保证演示永不翻车。
"""
from __future__ import annotations
import logging
from typing import List, Dict
from .base import LLMProvider
from .fallback import FallbackProvider
from .. import config

log = logging.getLogger("resonance.providers")


def _build(provider_name: str) -> LLMProvider:
    if provider_name == "openai":
        from .openai_provider import OpenAIProvider
        return OpenAIProvider()
    from .anthropic_provider import AnthropicProvider
    return AnthropicProvider()


class ResilientProvider:
    """主接口失败时自动降级到本地，并记录实际生效来源。"""

    def __init__(self, primary_name: str):
        self.primary_name = primary_name
        self.fallback = FallbackProvider()
        self._primary: LLMProvider | None = None
        if config.has_key(primary_name):
            try:
                self._primary = _build(primary_name)
            except Exception as e:  # SDK 初始化失败也降级
                log.warning("provider init failed (%s): %s", primary_name, e)

    @property
    def active_name(self) -> str:
        return self.primary_name if self._primary else "fallback"

    def analyze_emotion(self, text: str):
        if self._primary:
            try:
                return self._primary.analyze_emotion(text)
            except Exception as e:
                log.warning("analyze failed on %s, degrading: %s", self.primary_name, e)
        return self.fallback.analyze_emotion(text)

    def chat(self, system: str, messages: List[Dict], max_tokens: int = 320) -> str:
        if self._primary:
            try:
                return self._primary.chat(system, messages, max_tokens=max_tokens)
            except Exception as e:
                log.warning("chat failed on %s, degrading: %s", self.primary_name, e)
        return self.fallback.chat(system, messages, max_tokens=max_tokens)

    def reflect(self, summary_text: str):
        """情绪小结：主接口失败/无 key 时返回 None，由上层用本地模板兜底。"""
        if self._primary:
            try:
                return self._primary.reflect(summary_text)
            except Exception as e:
                log.warning("reflect failed on %s: %s", self.primary_name, e)
        return None


_instance: ResilientProvider | None = None


def get_provider() -> ResilientProvider:
    global _instance
    if _instance is None:
        _instance = ResilientProvider(config.LLM_PROVIDER)
    return _instance
