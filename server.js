// ============================================================================
//  灵治擂台赛 · 通用后端（Express）
//  职责：1) 托管 public/ 静态前端  2) 代理 AI 调用，token 只留在服务端
//  铁律：/api/ai 任何失败都回退 fallback、永远返回 200 —— 演示绝不 500/翻车
//        （上届有人就死在「llm api 调用失败」）
// ============================================================================
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = process.env.AI_MODEL || 'claude-sonnet-4-6'; // 演示求快可设 haiku

// 健康检查：前端用它显示「是否已配置 key / 是否在兜底模式」
app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasKey: !!process.env.ANTHROPIC_API_KEY, model: DEFAULT_MODEL });
});

// ★ AI 代理。请求体：{ prompt, system?, model?, maxTokens?, fallback? }
//   返回：{ text, source: 'api' | 'fallback' }
app.post('/api/ai', async (req, res) => {
  const { prompt = '', system = '', model, maxTokens = 1024, fallback = '' } = req.body || {};
  const key = process.env.ANTHROPIC_API_KEY;
  const fb = (why) => {
    if (why) console.warn('[ai → fallback]', why);
    res.json({ text: fallback || '（兜底文案：AI 暂不可用，演示照常进行。← 替换成你的预置文案）', source: 'fallback' });
  };

  if (!key) return fb('no ANTHROPIC_API_KEY');

  try {
    const r = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(25000), // 25s 超时，挂死也不会拖垮演示
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      return fb('upstream ' + r.status + ' ' + body.slice(0, 200));
    }
    const data = await r.json();
    const text = (data.content || []).map((b) => b.text || '').join('').trim();
    if (!text) return fb('empty response');
    res.json({ text, source: 'api' });
  } catch (e) {
    fb(e.message);
  }
});

// 兜底路由：未知路径回前端（方便前端做 SPA 路由；现在也无妨）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000; // Railway 会注入 PORT
app.listen(PORT, () => console.log(`✅ server on http://localhost:${PORT}  (hasKey=${!!process.env.ANTHROPIC_API_KEY})`));
