# 心引力 · Gravity

> 在你最有情绪的那一刻，找到和你处在同一片情绪星空下的人。

一个 AI 驱动的「情绪匿名社交」Web 应用：你写下（或**说出**）当下的心情 → Claude（或 GPT）把它解析成一个可计算的**情绪向量（效价 × 唤醒）** → 在「情绪星空」里为你匹配**同频 / 牵引**的匿名陌生人 → 进入 1 对 1 或同频小屋，匿名聊天（支持**语音转文字**与**纯语音消息**）。每一个「此刻」还会沉淀成你专属的**情绪星座**。

为「灵治擂台赛 第三期」而作。

**🔗 线上地址（Live Demo）：** https://spectacular-reprieve-production-3239.up.railway.app
**🔗 后端 API（健康检查）：** https://lingzhicomp-production.up.railway.app/api/health

---

## ✨ 核心流程（30 秒 Demo）

1. 写一段真实心情（例：「今晚加完班一个人走回家，路灯一盏盏亮着，突然觉得很累也很孤独」）
2. AI 情绪卡浮现：**情绪词 + 诗意比喻 + 温柔复述 + 强度/正负向/唤醒 + 关键词 + 情绪色**，并给你分配一个匿名的卡通动物形象
3. 「情绪星空」四象限星图里，你是一颗星；选择**同频/互补**与**陪伴方式（想被懂 F / 想被理清 T）**
4. 两颗星靠近、汇合 →「✦ 匹配完成 ✦」揭晓匿名对象 + **匹配理由（为什么是 TA：相似度 %、所在象限）**
5. 进入匿名聊天，真发真收，对象由 AI 按人设 + 双方情绪扮演一个有人味的陌生人；也可进**同频小屋**多人轻聊。输入支持文字 / 🎤听写 / 按住说话发**语音消息**（仿微信）
6. 每次分析都会沉淀一颗星，进入**「我的情绪星座」**回看你的情绪轨迹与趋势

---

## 🧠 设计要点（情绪如何真正驱动匹配）

情绪不是一个标签，而是一个**位置**。我们用 `valence`（正负向 −1~1）× `arousal`（唤醒度 0~1）把每段心情放进一个连续的二维情绪空间：

- **识别**：LLM 输出结构化 JSON（label / poetic / explanation / intensity / valence / arousal / keywords），后端解析为情绪向量。
- **匹配**：在 100 个 mock 角色（在情绪空间铺成 10×10 网格、覆盖全部象限）里做**最近邻 / 互补**计算——
  - 同频 = 在情绪空间里离你最近的人（被理解、被共鸣）；
  - 牵引 = 一个离你不远、但比你稍平静/正向一点的人，温柔把你拉一把（刻意不找情绪相反的人，避免两个低落的人越聊越沉）。
  - 一对一池与小屋池**棋盘式分离**（各 50 人、各自铺满全图），互不串味。
- **解释**：每次匹配都返回相似度 %、双方所在象限与一句「为什么匹配」，让匹配**看得见、可解释**，而非装饰。
- **安全边界**：检测到极端负面表达时，不进入匹配，转而给出关怀与求助信息卡。
- **永不翻车**：任何 LLM 调用失败都会自动降级到本地分析器/兜底文案（详见下文），保证演示稳定。

---

## 🔌 双标准接口适配（OpenAI ↔ Anthropic，可切换）— 关键差异化

后端用一个 `LLMProvider` 抽象基类统一「情绪分析」与「聊天」两种能力，**OpenAI 标准接口**与 **Anthropic 标准接口**各实现一个子类，通过环境变量一键切换。两套接口行为一致，且都包了一层 `ResilientProvider`：主接口任何异常都自动降级到本地分析器，演示永不死。

### 切换方式

只改一个环境变量 `LLM_PROVIDER`：

| 模式 | `LLM_PROVIDER` | 需要的变量 | 默认模型 |
|---|---|---|---|
| **Anthropic 标准接口** | `anthropic` | `ANTHROPIC_API_KEY`、`ANTHROPIC_MODEL` | `claude-opus-4-8` |
| **OpenAI 标准接口** | `openai` | `OPENAI_API_KEY`、`OPENAI_MODEL`、（可选 `OPENAI_BASE_URL`） | `gpt-4o-mini` |

`OPENAI_BASE_URL` 可指向任意 **OpenAI 兼容端点**（如自建网关、第三方代理），因此 OpenAI 这一路实际覆盖了所有 OpenAI 兼容服务。

> **两套接口还会被「同时」用上**：纯语音消息走 **OpenAI Whisper** 做语音转文字（Anthropic 标准接口无 STT），转写后的文本再交给 **Anthropic Opus** 生成回复——一条语音同时用到 OpenAI（转写）+ Anthropic（对话）。转写需要 `OPENAI_API_KEY`，失败时自动降级为提示改用文字，绝不卡死。

### 环境变量（`backend/.env`，参见 `backend/.env.example`）

```env
# 选用哪套标准接口： anthropic | openai
LLM_PROVIDER=anthropic

# --- Anthropic 标准接口 ---
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-8

# --- OpenAI 标准接口（兼容任意 OpenAI 端点）---
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
# OPENAI_BASE_URL=https://api.openai.com/v1

# 允许的前端来源（部署时填前端域名；本地可留 *）
FRONTEND_ORIGIN=*
```

> 实际生效的接口可在 `GET /api/health` 看到（`configured_provider` 想用的、`active_provider` 真正生效的——若主接口不可用会显示 `fallback`）。

---

## 🏗️ 技术栈与架构

**前后端分离。**

- **后端 `backend/`（FastAPI）**：情绪分析 / 匹配 / 会话 / 消息 API。
  - `app/providers/` — 双接口适配器 + 弹性降级（`base` / `anthropic_provider` / `openai_provider` / `fallback`）
  - `app/emotion.py` — 情绪模型、向量、配色、解析
  - `app/matching.py` — 同频/牵引/最近邻匹配
  - `app/personas.py` — 100 个 mock 角色 + 按情绪分类的卡通动物头像
  - `app/safety.py` — 极端负面安全边界
  - `app/transcribe.py` — 语音转文字（OpenAI Whisper）
  - `app/store.py` — 会话/房间/消息内存存储
- **前端 `frontend/`（Next.js App Router, JS）**：完整流程 输入 → 情绪卡 → 匹配等待动画 → 匿名聊天 / 小屋 → 情绪星座。
  - 宇宙星空 UI、情绪四象限星图、双星靠近的匹配动画、1 对 1 与小屋两种聊天屏。
  - 仿微信语音输入（`lib/speech.js` 即时听写 + `lib/recorder.js` 录音）；情绪星座本地沉淀（`lib/history.js`）。

### 主要 API

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查 + 当前生效的接口/模型 |
| POST | `/api/analyze` | 情绪识别（返回情绪 + 同频人数 + 你的匿名形象） |
| POST | `/api/match` | 一对一匹配（同频/互补 + 陪伴方式） |
| POST | `/api/conversations/{id}/messages` | 匿名对话收发 |
| POST | `/api/room` | 组建同频小屋 |
| POST | `/api/rooms/{id}/messages` | 小屋多人对话 |
| POST | `/api/transcribe` | 语音转文字（纯语音消息，OpenAI Whisper） |

---

## 🚀 本地运行

### 后端（端口 8000）

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate          # Windows；macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # 然后填入你的 API Key
python -m uvicorn app.main:app --port 8000
```

### 前端（端口 3000）

```bash
cd frontend
npm install
cp .env.local.example .env.local   # 本地默认指向 http://localhost:8000，无需改
npm run dev
```

打开 http://localhost:3000 。

---

## ☁️ 部署（Railway，前后端两个服务）

**后端服务**
- Root Directory：`backend`
- Start Command：`uvicorn app.main:app --host 0.0.0.0 --port $PORT`（已含 `backend/Procfile`）
- Variables：`LLM_PROVIDER=anthropic`、`ANTHROPIC_MODEL=claude-opus-4-8`、`FRONTEND_ORIGIN=*`，以及 `ANTHROPIC_API_KEY` /（可选）`OPENAI_API_KEY`
- 部署后记下后端公网地址。

**前端服务**（Railway 或 Vercel）
- Root Directory：`frontend`
- Variable：`NEXT_PUBLIC_API_BASE=<后端公网地址>`（注意：`NEXT_PUBLIC_*` 在 **build 时**注入，须在构建前设置）
- Build：`npm run build`，Start：`npm start`

---

## 🛟 稳定性

- 每个 AI 调用失败都会降级（情绪分析→本地启发式；对话→兜底暖句），**线上演示不会因外部 API 抖动而中断**。
- 聊天对象与小屋室友均为 AI 扮演的 mock 用户（赛题允许 mock 不同用户做对话演示）。

---

_产品名「心引力 / Gravity」（备选「同温层」）。为 灵治擂台赛 第三期 而作。_
