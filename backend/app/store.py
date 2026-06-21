"""内存存储：会话与消息。

演示场景单实例足够；结构清晰，日后换 SQLite/Redis 只需替换本模块。
"""
from __future__ import annotations
import time
import uuid
from typing import Dict, List, Optional

_conversations: Dict[str, dict] = {}


def _now() -> float:
    return time.time()


def create_conversation(user_identity: dict, partner: dict, mode: str,
                        user_emotion: dict) -> dict:
    cid = "c_" + uuid.uuid4().hex[:10]
    conv = {
        "id": cid,
        "mode": mode,
        "user": user_identity,
        "partner": partner,
        "user_emotion": user_emotion,
        "messages": [],
        "created_at": _now(),
    }
    _conversations[cid] = conv
    return conv


def add_message(cid: str, sender: str, name: str, text: str) -> Optional[dict]:
    conv = _conversations.get(cid)
    if not conv:
        return None
    msg = {"sender": sender, "name": name, "text": text, "ts": _now()}
    conv["messages"].append(msg)
    return msg


def get_conversation(cid: str) -> Optional[dict]:
    return _conversations.get(cid)


# ---- 房间型会话（同频小屋，多人）----
def create_room(user_identity: dict, members: list, user_emotion: dict, vibe: str) -> dict:
    rid = "r_" + uuid.uuid4().hex[:10]
    room = {
        "id": rid, "type": "room",
        "user": user_identity, "members": members,
        "user_emotion": user_emotion, "vibe": vibe,
        "messages": [], "created_at": _now(),
    }
    _conversations[rid] = room
    return room


def add_room_message(rid: str, sender: str, name: str, avatar: str, text: str) -> Optional[dict]:
    room = _conversations.get(rid)
    if not room:
        return None
    msg = {"sender": sender, "name": name, "avatar": avatar, "text": text, "ts": _now()}
    room["messages"].append(msg)
    return msg


def room_transcript(rid: str, limit: int = 8) -> str:
    """把房间最近对话转成「名字」体的文字稿，供 LLM 扮演某个室友时参考。"""
    room = _conversations.get(rid)
    if not room:
        return ""
    return "\n".join(f"【{m['name']}】{m['text']}" for m in room["messages"][-limit:])


def history_for_llm(cid: str) -> List[dict]:
    """把会话历史转成 LLM 的 messages 格式（user=本人, assistant=匿名对象）。"""
    conv = _conversations.get(cid)
    if not conv:
        return []
    out = []
    for m in conv["messages"]:
        role = "user" if m["sender"] == "user" else "assistant"
        out.append({"role": role, "content": m["text"]})
    return out
