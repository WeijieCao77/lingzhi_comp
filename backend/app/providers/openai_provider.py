"""OpenAI 标准接口适配器。

用官方 openai SDK；配 OPENAI_BASE_URL 即可兼容任何 OpenAI 兼容端点。
"""
from __future__ import annotations
from typing import List, Dict
from .base import LLMProvider
from .. import config


class OpenAIProvider(LLMProvider):
    name = "openai"

    def __init__(self):
        from openai import OpenAI
        kwargs = {"api_key": config.OPENAI_API_KEY}
        if config.OPENAI_BASE_URL:
            kwargs["base_url"] = config.OPENAI_BASE_URL
        self.client = OpenAI(**kwargs)
        self.model = config.OPENAI_MODEL

    def complete(self, system: str, messages: List[Dict], max_tokens: int = 800,
                 json_mode: bool = False) -> str:
        msgs = [{"role": "system", "content": system}] + messages
        kwargs = {"model": self.model, "messages": msgs, "max_tokens": max_tokens,
                  "temperature": 0.7, "timeout": 25}
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        resp = self.client.chat.completions.create(**kwargs)
        return resp.choices[0].message.content or ""
