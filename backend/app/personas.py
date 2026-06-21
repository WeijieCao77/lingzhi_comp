"""100 个 mock 匿名角色 + 卡通动物头像库（按情绪分类）。

- 在情绪空间 (valence×arousal) 上铺成 10×10 网格，确定性生成 100 个角色，
  覆盖全部象限，任何情绪都能匹配到很近的人。
- 每个角色 = 一份"人设提示词"，匹配后由 LLM 据此扮演对话。
- intent: solo(只进一对一) | room(只进小房间)，棋盘式分配，两池各 ~50 且都铺满全图。
- 头像 = 按情绪象限分类的卡通动物，用户输入后也会自动分到一个动物形象。
"""
from __future__ import annotations
import random
from typing import List
from .emotion import quadrant

# ---- 卡通动物头像库：按情绪象限分类 ----
ANIMALS = {
    "低落而安静": ["🦥", "🐢", "🐌", "🦔", "🐑", "🐨", "🦇", "🐚", "🐳", "🦦"],
    "焦灼而起伏": ["🐿️", "🐈", "🦌", "🐝", "🦫", "🦅", "🐺", "🦘", "🐓", "🦂"],
    "平静而温柔": ["🐰", "🐼", "🐧", "🐹", "🦭", "🕊️", "🐻", "🐥", "🦮", "🐡"],
    "明亮而热烈": ["🦊", "🐬", "🦜", "🐶", "🐯", "🐵", "🦁", "🦓", "🐝", "🐠"],
}

ADJ = ["夜行的", "微亮的", "安静的", "漂浮的", "温热的", "褪色的", "刚醒的", "走神的",
       "起雾的", "落单的", "贪睡的", "发亮的", "迷路的", "怕黑的", "爱笑的", "沉默的",
       "好奇的", "赖床的", "数星星的", "等天亮的"]
NOUN = ["云", "信号", "橘子", "海", "口袋", "候鸟", "便利店", "月亮", "气球", "灯塔"]

# 每个象限的"原型" + 一句默认心情
ARCHETYPE = {
    "低落而安静": "情绪偏低、安静内敛",
    "焦灼而起伏": "心里有点焦躁、容易紧张",
    "平静而温柔": "平和、温柔、容易满足",
    "明亮而热烈": "开朗、热情、能量很高",
}
MOOD = {
    "低落而安静": "今天有点提不起劲，只想安安静静待着。",
    "焦灼而起伏": "心里一直悬着，脑子停不下来。",
    "平静而温柔": "今天挺平静的，没什么烦心事。",
    "明亮而热烈": "今天心情很亮，想找人说说话。",
}
LABEL = {
    "低落而安静": ["孤独", "疲惫", "失落", "平静", "空", "想静静"],
    "焦灼而起伏": ["焦虑", "烦躁", "紧绷", "不安", "压力满格"],
    "平静而温柔": ["温暖", "释然", "平和", "满足", "踏实"],
    "明亮而热烈": ["喜悦", "期待", "雀跃", "兴奋", "想分享"],
}
TRAITS = [
    "话不多但很真诚", "喜欢用比喻说话", "经历过一些事所以看得开", "特别容易共情别人",
    "有点理性、爱把事情理清楚", "嘴硬心软", "标准夜猫子", "爱观察生活里的小细节",
    "慢热但很暖", "想得多、也想得深", "喜欢安静地陪着别人", "习惯把情绪写下来",
    "对世界还保有好奇", "容易被一句话戳中", "记性好、爱回忆", "随和不爱争",
]


def _build() -> List[dict]:
    out = []
    k = 0
    for i in range(10):          # valence 维度
        for j in range(10):      # arousal 维度
            v = round(-1 + (i + 0.5) / 10 * 2, 2)
            a = round((j + 0.5) / 10, 2)
            q = quadrant(v, a)
            name = ADJ[k % 20] + NOUN[(k // 20) % 10]
            avatar = ANIMALS[q][k % len(ANIMALS[q])]
            label = LABEL[q][k % len(LABEL[q])]
            trait = TRAITS[k % len(TRAITS)]
            style = "empathic" if (i + j) % 2 == 0 else "rational"
            intent = "solo" if k % 2 == 0 else "room"   # 棋盘式：两池都铺满全图
            out.append({
                "id": f"p{k:03d}",
                "anon_name": name,
                "avatar": avatar,
                "valence": v,
                "arousal": a,
                "label": label,
                "style": style,
                "intent": intent,
                "persona": f"{ARCHETYPE[q]}的人，{trait}。",
                "mood_text": MOOD[q],
            })
            k += 1
    return out


SEED_PERSONAS: List[dict] = _build()


def all_personas() -> List[dict]:
    return [dict(p) for p in SEED_PERSONAS]


def personas_for(intent: str) -> List[dict]:
    """按意向取池子：'solo'(一对一) 或 'room'(小房间)。两池互不重叠、各自铺满情绪空间。"""
    return [dict(p) for p in SEED_PERSONAS if p.get("intent") == intent]


def identity_for(emotion) -> dict:
    """用户输入后，按 TA 的情绪自动分配一个卡通动物形象 + 诗意匿名名。"""
    q = quadrant(emotion.valence, emotion.arousal)
    return {
        "anon_name": random.choice(ADJ) + random.choice(NOUN),
        "avatar": random.choice(ANIMALS[q]),
    }


def random_identity() -> dict:
    return {"anon_name": random.choice(ADJ) + random.choice(NOUN),
            "avatar": random.choice(ANIMALS["平静而温柔"])}
