"""真人优先匹配（实时等待池）—— 后台机制。

设计目标：**真人优先，AI 保底**。
- 两个此刻情绪相近的真人，会被配成一对**真实**的匿名对话；
- 没有合适真人时，调用方回退到 AI 匹配（/api/match）做保底——也就是当前演示用的主路径。

实现：纯内存 + 轮询 + 单副本（Railway 单实例即可，无需数据库），适合 demo/比赛规模。
本机制真实可用——开两个浏览器标签、写下相近的心情，即可把两个"真人"配到一起、互相收发。
之所以实机演示仍用 AI 扮演：单个评测者无法同时触发两个真人配对，赛题也明确允许 mock。

线程安全：uvicorn 单进程下，FastAPI 同步端点跑在线程池里，故用一把锁保护共享字典。
"""
from __future__ import annotations
import time
import uuid
import threading
from typing import Dict, Optional
from .matching import similarity

_LOCK = threading.Lock()
_waiting: Dict[str, dict] = {}   # user_id -> 等待条目
_convs: Dict[str, dict] = {}     # conv_id -> 实时会话

MATCH_THRESHOLD = 78             # 情绪相近度阈值（%）：达到才配对
WAIT_TTL = 90                    # 等待条目存活秒数（过期清理）


def _now() -> float:
    return time.time()


def _entry(user_id, emotion_vec, intent, prefer_style, identity, conv_id=None) -> dict:
    return {"user_id": user_id, "emotion": list(emotion_vec), "intent": intent,
            "prefer_style": prefer_style, "identity": identity,
            "created_at": _now(), "conv_id": conv_id}


def _gc():
    cutoff = _now() - WAIT_TTL
    for uid in [u for u, e in _waiting.items() if e["created_at"] < cutoff and not e.get("conv_id")]:
        _waiting.pop(uid, None)


def join(user_id, emotion_vec, intent, prefer_style, identity) -> dict:
    """加入等待池；若池中有情绪相近的真人，立即配成一对真实会话。"""
    with _LOCK:
        _gc()
        for uid, e in list(_waiting.items()):
            if uid == user_id or e.get("conv_id") or e["intent"] != intent:
                continue
            sim = similarity(tuple(emotion_vec), tuple(e["emotion"]))
            if sim >= MATCH_THRESHOLD:
                conv_id = "live_" + uuid.uuid4().hex[:10]
                _convs[conv_id] = {
                    "users": [uid, user_id],
                    "identities": {uid: e["identity"], user_id: identity},
                    "emotions": {uid: list(e["emotion"]), user_id: list(emotion_vec)},
                    "similarity": sim, "messages": [], "ended": False, "created_at": _now(),
                }
                e["conv_id"] = conv_id
                _waiting[user_id] = _entry(user_id, emotion_vec, intent, prefer_style, identity, conv_id)
                return {"status": "matched", "conversation_id": conv_id,
                        "partner_identity": e["identity"], "partner_emotion": list(e["emotion"]),
                        "similarity": sim}
        _waiting[user_id] = _entry(user_id, emotion_vec, intent, prefer_style, identity)
        return {"status": "waiting"}


def status(user_id) -> dict:
    """轮询自己的配对状态：等待中 / 已配到真人 / 已过期。"""
    with _LOCK:
        e = _waiting.get(user_id)
        if not e:
            return {"status": "expired"}
        if e.get("conv_id"):
            conv = _convs.get(e["conv_id"])
            partner = partner_emotion = sim = None
            if conv:
                sim = conv.get("similarity")
                for uid in conv["users"]:
                    if uid != user_id:
                        partner = conv["identities"].get(uid)
                        partner_emotion = conv.get("emotions", {}).get(uid)
            return {"status": "matched", "conversation_id": e["conv_id"],
                    "partner_identity": partner, "partner_emotion": partner_emotion, "similarity": sim}
        return {"status": "waiting"}


def send(conv_id, user_id, text) -> Optional[dict]:
    with _LOCK:
        conv = _convs.get(conv_id)
        if not conv or user_id not in conv["users"]:
            return None
        ident = conv["identities"].get(user_id, {})
        msg = {"id": len(conv["messages"]) + 1, "sender": user_id,
               "name": ident.get("anon_name", "匿名"), "avatar": ident.get("avatar", "🌙"),
               "text": text, "t": _now()}
        conv["messages"].append(msg)
        return msg


def poll(conv_id, after: int = 0) -> dict:
    """对方/自己拉取游标之后的新消息——真人之间真实收发。"""
    with _LOCK:
        conv = _convs.get(conv_id)
        if not conv:
            return {"messages": [], "ended": True}
        return {"messages": [m for m in conv["messages"] if m["id"] > after], "ended": conv["ended"]}


def leave(user_id):
    with _LOCK:
        e = _waiting.pop(user_id, None)
        if e and e.get("conv_id"):
            conv = _convs.get(e["conv_id"])
            if conv:
                conv["ended"] = True


def stats() -> dict:
    """池子概览（调试/健康用）。"""
    with _LOCK:
        _gc()
        return {"waiting": sum(1 for e in _waiting.values() if not e.get("conv_id")),
                "live_conversations": sum(1 for c in _convs.values() if not c["ended"])}
