# NodeFlow Converter

> **v0.0.1** — Cloudflare Pages 分支（初始预览版）

一个功能全面的代理订阅转换工具，支持将 Clash、Surge、V2Ray 等多种格式的节点配置转换为 **Sing-Box** JSON 配置文件。内置本地解析引擎，无需外部 API。

## Features

- **多协议解析** — 支持 VMess、VLESS、Shadowsocks、Trojan、Hysteria2、TUIC、AnyTLS 及 Clash YAML 格式的节点提取
- **本地离线编译** — 纯客户端解析引擎，无需外部 API，节点数据不离开浏览器
- **在线订阅导入** — 通过 Cloudflare Functions 代理拉取远程订阅 URL
- **基础配置模板** — 支持 3 档预设（精简/标准/完整）+ URL 远程导入 + 自定义 JSON 编辑
- **自定义分流规则** — 支持域名/IP-CIDR/Rule-Set URL 三种规则类型，可指定 Proxy/Direct/Block 出站
- **24+ 预设规则集** — 广告拦截、AI 服务、流媒体、游戏等，支持 CDN 加速下载
- **TUN 虚拟网卡** — 可选启用 TUN 模式接管全系统流量
- **系统代理端口** — 可选启用 Mixed（HTTP/SOCKS）代理端口
- **国家地区分组** — 自动识别节点所属国家/地区，生成分流选择组与自动测速组
- **Clash API 兼容** — 可选启用 Clash 外部控制接口，支持 Yacd / Metacubexd 面板
- **实时订阅链接** — 将节点编译为可导入 Sing-Box 的在线订阅端点
- **Sing-Box 生态速览** — 内置官方及社区分支内核与 Web 面板资源导航
- **中英双语界面** — 支持简体中文与 English 切换

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS 4 |
| API Layer | Cloudflare Pages Functions |
| Build | Vite |
| Icons | lucide-react |

## Getting Started

### Prerequisites

- Node.js >= 18
- npm or bun

### Development

```bash
git clone https://github.com/eyeoko/NodeFlowConverter.git
cd NodeFlowConverter
npm install
npm run dev
```

启动 Vite 开发服务器，默认监听 `http://localhost:5173`。

> 注意：本地开发时 API 请求（`/api/fetch-subscription` / `/api/sub`）需要部署到 Cloudflare 或使用 `wrangler pages dev`（`npx wrangler pages dev .`）才能完整测试。

### Production Build

```bash
npm run build
```

构建输出在 `dist/` 目录，可直接部署到 Cloudflare Pages。

## Deploy to Cloudflare Pages

> ⚠️ **关键设置**：Build output directory 必须设为 **`dist`**，否则 Cloudflare 会部署源码而非构建产物，导致白屏。

### Option 1: Wrangler CLI

```bash
npm install
npm run build
npm run deploy
```

### Option 2: Git Integration

1. 在 [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → Create → Application → Pages → Connect to Git
2. 选择 `eyeoko/NodeFlowConverter` 仓库（`cf` 分支）
3. 构建设置（必须确保正确）：
   - **Build command**: `npm run build`
   - **Build output directory**: **`dist`**（❗ 此项不能为空，不能为 `.`）
4. 部署后 Cloudflare 会自动识别 `functions/` 目录下的 Pages Functions 并为其处理 API 路由

### Troubleshooting

| 现象 | 原因 | 解决 |
|------|------|------|
| 白屏，HTML 中 script src 为 `/src/main.tsx` | Build output directory 未设置为 `dist` | 在 Dashboard 中将输出目录改为 `dist` 并重新部署 |
| 白屏，HTML 中包含 `fonts.googleapis.com` 链接 | Google Fonts 被网络拦截导致加载阻塞 | 使用 `cf` 分支最新代码（已移除 Google Fonts 依赖） |
| API 返回 404 | `functions/` 目录未正确部署 | 确认项目根目录包含 `functions/` 文件夹 |

## Project Structure

```
NodeFlowConverter/
├── src/
│   ├── App.tsx              # 主应用组件（UI + 状态管理）
│   ├── main.tsx             # React 入口
│   ├── index.css            # 全局样式（Tailwind CSS）
│   └── utils/
│       └── parser.ts        # 节点解析引擎 + Sing-Box 配置生成器
├── presets/
│   ├── minimal.json         # 基础配置预设 - 精简版
│   ├── standard.json        # 基础配置预设 - 标准版
│   └── full.json            # 基础配置预设 - 完整版
├── functions/
│   └── api/
│       ├── health.ts               # GET /api/health
│       ├── fetch-subscription.ts    # GET /api/fetch-subscription?url=
│       └── sub.ts                  # GET /api/sub?config=...
├── index.html               # HTML 入口
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 配置
└── package.json
```

## API Endpoints

### `GET /api/health`
健康检查。

### `GET /api/fetch-subscription?url=<encoded_url>`
通过 Cloudflare Functions 代理拉取远程订阅内容，返回原始文本。

### `GET /api/sub?config=<base64>&dns=...&rulesets=...`
实时在线编译端点。将 Base64 编码的节点配置编译为 Sing-Box JSON，可直接作为订阅链接导入客户端。

## Features Detail

### 本地解析引擎 (`src/utils/parser.ts`)

- 支持协议：`vmess://`, `vless://`, `ss://`, `trojan://`, `hysteria2://`/`hy2://`, `tuic://`, `anytls://`
- 自动检测并解码 Base64 编码的订阅内容
- 支持 Clash YAML 格式（含单行 inline 和多行 proxies 段落）
- 生成符合 Sing-Box v1.12+ 规范的 JSON 配置（DNS `address` → `type`+`server`，移除 `alter_id`）
- 支持 `system` / `fakeip` 两种 DNS 策略
- 内置 24+ 预设规则集，自动生成 `route.rule_set` 远程规则集引用
- 自定义分流规则注入（域名/IP-CIDR/Rule-Set URL），可指定 Proxy/Direct/Block 出站

### 基础配置模板

支持三种使用模式：

- **预设模板** — 从 `presets/*.json` 加载内置模板（minimal / standard / full）
- **远程导入** — 通过 URL 拉取自定义基础配置
- **手动编辑** — 直接编辑 JSON 模板并实时验证

### 路由规则集

支持以下分流规则（各规则可独立开关）：

广告拦截、AI 服务（OpenAI/Anthropic）、Bilibili、YouTube、Google、私有网络、国内服务、Telegram、GitHub、Microsoft、Apple、社交媒体、流媒体（Netflix/Disney/HBO）、游戏平台（Steam/Epic/EA/Nintendo）、教育资源、金融服务、云服务（Cloudflare/AWS）、Spotify、TikTok、HuggingFace、代理服务、代理媒体、E-Hentai、非中国地区。

### Sing-Box 生态速览

页面顶部内置 Sing-Box 生态简介卡片，包含以下资源链接：

- **内核版本**：官方版 (SagerNet)、PuerNya 版、reF1nd-Stable、reF1nd-Test
- **Web 面板**：Yacd-meta、metacubexd、yacd、zashboard
- **整合仓库**：[enpioodada/sing-box-core](https://github.com/enpioodada/sing-box-core)

## License

MIT
