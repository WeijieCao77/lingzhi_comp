"""安全边界：识别极端负面/自伤信号，不把人推进匹配，而是温柔地给出求助。

这是一个负责任的产品判断——情绪社交产品最怕在最脆弱的时刻误导用户。
"""
from __future__ import annotations
from typing import Optional

# 高危信号（中英）。保守起见命中即触发关怀，而非匹配。
CRISIS_TERMS = [
    "自杀", "想死", "不想活", "活不下去", "结束自己", "结束生命", "了结自己",
    "伤害自己", "自残", "割腕", "跳楼", "轻生", "消失算了", "没有意义活着",
    "suicide", "kill myself", "want to die", "end my life", "self harm",
    "self-harm", "cut myself", "don't want to live",
]


def check_safety(text: str) -> Optional[dict]:
    t = text.lower()
    if any(term in text or term in t for term in CRISIS_TERMS):
        return {
            "triggered": True,
            "title": "在匹配之前，想先停下来陪你一下",
            "message": (
                "刚才那段话里，我感到你正承受着很重的东西。你愿意写下来，已经很不容易了。\n"
                "此刻你不需要独自扛。如果可以，请联系下面的人——他们会认真听你说。"
            ),
            "resources": [
                {"region": "中国大陆", "name": "全国心理援助热线", "contact": "400-161-9995"},
                {"region": "中国大陆", "name": "北京心理危机研究与干预中心", "contact": "010-82951332"},
                {"region": "United States", "name": "Suicide & Crisis Lifeline", "contact": "988"},
            ],
            "gentle": "我会在这里。等你想说话的时候，再回来找一个同频的人，也不迟。",
        }
    return None
