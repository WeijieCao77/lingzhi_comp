"""同频 Resonance · FastAPI 后端入口。

主链路：/analyze(识别+安全) → /match(同频/互补+破冰) → /conversations(匿名对话)
"""
from __future__ import annotations
from typing import List, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import config
from .emotion import Emotion, quadrant
from .providers import get_provider
from .matching import match, similarity, nearest
from .personas import all_personas, personas_for, random_identity, identity_for
from .safety import check_safety
from .transcribe import transcribe_audio
from . import store

app = FastAPI(title="同频 Resonance API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if config.FRONTEND_ORIGIN == "*" else [config.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- 请求/响应模型 ----------
class AnalyzeIn(BaseModel):
    text: str


class EmotionIn(BaseModel):
    label: str = "复杂"
    poetic: str = ""
    explanation: str = ""
    intensity: float = 0.5
    valence: float = 0.0
    arousal: float = 0.5
    keywords: List[str] = Field(default_factory=list)
    color: str = "#8b91a1"
    source: str = "fallback"

    def to_emotion(self) -> Emotion:
        return Emotion(**self.dict())


class MatchIn(BaseModel):
    emotion: EmotionIn
    mode: str = "resonance"               # resonance(同频) | counterbalance(互补)
    prefer_style: Optional[str] = None    # empathic(想被懂/F) | rational(想被理清/T) | None
    user_name: Optional[str] = None
    user_identity: Optional[dict] = None  # 沿用 analyze 分配的动物形象


class RoomIn(BaseModel):
    emotion: EmotionIn
    prefer_style: Optional[str] = None
    user_name: Optional[str] = None
    user_identity: Optional[dict] = None
    size: int = 6                    # 室友数量；房间总人数 = size + 你，最多 ~10


class MessageIn(BaseModel):
    text: str


# ---------- 工具 ----------
STYLE_GUIDE = {
    "empathic": "你的陪伴方式偏「想被懂」(F)：先共情和复述对方的感受，让 TA 觉得被接住，"
                "不急着给建议或讲道理。",
    "rational": "你的陪伴方式偏「想被理清」(T)：温柔但清醒，帮 TA 把情绪和处境理出一点头绪、"
                "给一个新的角度，但不冷冰冰、不说教。",
}


def _partner_system(conv: dict) -> str:
    p = conv["partner"]
    ue = conv["user_emotion"]
    uq = quadrant(ue.get("valence", 0), ue.get("arousal", 0.5))
    style_line = STYLE_GUIDE.get(p.get("style", ""), "")
    return (
        f"你在一个匿名情绪社交产品里，扮演一个真实的匿名陌生人，代号「{p['anon_name']}」。\n"
        f"你此刻的情绪基调：{p.get('label','')}（{quadrant(p['valence'], p['arousal'])}）。\n"
        f"人物设定：{p.get('persona','')}\n"
        f"{style_line}\n"
        f"对方（也匿名）此刻的情绪：{ue.get('label','')}——“{ue.get('explanation','')}”，整体在「{uq}」。\n"
        f"你们因为情绪{'相近' if conv['mode']=='resonance' else '互补'}被匹配到一起。\n"
        "就像一个真实、温柔、有点意思的陌生人那样聊天：自然、口语化，有自己的语气和小情绪，"
        "会真诚地回应、也会带点好奇，偶尔分享一点自己的感受或经历。别像客服、别说教、"
        "别自报是AI、别用'作为AI/我理解你的感受'这种套路话。长度自然就好，不必刻意简短，也别长篇大论。"
    )


def _kindred_count(emo: Emotion, threshold: int = 62) -> int:
    return sum(1 for p in all_personas()
              if similarity(emo.vector, (p["valence"], p["arousal"])) >= threshold)


# ---------- 路由 ----------
@app.get("/api/health")
def health():
    prov = get_provider()
    return {
        "ok": True,
        "configured_provider": config.LLM_PROVIDER,
        "active_provider": prov.active_name,        # 实际生效（可能降级为 fallback）
        "has_openai": bool(config.OPENAI_API_KEY),
        "has_anthropic": bool(config.ANTHROPIC_API_KEY),
        "model": config.OPENAI_MODEL if config.LLM_PROVIDER == "openai" else config.ANTHROPIC_MODEL,
    }


@app.get("/api/personas")
def personas():
    """给前端"情绪星图"做背景星点用（只暴露匿名位置，无敏感信息）。"""
    from .emotion import color_from
    return {"personas": [
        {"anon_name": p["anon_name"], "avatar": p["avatar"], "label": p["label"],
         "valence": p["valence"], "arousal": p["arousal"], "style": p["style"],
         "color": color_from(p["valence"], p["arousal"])}
        for p in all_personas()
    ]}


@app.post("/api/analyze")
def analyze(body: AnalyzeIn):
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(400, "text 不能为空")
    # 安全边界优先：极端负面 → 不进入匹配，给关怀
    safety = check_safety(text)
    if safety:
        return {"safety": safety}
    emo = get_provider().analyze_emotion(text)
    return {
        "emotion": emo.dict(),
        "kindred_count": _kindred_count(emo),       # "此刻有 N 个人和你同频"
        "user_identity": identity_for(emo),          # 按情绪自动分配的卡通动物形象
    }


@app.post("/api/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """纯语音消息 → 文字（OpenAI Whisper）。失败给清晰错误，前端退回文字输入。"""
    data = await audio.read()
    if not data:
        raise HTTPException(400, "音频为空")
    try:
        text = transcribe_audio(data, audio.filename or "audio.webm")
    except Exception:
        raise HTTPException(503, "语音转写暂不可用，请改用文字")
    return {"text": text}


@app.post("/api/match")
def do_match(body: MatchIn):
    emo = body.emotion.to_emotion()
    mode = body.mode if body.mode in ("resonance", "counterbalance") else "resonance"
    pool = personas_for("solo")   # 一对一只在 solo 池里找
    partner = match(emo, pool, mode=mode, prefer_style=body.prefer_style)
    if not partner:  # 兜底（池子理论上永不为空）
        raise HTTPException(503, "暂时没有可匹配的人，请稍后再试")

    user_identity = body.user_identity or identity_for(emo)
    if body.user_name:
        user_identity["anon_name"] = body.user_name[:20]

    conv = store.create_conversation(user_identity, partner, mode, emo.dict())

    # AI 破冰：匿名对象根据双方情绪，自然说出第一句
    opener_instr = (
        f"请你作为「{partner['anon_name']}」，根据你们此刻的情绪，自然地说出第一句话，"
        "打破沉默。简短、温暖、像真人，不要说'你好/在吗'这种客套，不要自我介绍。"
    )
    try:
        opener = get_provider().chat(_partner_system(conv),
                                     [{"role": "user", "content": opener_instr}],
                                     max_tokens=120).strip()
    except Exception:
        opener = "我在这儿。看到你了。"
    if not opener:
        opener = "我在这儿。看到你了。"
    store.add_message(conv["id"], "partner", partner["anon_name"], opener)

    return {
        "conversation_id": conv["id"],
        "mode": mode,
        "user_identity": user_identity,
        "partner": {
            "anon_name": partner["anon_name"],
            "avatar": partner["avatar"],
            "label": partner.get("label", ""),
            "style": partner.get("style", ""),
            "valence": partner["valence"],
            "arousal": partner["arousal"],
            "similarity": partner["similarity"],
            "reason": partner["reason"],
            "user_quadrant": partner["user_quadrant"],
            "partner_quadrant": partner["partner_quadrant"],
        },
        "opener": opener,
    }


@app.post("/api/conversations/{cid}/messages")
def send_message(cid: str, body: MessageIn):
    conv = store.get_conversation(cid)
    if not conv:
        raise HTTPException(404, "会话不存在")
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(400, "消息不能为空")

    store.add_message(cid, "user", conv["user"]["anon_name"], text)

    # 匿名对象（AI 扮演）回复
    reply = get_provider().chat(_partner_system(conv), store.history_for_llm(cid),
                                max_tokens=160).strip()
    if not reply:
        reply = "嗯，我在听。"
    msg = store.add_message(cid, "partner", conv["partner"]["anon_name"], reply)
    return {"reply": msg, "partner_name": conv["partner"]["anon_name"]}


@app.get("/api/conversations/{cid}")
def get_conversation(cid: str):
    conv = store.get_conversation(cid)
    if not conv:
        raise HTTPException(404, "会话不存在")
    return conv


# ---------- 小房间（同频小屋，多人）----------
def _room_member_system(room: dict, member: dict) -> str:
    return (
        "你在一个匿名'同频小屋'里，屋里有几个情绪相近的陌生人，大家都匿名。\n"
        f"你扮演其中一个，代号「{member['anon_name']}」。人物设定：{member.get('persona','')}\n"
        f"{STYLE_GUIDE.get(member.get('style', ''), '')}\n"
        f"小屋此刻的共同氛围：{room['vibe']}。\n"
        "就像在一个温柔的小群里聊天：自然、口语化，有自己的语气，会真诚地接住刚才别人说的话、"
        "偶尔也起个新话头。别像客服、别说教、别自报是AI、别每句都反问。一两句就好，但要有人味。"
    )


def _member_say(room: dict, member: dict, instruction: str) -> str:
    try:
        return get_provider().chat(
            _room_member_system(room, member),
            [{"role": "user", "content": instruction}],
            max_tokens=120,
        ).strip()
    except Exception:
        return ""


@app.post("/api/room")
def create_room(body: RoomIn):
    emo = body.emotion.to_emotion()
    n = max(2, min(8, body.size))                     # 房间最多 ~10 人（你 + 8）
    members = nearest(emo, personas_for("room"), n)   # 小房间只在 room 池里组队
    vibe = quadrant(emo.valence, emo.arousal)
    user_identity = body.user_identity or identity_for(emo)
    if body.user_name:
        user_identity["anon_name"] = body.user_name[:20]
    room = store.create_room(user_identity, members, emo.dict(), vibe)

    # 暖场：前几个室友先开口
    for m in members[:3]:
        instr = ("你刚进到这个小屋，屋里都是和你情绪相近的陌生人。自然地说一句开场，"
                 "温暖、简短，像在轻声打招呼，不要客套套话、不要自我介绍。")
        txt = _member_say(room, m, instr) or "嗨，我也在这儿。"
        store.add_room_message(room["id"], m["id"], m["anon_name"], m["avatar"], txt)

    return {
        "room_id": room["id"],
        "vibe": vibe,
        "user_identity": user_identity,
        "members": [{"id": m["id"], "anon_name": m["anon_name"], "avatar": m["avatar"],
                     "label": m.get("label", ""), "similarity": m["similarity"]} for m in members],
        "messages": room["messages"],
    }


@app.post("/api/rooms/{rid}/messages")
def room_message(rid: str, body: MessageIn):
    import random
    room = store.get_conversation(rid)
    if not room or room.get("type") != "room":
        raise HTTPException(404, "房间不存在")
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(400, "消息不能为空")

    store.add_room_message(rid, "user", room["user"]["anon_name"],
                           room["user"].get("avatar", "🌙"), text)

    # 选 1~2 个室友回应（最近的那个一定回，有时再加一个；不会一拥而上）
    members = room["members"]
    responders = [members[0]]
    if len(members) > 1 and random.random() < 0.6:
        responders.append(random.choice(members[1:]))

    replies = []
    for m in responders:
        instr = (f"小屋最近的对话：\n{store.room_transcript(rid)}\n\n"
                 f"现在轮到你（{m['anon_name']}），自然地回应一句刚才的气氛或某个人说的话。")
        txt = _member_say(room, m, instr) or "嗯，我在。"
        msg = store.add_room_message(rid, m["id"], m["anon_name"], m["avatar"], txt)
        replies.append(msg)

    return {"replies": replies}
