# 灵治擂台赛 · 通用全栈脚手架

主题无关的底座。Express 后端代理 AI（token 只在服务端），静态前端，**GitHub + Railway 一键部署**。
明天开题后，把 `public/index.html` 的根组件换成真正的核心动线即可（全文搜 `← 替换`）。

## 本地跑

```bash
npm install
cp .env.example .env      # 然后把 ANTHROPIC_API_KEY 填进 .env（留空也能跑，走兜底）
npm start                 # http://localhost:3000
```

不填 key 也能启动：AI 调用会自动回退到兜底文案，演示不会翻车。右上角指示灯会显示「真 API / 兜底模式」。

## 部署到 Railway

1. `git init && git add -A && git commit -m "init"`，推到 GitHub（`.env` 已被 `.gitignore` 忽略，密钥不会上传）。
2. Railway → New Project → Deploy from GitHub repo，选这个仓库。
3. Railway 自动识别 Node（Nixpacks），跑 `npm start`。**PORT 由 Railway 注入，已在 `server.js` 用 `process.env.PORT`。**
4. Railway → 项目 → **Variables**，加 `ANTHROPIC_API_KEY`（和本地 `.env` 同名）。可选 `AI_MODEL`。
5. 部署完成，拿到公开域名 = 现场演示地址。

## 结构

```
server.js          Express：托管 public/ + POST /api/ai 代理 + /api/health
public/index.html  前端（React CDN + Babel classic）。callAI() → /api/ai，内置兜底
.env               本地密钥（gitignored）          .env.example  模板（提交）
.gitignore         忽略 node_modules / .env
```

## /api/ai 约定

请求 `POST /api/ai`：`{ prompt, system?, model?, maxTokens?, fallback? }`
返回：`{ text, source: 'api' | 'fallback' }` —— **任何失败都返回 200 + fallback**，前端只管用。

## 想用 Vite/构建版前端？

把构建产物输出到 `public/`（或改 `express.static` 指向 `dist/`），后端 `/api/*` 不变即可。
当前 CDN 方案的好处是零构建、改一处看一处，最适合限时现场迭代。

> 风险备忘：CDN 前端依赖联网。若现场网络不稳，开题后可把 React/Babel/Tailwind 下载到本地 `public/vendor/` 做离线版（最稳）。详见备战报告。
