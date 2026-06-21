"""情绪模型：把一段文字解析成一个结构化、可计算的情绪。

核心思想：情绪不是一个标签，而是一个「位置」——
用 valence(正负向) × arousal(唤醒度) 把情绪放进一个连续空间，
匹配就是在这个空间里找最近的人。这让匹配真正由情绪驱动（而非装饰）。
"""
from __future__ import annotations
import json
import re
import colorsys
from typing import List
from pydantic import BaseModel, Field


class Emotion(BaseModel):
    label: str = "复杂"                       # 一个情绪词
    poetic: str = ""                          # 一句诗意比喻
    explanation: str = ""                     # 温柔的复述
    intensity: float = 0.5                    # 0~1 强度
    valence: float = 0.0                      # -1(负) ~ 1(正)
    arousal: float = 0.5                      # 0(平静) ~ 1(激烈)
    keywords: List[str] = Field(default_factory=list)
    color: str = "#8b91a1"
    source: str = "fallback"                  # openai | anthropic | fallback

    @property
    def vector(self) -> tuple[float, float]:
        return (self.valence, self.arousal)


# 情绪空间的四个象限——用于解释「为什么匹配」
def quadrant(valence: float, arousal: float) -> str:
    if valence >= 0 and arousal >= 0.5:
        return "明亮而热烈"
    if valence >= 0 and arousal < 0.5:
        return "平静而温柔"
    if valence < 0 and arousal >= 0.5:
        return "焦灼而起伏"
    return "低落而安静"


def _clamp(x: float, lo: float, hi: float) -> float:
    try:
        x = float(x)
    except (TypeError, ValueError):
        return (lo + hi) / 2
    return max(lo, min(hi, x))


def color_from(valence: float, arousal: float) -> str:
    """情绪 → 颜色。负向偏冷（蓝紫），正向偏暖（金粉）；越激烈越饱和。"""
    # hue: valence -1 → 230°(冷蓝) , +1 → 35°(暖金)
    hue = (230 - (valence + 1) / 2 * 195) / 360.0
    sat = 0.42 + arousal * 0.40
    light = _clamp(0.58 + valence * 0.06, 0.4, 0.7)
    r, g, b = colorsys.hls_to_rgb(hue, light, sat)
    return "#{:02x}{:02x}{:02x}".format(int(r * 255), int(g * 255), int(b * 255))


ANALYZE_SYSTEM = (
    "你是一个细腻、准确、克制的情绪分析器。读用户写下的一段当下心情，"
    "只输出严格的 JSON（不要任何多余文字、不要代码块围栏），字段如下：\n"
    "- label: 一个中文情绪词（如 焦虑/孤独/平静/喜悦/疲惫/愤怒/期待/失落/释然 等）\n"
    "- poetic: 一句很短的诗意比喻来形容这种情绪（<=12字，不要引号）\n"
    "- explanation: 用温柔的一两句话复述你感受到的情绪，像一个懂他的人，不评判不说教\n"
    "- intensity: 0到1的小数，情绪强度\n"
    "- valence: -1到1的小数，情绪正负向（-1极负，0中性，1极正）\n"
    "- arousal: 0到1的小数，情绪激活/唤醒度（0极平静，1极激烈）\n"
    "- keywords: 2到4个关键词组成的字符串数组\n"
    "只输出 JSON 对象。"
)


def build_user_prompt(text: str) -> str:
    return f"这是用户此刻写下的心情：\n\n{text.strip()}\n\n请分析并输出 JSON。"


REPORT_SYSTEM = (
    "你在一个情绪社交产品里，看到一个用户最近几次记录下的情绪轨迹（按时间从早到晚）。"
    "请用 2 到 4 句温柔、具体、不煽情的话，写一段「情绪小结」，像一个一直在的、懂 TA 的朋友在回顾："
    "点出 TA 从最早到最近的变化——是慢慢变明亮、沉了一些、起伏之后归于平静、还是一直很稳；"
    "结尾给一句温柔的小话。用「你」称呼，自然口语，别客套、别列点、别说教、别自报是AI。只输出这段话本身。"
)


def parse_emotion(raw: str, source: str) -> Emotion:
    """从 LLM 原始输出里稳健地抽出 JSON 并构造 Emotion。失败抛异常，交由上层降级。"""
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if not m:
        raise ValueError("no json in model output")
    data = json.loads(m.group(0))
    valence = _clamp(data.get("valence", 0), -1, 1)
    arousal = _clamp(data.get("arousal", 0.5), 0, 1)
    kws = data.get("keywords") or []
    if isinstance(kws, str):
        kws = [k.strip() for k in re.split(r"[,，、]", kws) if k.strip()]
    return Emotion(
        label=str(data.get("label") or "复杂").strip()[:12],
        poetic=str(data.get("poetic") or "").strip()[:20],
        explanation=str(data.get("explanation") or "").strip(),
        intensity=_clamp(data.get("intensity", 0.5), 0, 1),
        valence=valence,
        arousal=arousal,
        keywords=[str(k).strip()[:10] for k in kws][:4],
        color=color_from(valence, arousal),
        source=source,
    )
