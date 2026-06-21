"""本地降级分析器：不依赖任何外部 API。

当配置的 LLM 失败/超时/无 key 时启用，保证演示永不翻车（满足"稳定演示/降级"要求）。
用一个轻量情绪词典估计 valence/arousal，聊天用温和的兜底话术。
"""
from __future__ import annotations
import random
from typing import List, Dict
from .base import LLMProvider
from ..emotion import Emotion, color_from

# 词 -> (valence, arousal, 标签)
LEXICON = {
    "开心": (0.8, 0.7, "喜悦"), "高兴": (0.8, 0.7, "喜悦"), "快乐": (0.85, 0.7, "喜悦"),
    "兴奋": (0.7, 0.9, "兴奋"), "期待": (0.5, 0.6, "期待"), "希望": (0.5, 0.5, "期待"),
    "平静": (0.2, 0.2, "平静"), "放松": (0.4, 0.2, "平静"), "还好": (0.1, 0.3, "平静"),
    "累": (-0.4, 0.25, "疲惫"), "疲惫": (-0.4, 0.25, "疲惫"), "倦": (-0.4, 0.25, "疲惫"),
    "难过": (-0.7, 0.35, "难过"), "伤心": (-0.75, 0.4, "难过"), "哭": (-0.7, 0.5, "难过"),
    "孤独": (-0.6, 0.3, "孤独"), "寂寞": (-0.6, 0.3, "孤独"), "一个人": (-0.4, 0.3, "孤独"),
    "焦虑": (-0.5, 0.8, "焦虑"), "紧张": (-0.4, 0.8, "焦虑"), "压力": (-0.5, 0.7, "焦虑"),
    "害怕": (-0.6, 0.75, "恐惧"), "担心": (-0.4, 0.6, "焦虑"),
    "生气": (-0.6, 0.85, "愤怒"), "愤怒": (-0.7, 0.9, "愤怒"), "烦": (-0.5, 0.7, "烦躁"),
    "失落": (-0.6, 0.35, "失落"), "迷茫": (-0.4, 0.45, "迷茫"), "空": (-0.5, 0.3, "空虚"),
    "释然": (0.4, 0.3, "释然"), "感动": (0.6, 0.6, "感动"), "温暖": (0.6, 0.4, "温暖"),
}
HAPPY = {"happy", "good", "great", "excited", "joy", "calm", "relaxed", "hopeful"}
SAD = {"sad", "tired", "lonely", "anxious", "angry", "lost", "empty", "afraid", "stressed"}


class FallbackProvider(LLMProvider):
    name = "fallback"

    def analyze_emotion(self, text: str) -> Emotion:
        t = text.lower()
        hits = [(v, a, lab) for w, (v, a, lab) in LEXICON.items() if w in text]
        for w in HAPPY:
            if w in t:
                hits.append((0.6, 0.5, "积极"))
        for w in SAD:
            if w in t:
                hits.append((-0.6, 0.5, "低落"))
        if hits:
            valence = sum(h[0] for h in hits) / len(hits)
            arousal = sum(h[1] for h in hits) / len(hits)
            label = hits[0][2]
        else:
            valence, arousal, label = 0.0, 0.45, "复杂"
        return Emotion(
            label=label,
            poetic="说不清的一团",
            explanation="此刻的情绪有点说不清，但它被收下了。",
            intensity=min(1.0, 0.4 + abs(valence) * 0.5),
            valence=valence,
            arousal=arousal,
            keywords=[label],
            color=color_from(valence, arousal),
            source="fallback",
        )

    def chat(self, system: str, messages: List[Dict], max_tokens: int = 320) -> str:
        last = messages[-1]["content"] if messages else ""
        replies = [
            "我也在这儿。慢慢说，不急。",
            "嗯，我好像有点懂那种感觉。",
            "谢谢你愿意说出来。此刻你不是一个人。",
            "我也有过类似的时候。要不要再多讲一点？",
        ]
        # 不依赖随机库的可复现性也无所谓，这是兜底
        return random.choice(replies)
