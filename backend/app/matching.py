"""匹配引擎：在情绪空间 (valence × arousal) 里做匹配。

两种模式（同一套向量，两种距离目标——计算极轻量）：
- resonance(同频)  : 找情绪最接近你的人 —— 被理解、被共鸣
- counterbalance(互补): 找一个更稳、更能接住你的人 —— 被安放、被托住

返回相似度% + 匹配理由，让"为什么匹配"看得见（反转扣分项③为亮点）。
"""
from __future__ import annotations
import math
from typing import List, Optional, Tuple
from .emotion import Emotion, quadrant

MAX_DIST = math.sqrt(2 ** 2 + 1 ** 2)  # valence∈[-1,1], arousal∈[0,1] 的最大距离


def _dist(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def similarity(a: Tuple[float, float], b: Tuple[float, float]) -> int:
    return max(0, min(100, round((1 - _dist(a, b) / MAX_DIST) * 100)))


def _anchor_point(e: Emotion) -> Tuple[float, float]:
    """互补目标点：把你的情绪拉向更平静、略微更正向的位置——一个能托住你的人。"""
    v = max(-1.0, min(1.0, e.valence * 0.35 + 0.25))
    a = max(0.05, e.arousal * 0.45)
    return (v, a)


def match(user: Emotion, pool: List[dict], mode: str = "resonance",
          prefer_style: Optional[str] = None,
          exclude_id: Optional[str] = None) -> Optional[dict]:
    """在 pool 中选出最合适的一个。

    mode: resonance(同频) | counterbalance(互补) —— 情绪距离维度
    prefer_style: empathic(想被懂/F) | rational(想被理清/T) | None —— 陪伴方式维度
                  作为软权重叠加在情绪距离上（不喜欢的风格加一点距离惩罚），
                  情绪相近仍是主导，风格只是微调。
    """
    candidates = [p for p in pool if p.get("id") != exclude_id]
    if not candidates:
        return None

    if mode == "counterbalance":
        target = _anchor_point(user)
    else:
        target = user.vector

    def cost(p: dict) -> float:
        d = _dist((p["valence"], p["arousal"]), target)
        if prefer_style and p.get("style") and p["style"] != prefer_style:
            d += 0.45  # 软惩罚：风格不符则稍微靠后，但不否决情绪相近的人
        return d

    best = min(candidates, key=cost)
    sim = similarity(user.vector, (best["valence"], best["arousal"]))
    uq = quadrant(*user.vector)
    pq = quadrant(best["valence"], best["arousal"])

    if mode == "counterbalance":
        reason = f"TA此刻在「{pq}」里，比你稳一些——也许刚好能接住你。"
    else:
        if uq == pq:
            reason = f"你们都站在「{uq}」里，{sim}% 同频。"
        else:
            reason = f"TA和你很近——「{pq}」遇上「{uq}」，{sim}% 共振。"

    result = dict(best)
    result["similarity"] = sim
    result["reason"] = reason
    result["mode"] = mode
    result["user_quadrant"] = uq
    result["partner_quadrant"] = pq
    return result


def nearest(user: Emotion, pool: List[dict], n: int, exclude_id: Optional[str] = None) -> List[dict]:
    """找情绪最接近的 N 个人（用于'同频小房间'）。返回带 similarity 的副本，按近到远排序。"""
    cands = [p for p in pool if p.get("id") != exclude_id]
    cands.sort(key=lambda p: _dist((p["valence"], p["arousal"]), user.vector))
    out = []
    for p in cands[:n]:
        r = dict(p)
        r["similarity"] = similarity(user.vector, (p["valence"], p["arousal"]))
        out.append(r)
    return out
