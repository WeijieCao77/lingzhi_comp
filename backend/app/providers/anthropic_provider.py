"""Anthropic 标准接口适配器。用官方 anthropic SDK。"""
from __future__ import annotations
from typing import List, Dict
from .base import LLMProvider
from .. import config


class AnthropicProvider(LLMProvider):
    name = "anthropic"

    def __init__(self):
        import anthropic
        self.client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
        self.model = config.ANTHROPIC_MODEL

    def complete(self, system: str, messages: List[Dict], max_tokens: int = 800,
                 json_mode: bool = False) -> str:
        sys_prompt = system
        if json_mode:
            sys_prompt += "\n\n务必只返回一个合法 JSON 对象，不要任何解释或代码块围栏。"
        # 注意：claude-opus-4-8 等新模型已弃用 temperature 参数，不再传入（用默认采样）。
        resp = self.client.messages.create(
            model=self.model,
            system=sys_prompt,
            messages=messages,
            max_tokens=max_tokens,
            timeout=25,
        )
        parts = [b.text for b in resp.content if getattr(b, "type", "") == "text"]
        return "".join(parts)
