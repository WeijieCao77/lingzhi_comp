"""LLM Provider 抽象基类。

两套标准接口（OpenAI / Anthropic）各实现一个子类，只需实现 complete()。
情绪分析与聊天的高层逻辑放在基类，保证两套接口行为一致。
"""
from __future__ import annotations
from typing import List, Dict
from ..emotion import Emotion, ANALYZE_SYSTEM, build_user_prompt, parse_emotion


class LLMProvider:
    name = "base"

    def complete(self, system: str, messages: List[Dict], max_tokens: int = 800,
                 json_mode: bool = False) -> str:
        """子类实现：给定 system + 多轮 messages，返回模型文本。"""
        raise NotImplementedError

    # ---- 高层能力（两套接口共用）----
    def analyze_emotion(self, text: str) -> Emotion:
        raw = self.complete(
            ANALYZE_SYSTEM,
            [{"role": "user", "content": build_user_prompt(text)}],
            max_tokens=500,
            json_mode=True,
        )
        return parse_emotion(raw, source=self.name)

    def chat(self, system: str, messages: List[Dict], max_tokens: int = 320) -> str:
        return self.complete(system, messages, max_tokens=max_tokens).strip()
