/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  Shield,
  ArrowLeftRight,
  Copy,
  Download,
  Zap,
  RefreshCw,
  Sliders,
  Globe,
  Check,
  AlertCircle,
  Terminal,
  Server,
  FileText,
  Search,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  Cpu,
  Languages,
  QrCode
} from 'lucide-react';
import { parseSubscription, generateSingBoxConfig, ProxyNode } from './utils/parser';

// Sample nodes to let the user try out the converter instantly
const SAMPLE_NODES = `# NodeFlow Subscription Example (Standard protocol links)
vmess://eyJhZGQiOiIxNDIuMjUwLjIwNC40NiIsImFpZCI6MCwiaG9zdCI6ImhkLmdvb2dsZS5jb20iLCJpZCI6IjhmNGQwNjExLTY2NDQtNDYwZC05NGNiLWZhMjkzYzkkMWEzYSIsInBvcnQiOjQ0MywibmV0Ijoid3MiLCJwYXRoIjoiL3ZtZXNzLXBhcyIsInRscyI6InRscyIsInBzIjoi8J+HreKAnSBISy1WTWVzcy1XUy1QcmVtaXVtIn0=
vless://9e4d0611-6644-460d-94cb-fa293c9d1a3b@sg-01.nodeflow.net:443?type=tcp&security=tls&sni=sg-01.nodeflow.net#🇸🇬 SG-VLESS-TLS-01
ss://YWVzLTEyOC1nY206cGFzc3dvcmQxMjM=@us-01.nodeflow.net:8388#🇺🇸 US-Shadowsocks-AES
trojan://password123@jp-01.nodeflow.net:443?sni=jp-01.nodeflow.net#🇯🇵 JP-Trojan-Secure
hysteria2://auth-token-xyz@kr-01.nodeflow.net:8443?sni=kr-01.nodeflow.net&alpn=h3#🇰🇷 KR-Hysteria2-Ultra
tuic://tuic-uuid-abc@kr-02.nodeflow.net:443?sni=kr-02.nodeflow.net&alpn=h3#🇰🇷 KR-TUIC-V5
anytls://password789@kr-03.nodeflow.net:443?sni=kr-03.nodeflow.net&alpn=h3#🇰🇷 KR-AnyTLS-Secure`;

const SAMPLE_CLASH_YAML = `# NodeFlow Clash Yaml Format
proxies:
  - name: "🇺🇸 US-VLESS-Premium"
    type: vless
    server: us.nodeflow.net
    port: 443
    uuid: 8e4d0611-6644-460d-94cb-fa293c9d1a3a
    tls: true
  - name: "🇭🇰 HK-Shadowsocks-Pro"
    type: ss
    server: hk.nodeflow.net
    port: 8388
    cipher: aes-256-gcm
    password: "secretpassword"
  - name: "🇸🇬 SG-Trojan-Fast"
    type: trojan
    server: sg.nodeflow.net
    port: 443
    password: "trojanpassword"`;

// Bilingual localization resources
const LOCALES = {
  zh: {
    title: "NodeFlow 订阅转换器",
    subtitle: "多协议代理 Sing-Box 在线转换工具",
    stableBadge: "v1.0.0 预览版",
    rawLines: "行原始数据",
    sourceTitle: "源节点配置信息 / 订阅链接",
    nodeInputPlaceholder: `在此粘贴您的订阅链接内容或节点协议 URL。支持以下协议及格式：
- VMess 链接 (vmess://)
- VLESS 链接 (vless://)
- Shadowsocks 链接 (ss://)
- Trojan 链接 (trojan://)
- Hysteria2 链接 (hysteria2:// 或 hy2://)
- TUIC 链接 (tuic://)
- 完整的 Clash 配置 YAML 文件
- Base64 编码的订阅数据（系统会自动解码）`,
    noteTitle: "关于 Base64 编码：",
    noteText: "标准的网络订阅链接多为 Base64 密文。NodeFlow Converter 会在本地自动检测、实时解密并提取可用节点。",
    onlineImportTitle: "在线导入链接",
    onlineImportDesc: "一键获取第三方代理服务商提供的订阅 URL，无需手动复制节点。",
    subUrlLabel: "订阅链接 URL",
    subUrlPlaceholder: "输入以 http:// 或 https:// 开头的订阅链接...",
    fetchSubBtn: "提取订阅节点",
    fetchingSubBtn: "正在拉取并解析...",
    targetClientSupportTitle: "客户端版本兼容支持",
    targetClientSupportDesc: "转换生成的 JSON 配置经过精细编排，完全契合以下平台的顶级代理客户端规范：",
    allPlatforms: "全平台通用",
    conversionParamsTitle: "自定义转换参数",
    conversionParamsDesc: "根据您的网络偏好与代理规范，灵活自定义 DNS、路由逻辑和规则规则集",
    localCompileBtn: "本地转换 (免流量)",
    aiSmartParseBtn: "Gemini AI 智能解析 (推荐)",
    aiConvertingBtn: "AI 正在智能提取转换...",
    aiErrorTitle: "AI 处理失败",
    schemaTemplateLabel: "目标核心版本/格式",
    dnsStrategyLabel: "DNS 解析策略",
    preconfiguredRulesetsLabel: "预装流水分流规则集",
    blockAdsLabel: "广告屏蔽过滤",
    chinaBypassLabel: "大陆局域网绕过 (直连)",
    successfullyExtractedLabel: "节点提取统计",
    nodesCompiledLabel: "个节点已编译",
    noNodeTypesParsed: "暂无提取节点",
    configJsonPreviewTab: "Sing-Box 配置文件预览 (JSON)",
    nodesListTab: "节点列表明细",
    copyCodeBtn: "复制代码",
    copiedLabel: "复制成功！",
    downloadJsonBtn: "下载 JSON 配置文件",
    filterPlaceholder: "输入节点名称、协议或服务器地址进行模糊检索...",
    colProtocol: "协议类型",
    colNodeName: "节点名称",
    colServerHost: "服务器地址",
    colPort: "端口",
    colTls: "TLS 加密",
    noNodesMatchedSearch: "没有找到符合搜索条件的代理节点。",
    noNodesMatchedPreview: "// 暂未解析到有效的节点。请在上方输入框内粘贴节点、YAML 或拉取外部订阅链接。",
    engineStatusActive: "转换引擎：正常运行",
    apiGatewayOnline: "云端解析服务：已联机",
    uptime: "在线率：99.99%",
    toastCopiedSuccess: "配置文件已成功复制到剪切板！",
    toastCopiedFail: "复制代码失败，请手动选择复制",
    toastDownloadSuccess: "JSON 配置文件下载成功！",
    toastDownloadFail: "下载文件失败，请重试",
    toastSubFetchedSuccess: "在线订阅节点拉取并加载成功！",
    toastSubFetchedFail: "拉取外部订阅失败：",
    toastAiFetchedSuccess: "Gemini AI 已成功解析配置并转换！",
    toastAiFetchedFail: "AI 解析失败：",
    toastLoadedSamples: "已成功加载标准协议 URL 示例",
    toastLoadedClashSamples: "已成功加载 Clash YAML 节点示例",
    toastCleared: "输入数据已清空",
    sampleUriBtn: "节点协议示例",
    sampleClashBtn: "Clash YAML 示例",
    clearBtn: "清空输入",
    emptySubUrlError: "请输入合法的订阅 URL 链接",
    emptyInputTextError: "输入配置内容不能为空",
    subUrlBtn: "订阅链接",
    subModalTitle: "生成订阅链接 & 扫码导入",
    subModalDesc: "您可以通过以下链接直接导入至 Sing-Box、Clash Meta 或其它兼容客户端。此链接由本地节点配置实时在线编译生成：",
    subModalExplain: "使用支持扫码的客户端（例如手机端 Sing-Box 或其它代理软件）扫描下方二维码即可一键导入。",
    subModalCopyBtn: "复制订阅链接",
    subModalCloseBtn: "关闭",
    toastSubLinkCopied: "订阅链接已成功复制到剪切板！"
  },
  en: {
    title: "NodeFlow Converter",
    subtitle: "Multi-Protocol Proxy Converter for Sing-Box",
    stableBadge: "v1.0.0 Preview",
    rawLines: "Raw Lines",
    sourceTitle: "Source Node Configuration",
    nodeInputPlaceholder: `Paste your subscription link content or protocol URLs here. Supports:
- VMess links (vmess://)
- VLESS links (vless://)
- Shadowsocks links (ss://)
- Trojan links (trojan://)
- Hysteria2 links (hysteria2:// or hy2://)
- TUIC links (tuic://)
- Full Clash Configuration YAML files
- Base64 encoded subscription data (will decode automatically)`,
    noteTitle: "Note on Base64:",
    noteText: "Standard online subscription links are encoded in Base64 formats. NodeFlow Converter will automatically inspect and decode this payload on-the-fly.",
    onlineImportTitle: "Online Import Link",
    onlineImportDesc: "Fetch subscription profiles directly from third-party proxy provider nodes to convert.",
    subUrlLabel: "Subscription URL",
    subUrlPlaceholder: "https://example.com/sub/xxx",
    fetchSubBtn: "Fetch Sub Nodes",
    fetchingSubBtn: "Fetching Sub...",
    targetClientSupportTitle: "Target Client Support",
    targetClientSupportDesc: "The compiled configurations are optimized for full platform capability targets:",
    allPlatforms: "All Platforms",
    conversionParamsTitle: "Conversion Parameters",
    conversionParamsDesc: "Customize DNS configuration routing strategies and rulesets",
    localCompileBtn: "Local Compile",
    aiSmartParseBtn: "AI Smart Parse (Gemini)",
    aiConvertingBtn: "AI Converting...",
    aiErrorTitle: "AI Processing Error",
    schemaTemplateLabel: "Target Schema Template",
    dnsStrategyLabel: "DNS Strategy Mode",
    preconfiguredRulesetsLabel: "Preconfigured Rulesets",
    blockAdsLabel: "Block Ads",
    chinaBypassLabel: "China Bypass",
    successfullyExtractedLabel: "Successfully Extracted",
    nodesCompiledLabel: "Nodes Compiled",
    noNodeTypesParsed: "No node types parsed yet",
    configJsonPreviewTab: "Config JSON Preview",
    nodesListTab: "Nodes List Tab",
    copyCodeBtn: "Copy Code",
    copiedLabel: "Copied!",
    downloadJsonBtn: "Download JSON",
    filterPlaceholder: "Filter compiled nodes by name, protocol, or host address...",
    colProtocol: "Protocol",
    colNodeName: "Node Name",
    colServerHost: "Server Host",
    colPort: "Port",
    colTls: "TLS",
    noNodesMatchedSearch: "No nodes match your current search query.",
    noNodesMatchedPreview: "// No active nodes matched or parsed. Add some node links or URLs in the primary input box above.",
    engineStatusActive: "Converter Engine: Active",
    apiGatewayOnline: "API Gateway: Online",
    uptime: "Uptime: 99.99%",
    toastCopiedSuccess: "Configuration copied to clipboard successfully!",
    toastCopiedFail: "Failed to copy to clipboard",
    toastDownloadSuccess: "JSON configuration file downloaded!",
    toastDownloadFail: "Failed to trigger file download",
    toastSubFetchedSuccess: "Subscription successfully fetched and loaded!",
    toastSubFetchedFail: "Fetch error: ",
    toastAiFetchedSuccess: "Gemini AI parsed and converted configuration successfully!",
    toastAiFetchedFail: "AI error: ",
    toastLoadedSamples: "Loaded standard protocol samples",
    toastLoadedClashSamples: "Loaded Clash YAML samples",
    toastCleared: "Cleared input",
    sampleUriBtn: "Sample URI Links",
    sampleClashBtn: "Sample Clash YAML",
    clearBtn: "Clear All",
    emptySubUrlError: "Please enter a subscription URL first",
    emptyInputTextError: "Input text cannot be empty",
    subUrlBtn: "Sub Link",
    subModalTitle: "Subscription Link & QR Code",
    subModalDesc: "You can import this link directly into Sing-Box, Clash Meta, or other compatible clients. Generated in real-time from your raw nodes:",
    subModalExplain: "Scan the QR Code below with your mobile client (e.g. Sing-Box) to import the configuration instantly.",
    subModalCopyBtn: "Copy Sub Link",
    subModalCloseBtn: "Close",
    toastSubLinkCopied: "Subscription link copied to clipboard!"
  }
};

export default function App() {
  // Locale State: Defaulting to 'zh' (Simplified Chinese)
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const t = LOCALES[lang];

  // Primary States
  const [rawInput, setRawInput] = useState(SAMPLE_NODES);
  const [subUrl, setSubUrl] = useState('');
  const [parsedNodes, setParsedNodes] = useState<ProxyNode[]>([]);
  const [singBoxConfig, setSingBoxConfig] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'nodes'>('preview');

  // Parameters
  const [template, setTemplate] = useState<'singbox-latest' | 'singbox-v1.8' | 'clash-meta'>('singbox-latest');
  const [dnsStrategy, setDnsStrategy] = useState<'system' | 'fakeip' | 'custom'>('system');
  const [rulesets, setRulesets] = useState<string[]>(['AD-Block', 'GeoIP:CN']);

  // Loading & feedback statuses
  const [isFetchingSub, setIsFetchingSub] = useState(false);
  const [subFetchError, setSubFetchError] = useState('');
  const [isAiConverting, setIsAiConverting] = useState(false);
  const [aiError, setAiError] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  // Safe base64 encoding supporting UTF-8 for URLs
  const safeBtoa = (str: string): string => {
    try {
      const bytes = new TextEncoder().encode(str);
      let binString = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binString += String.fromCharCode(bytes[i]);
      }
      return btoa(binString);
    } catch (e) {
      return btoa(unescape(encodeURIComponent(str)));
    }
  };

  const getSubLinkUrl = () => {
    const base64Input = safeBtoa(rawInput);
    const rulesetsStr = rulesets.join(',');
    return `${window.location.origin}/api/sub?config=${encodeURIComponent(base64Input)}&template=${template}&dns=${dnsStrategy}&rulesets=${encodeURIComponent(rulesetsStr)}`;
  };

  // Parse local raw nodes whenever input or options change
  useEffect(() => {
    const nodes = parseSubscription(rawInput);
    setParsedNodes(nodes);
    
    // Generate singbox config using offline parser
    const generated = generateSingBoxConfig(nodes, {
      template,
      dnsStrategy,
      rulesets,
    });
    setSingBoxConfig(generated);
  }, [rawInput, template, dnsStrategy, rulesets]);

  // Handle auto-closing notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Copy output to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(singBoxConfig);
      setCopyFeedback(true);
      setNotification({ type: 'success', message: t.toastCopiedSuccess });
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      setNotification({ type: 'error', message: t.toastCopiedFail });
    }
  };

  // Download singbox.json file
  const handleDownload = () => {
    try {
      const blob = new Blob([singBoxConfig], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `singbox_config_${template}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setNotification({ type: 'success', message: t.toastDownloadSuccess });
    } catch (err) {
      setNotification({ type: 'error', message: t.toastDownloadFail });
    }
  };

  const handleCopySubLink = async () => {
    try {
      await navigator.clipboard.writeText(getSubLinkUrl());
      setNotification({ type: 'success', message: t.toastSubLinkCopied });
    } catch (err) {
      setNotification({ type: 'error', message: t.toastCopiedFail });
    }
  };

  // Fetch online subscription via CORS proxy backend
  const handleFetchSubscription = async () => {
    if (!subUrl.trim()) {
      setSubFetchError(t.emptySubUrlError);
      return;
    }

    setIsFetchingSub(true);
    setSubFetchError('');
    try {
      const response = await fetch(`/api/fetch-subscription?url=${encodeURIComponent(subUrl.trim())}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }
      const data = await response.text();
      setRawInput(data);
      setNotification({ type: 'success', message: t.toastSubFetchedSuccess });
    } catch (err: any) {
      console.error(err);
      setSubFetchError(err.message || 'Failed to fetch subscription');
      setNotification({ type: 'error', message: `${t.toastSubFetchedFail}${err.message}` });
    } finally {
      setIsFetchingSub(false);
    }
  };

  // Trigger Gemini AI conversion for complex or unparseable text
  const handleAIConversion = async () => {
    if (!rawInput.trim()) {
      setAiError(t.emptyInputTextError);
      return;
    }

    setIsAiConverting(true);
    setAiError('');
    try {
      const response = await fetch('/api/convert-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawConfig: rawInput,
          options: {
            dnsStrategy,
            rulesets,
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `AI Conversion failed with status ${response.status}`);
      }

      const generatedConfig = await response.json();
      setSingBoxConfig(JSON.stringify(generatedConfig, null, 2));
      
      // Update nodes parsed count if the AI provided standard outbounds
      if (generatedConfig.outbounds && Array.isArray(generatedConfig.outbounds)) {
        const aiNodes: ProxyNode[] = generatedConfig.outbounds
          .filter((ob: any) => ob.type && ob.type !== 'selector' && ob.type !== 'urltest' && ob.type !== 'direct' && ob.type !== 'block' && ob.type !== 'dns')
          .map((ob: any) => ({
            type: ob.type === 'shadowsocks' ? 'ss' : ob.type,
            name: ob.tag || 'AI-Parsed-Node',
            server: ob.server || 'unknown',
            port: ob.server_port || 443,
            raw: JSON.stringify(ob),
          }));
        setParsedNodes(aiNodes);
      }

      setNotification({ type: 'success', message: t.toastAiFetchedSuccess });
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Failed to communicate with AI endpoint. Please check your GEMINI_API_KEY.');
      setNotification({ type: 'error', message: `${t.toastAiFetchedFail}${err.message || 'Failed'}` });
    } finally {
      setIsAiConverting(false);
    }
  };

  // Toggle selected ruleset flags
  const handleToggleRuleset = (ruleset: string) => {
    if (rulesets.includes(ruleset)) {
      setRulesets(rulesets.filter(r => r !== ruleset));
    } else {
      setRulesets([...rulesets, ruleset]);
    }
  };

  // Node type statistics
  const typeCounts = parsedNodes.reduce((acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter nodes according to query
  const filteredNodes = parsedNodes.filter(node => 
    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.server.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg bg-white animate-bounce">
          {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500" />}
          {notification.type === 'info' && <ExternalLink className="w-5 h-5 text-indigo-500" />}
          <span className="text-sm font-semibold text-slate-700 text-center">{notification.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-150">
            <ArrowLeftRight className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 font-display">
              NodeFlow <span className="text-indigo-600">Converter</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">{t.subtitle}</p>
          </div>
        </div>

        {/* Global actions, language toggle and badge */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Language Switch Toggle Button */}
          <div className="flex bg-slate-100 p-1 border border-slate-200 rounded-lg mr-2">
            <button
              onClick={() => setLang('zh')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                lang === 'zh'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              简体中文
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                lang === 'en'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              English
            </button>
          </div>

          <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg">
            {t.stableBadge}
          </span>
          <button
            onClick={() => {
              setRawInput(SAMPLE_NODES);
              setNotification({ type: 'info', message: t.toastLoadedSamples });
            }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            {t.sampleUriBtn}
          </button>
          <button
            onClick={() => {
              setRawInput(SAMPLE_CLASH_YAML);
              setNotification({ type: 'info', message: t.toastLoadedClashSamples });
            }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            {t.sampleClashBtn}
          </button>
          <button
            onClick={() => {
              setRawInput('');
              setParsedNodes([]);
              setSingBoxConfig('');
              setNotification({ type: 'info', message: t.toastCleared });
            }}
            className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-900 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
          >
            {t.clearBtn}
          </button>
        </div>
      </nav>

      {/* Bento Grid Body */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl w-full mx-auto">
        
        {/* Row 1 / Col 1 & 2: Primary Input Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col shadow-sm gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center gap-2 font-display text-slate-800">
              <Terminal className="w-5 h-5 text-indigo-500" />
              {t.sourceTitle}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-150">
                {rawInput.split('\n').filter(l => l.trim()).length} {t.rawLines}
              </span>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                {(rawInput.length / 1024).toFixed(2)} KB
              </span>
            </div>
          </div>

          <div className="relative flex-1 min-h-[300px] flex flex-col">
            <textarea
              id="raw-node-input"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={t.nodeInputPlaceholder}
              className="w-full flex-1 p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-sm leading-relaxed border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 overflow-y-auto resize-none min-h-[250px]"
            />
            {rawInput.trim() && (
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(rawInput);
                    setNotification({ type: 'success', message: t.toastCopiedSuccess });
                  }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md transition-colors border border-slate-700 cursor-pointer"
                  title="Copy Source"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
          <div className="text-xs text-slate-400 leading-normal flex items-start gap-1 bg-slate-50 p-3 rounded-lg border border-slate-150">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              <strong>{t.noteTitle}</strong> {t.noteText}
            </span>
          </div>
        </div>

        {/* Column 3: Secondary Cards Side Stack */}
        <div className="flex flex-col gap-6">
          
          {/* Card 1: Online Import */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-500" />
              <h3 className="text-base font-bold text-slate-800 font-display">{t.onlineImportTitle}</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.onlineImportDesc}
            </p>

            <div className="space-y-3">
              <div>
                <label htmlFor="sub-url-input" className="text-xs font-semibold text-slate-600 block mb-1">
                  {t.subUrlLabel}
                </label>
                <div className="flex gap-2">
                  <input
                    id="sub-url-input"
                    type="url"
                    value={subUrl}
                    onChange={(e) => setSubUrl(e.target.value)}
                    placeholder={t.subUrlPlaceholder}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {subFetchError && (
                <div className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 p-2.5 rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{subFetchError}</span>
                </div>
              )}

              <button
                onClick={handleFetchSubscription}
                disabled={isFetchingSub}
                className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 hover:border-indigo-300 transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50"
              >
                {isFetchingSub ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t.fetchingSubBtn}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {t.fetchSubBtn}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: Platform Support Status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-500" />
              <h3 className="text-base font-bold text-slate-800 font-display">{t.targetClientSupportTitle}</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.targetClientSupportDesc}
            </p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-150 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-semibold text-slate-700">Clash / Mihomo</span>
                </div>
                <span className="text-xs text-slate-400 font-medium">Win / macOS / Linux</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-150 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-semibold text-slate-700">Surge</span>
                </div>
                <span className="text-xs text-slate-400 font-medium">iOS / macOS</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-150 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-semibold text-slate-700">Quantumult X</span>
                </div>
                <span className="text-xs text-slate-400 font-medium">iOS / iPadOS</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-indigo-50 border border-indigo-150 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                  <span className="font-bold text-indigo-900">Sing-Box v1.8+</span>
                </div>
                <span className="text-xs text-indigo-600 font-bold bg-indigo-100/50 px-2 py-0.5 rounded">{t.allPlatforms}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 / Full-width: Parameters Selection & Stats */}
        <div className="col-span-1 lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 font-display text-slate-800">
                <Sliders className="w-5 h-5 text-indigo-500" />
                {t.conversionParamsTitle}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{t.conversionParamsDesc}</p>
            </div>
            
            {/* Control buttons */}
            <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
              {/* Local quick compile button */}
              <button
                onClick={() => {
                  const nodes = parseSubscription(rawInput);
                  setParsedNodes(nodes);
                  const config = generateSingBoxConfig(nodes, { template, dnsStrategy, rulesets });
                  setSingBoxConfig(config);
                  setNotification({ type: 'success', message: `${t.successfullyExtractedLabel}: ${nodes.length}` });
                }}
                className="flex-1 md:flex-none px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                {t.localCompileBtn}
              </button>

              {/* Advanced Gemini AI compiler button */}
              <button
                onClick={handleAIConversion}
                disabled={isAiConverting}
                className="flex-1 md:flex-none px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:opacity-95 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                title="Use Gemini AI to extract nodes from complex or non-standard configurations intelligently"
              >
                {isAiConverting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    {t.aiConvertingBtn}
                  </>
                ) : (
                  <>
                    <Cpu className="w-4 h-4 text-cyan-200 animate-pulse" />
                    {t.aiSmartParseBtn}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI conversion errors */}
          {aiError && (
            <div className="text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-3.5 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
              <div>
                <p className="font-bold">{t.aiErrorTitle}</p>
                <p className="text-xs text-rose-500 font-medium mt-1">{aiError}</p>
              </div>
            </div>
          )}

          {/* Param Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
            
            {/* Setting 1: Schema Template */}
            <div className="space-y-1.5">
              <label htmlFor="template-select" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {t.schemaTemplateLabel}
              </label>
              <select
                id="template-select"
                value={template}
                onChange={(e) => setTemplate(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="singbox-latest">Sing-Box Latest (Default)</option>
                <option value="singbox-v1.8">Sing-Box v1.8+</option>
                <option value="clash-meta">Clash Meta Profile</option>
              </select>
            </div>

            {/* Setting 2: DNS routing mode */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {t.dnsStrategyLabel}
              </span>
              <div className="flex bg-slate-50 p-1 border border-slate-200 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDnsStrategy('system')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    dnsStrategy === 'system'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  System DNS
                </button>
                <button
                  type="button"
                  onClick={() => setDnsStrategy('fakeip')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    dnsStrategy === 'fakeip'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  FakeIP DNS
                </button>
              </div>
            </div>

            {/* Setting 3: Standard Rulesets */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {t.preconfiguredRulesetsLabel}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleRuleset('AD-Block')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    rulesets.includes('AD-Block')
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  {t.blockAdsLabel}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleRuleset('GeoIP:CN')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    rulesets.includes('GeoIP:CN')
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  {t.chinaBypassLabel}
                </button>
              </div>
            </div>

            {/* Status 4: Parsed Nodes Counters */}
            <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-4 flex flex-col justify-between">
              <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                {t.successfullyExtractedLabel}
              </div>
              <div className="flex items-baseline gap-2.5 mt-2">
                <span className="text-3xl font-extrabold text-indigo-950 font-display tracking-tight">
                  {parsedNodes.length}
                </span>
                <span className="text-xs text-indigo-600 font-semibold bg-indigo-100 px-2 py-0.5 rounded">
                  {t.nodesCompiledLabel}
                </span>
              </div>
              
              {/* Micro badge split list */}
              <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-indigo-100/50">
                {Object.entries(typeCounts).map(([type, count]) => (
                  <span key={type} className="bg-white/80 text-[10px] text-slate-600 font-bold px-1.5 py-0.5 rounded border border-indigo-50">
                    {type.toUpperCase()}: {count}
                  </span>
                ))}
                {parsedNodes.length === 0 && (
                  <span className="text-[10px] text-slate-400 italic">{t.noNodeTypesParsed}</span>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Row 3 / Col 1 to 3: Compilation output box */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            
            {/* Tab links */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.configJsonPreviewTab}
              </button>
              <button
                onClick={() => setActiveTab('nodes')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'nodes'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t.nodesListTab}
                <span className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {parsedNodes.length}
                </span>
              </button>
            </div>

            {/* Quick configuration copy button / download */}
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
              {singBoxConfig && (
                <>
                  <span className="text-xs text-slate-400 font-medium">
                    Output size: {(singBoxConfig.length / 1024).toFixed(2)} KB
                  </span>
                  
                  <button
                    onClick={handleCopy}
                    className="p-2 bg-slate-100 text-slate-700 hover:text-indigo-600 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-bold"
                  >
                    {copyFeedback ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        {t.copiedLabel}
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        {t.copyCodeBtn}
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownload}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-bold shadow-sm shadow-indigo-100"
                  >
                    <Download className="w-4 h-4" />
                    {t.downloadJsonBtn}
                  </button>

                  <button
                    onClick={() => setIsSubModalOpen(true)}
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-bold shadow-sm shadow-emerald-100"
                  >
                    <QrCode className="w-4 h-4" />
                    {t.subUrlBtn}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tab Content 1: Code Output Block */}
          {activeTab === 'preview' && (
            <div className="relative">
              <pre className="bg-slate-900 text-slate-200 p-5 rounded-xl font-mono text-xs overflow-x-auto max-h-[500px] leading-relaxed border border-slate-800">
                <code>{singBoxConfig || t.noNodesMatchedPreview}</code>
              </pre>
            </div>
          )}

          {/* Tab Content 2: Active Nodes Table */}
          {activeTab === 'nodes' && (
            <div className="space-y-4">
              
              {/* Table search filter */}
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={t.filterPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none w-full text-sm text-slate-700 placeholder-slate-400"
                />
              </div>

              {/* Table frame */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm text-left text-slate-500">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-6 py-3 font-bold text-slate-600">{t.colProtocol}</th>
                      <th scope="col" className="px-6 py-3 font-bold text-slate-600">{t.colNodeName}</th>
                      <th scope="col" className="px-6 py-3 font-bold text-slate-600">{t.colServerHost}</th>
                      <th scope="col" className="px-6 py-3 font-bold text-slate-600">{t.colPort}</th>
                      <th scope="col" className="px-6 py-3 font-bold text-slate-600 text-right">{t.colTls}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNodes.map((node, idx) => (
                      <tr key={idx} className="bg-white border-b border-slate-100 hover:bg-slate-50/50 text-slate-700 font-medium">
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            node.type === 'vmess' ? 'bg-indigo-50 border-indigo-150 text-indigo-600' :
                            node.type === 'vless' ? 'bg-cyan-50 border-cyan-150 text-cyan-600' :
                            node.type === 'ss' ? 'bg-amber-50 border-amber-150 text-amber-600' :
                            node.type === 'trojan' ? 'bg-rose-50 border-rose-150 text-rose-600' :
                            node.type === 'hysteria2' ? 'bg-emerald-50 border-emerald-150 text-emerald-600' :
                            node.type === 'tuic' ? 'bg-fuchsia-50 border-fuchsia-150 text-fuchsia-600' :
                            node.type === 'anytls' ? 'bg-teal-50 border-teal-150 text-teal-600' :
                            'bg-slate-100 border-slate-200 text-slate-600'
                          }`}>
                            {node.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-slate-900 font-bold">{node.name}</td>
                        <td className="px-6 py-3 font-mono text-xs">{node.server}</td>
                        <td className="px-6 py-3 font-mono text-xs">{node.port}</td>
                        <td className="px-6 py-3 text-right">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${node.tls ? 'bg-emerald-500' : 'bg-slate-300'}`} title={node.tls ? 'TLS Enabled' : 'No TLS'} />
                        </td>
                      </tr>
                    ))}
                    {filteredNodes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic bg-slate-50/50">
                          {t.noNodesMatchedSearch}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </main>

      {/* Footer copyright */}
      <footer className="mt-auto px-8 py-4 bg-white border-t border-slate-200 text-slate-400 text-xs flex flex-col md:flex-row justify-between items-center gap-4">
        <span>© 2026 NodeFlow Open Source Project. Licensed under MIT.</span>
        <div className="flex gap-6 font-semibold text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {t.engineStatusActive}
          </span>
          <span>{t.apiGatewayOnline}</span>
          <span>{t.uptime}</span>
        </div>
      </footer>

      {/* Subscription Link & QR Code Modal */}
      {isSubModalOpen && (
        <div id="sub-qr-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 relative flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold font-display text-slate-800 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                {t.subModalTitle}
              </h3>
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              {t.subModalDesc}
            </p>

            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-150">
              <input
                type="text"
                readOnly
                value={getSubLinkUrl()}
                className="bg-transparent text-xs font-mono text-slate-600 flex-1 outline-none select-all"
              />
              <button
                onClick={handleCopySubLink}
                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors border border-emerald-150 flex items-center gap-1 cursor-pointer text-xs font-bold"
              >
                <Copy className="w-3.5 h-3.5" />
                {t.copyCodeBtn}
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed text-center">
              {t.subModalExplain}
            </p>

            <div className="flex flex-col items-center justify-center bg-slate-50 p-4 rounded-xl border border-slate-150 self-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getSubLinkUrl())}`}
                alt="Subscription Link QR Code"
                referrerPolicy="no-referrer"
                className="w-44 h-44 bg-white p-2 rounded-lg border border-slate-200"
              />
            </div>

            <div className="flex justify-end mt-2">
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                {t.subModalCloseBtn}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
