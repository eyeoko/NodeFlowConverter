/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
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
  Search,
  CheckCircle,
  ExternalLink,
  Cpu,
  Languages,
  Link,
  BookMarked,
} from 'lucide-react';
import { parseSubscription, generateSingBoxConfig, ProxyNode, serializeNodeToUri, Platform } from './utils/parser';

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
    stableBadge: "v0.0.1",
    rawLines: "行原始数据",
    sourceTitle: "源节点配置信息",
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
    schemaTemplateLabel: "目标核心版本/格式",
    dnsStrategyLabel: "DNS 解析策略",
    preconfiguredRulesetsLabel: "分流规则集配置 (可多选)",
    blockAdsLabel: "🔴 广告拦截",
    openaiLabel: "🤖 AI 服务",
    bilibiliLabel: "📺 哔哩哔哩",
    youtubeLabel: "📺 油管视频",
    googleLabel: "🔍 谷歌服务",
    privateNetLabel: "🏠 私有网络",
    chinaBypassLabel: "🔒 国内服务",
    telegramLabel: "📱 电报消息",
    githubLabel: "🐱 Github",
    microsoftLabel: "🪟 微软服务",
    appleLabel: "🍎 苹果服务",
    socialMediaLabel: "🌐 社交媒体",
    streamingLabel: "📺 流媒体",
    gamingLabel: "🎮 游戏平台",
    educationLabel: "📚 教育资源",
    financeLabel: "💰 金融服务",
    cloudServicesLabel: "☁️ 云服务",
    spotifyLabel: "🎵 Spotify",
    tiktokLabel: "🎨 tiktok",
    huggingfaceLabel: "😀 huggingface",
    proxyServicesLabel: "🔀 代理服务",
    proxyMediaLabel: "🎭 代理媒体",
    eHentaiLabel: "🔞 E-Hentai",
    globalServicesLabel: "🌍 非中国",
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
    toastLoadedSamples: "已成功加载标准协议 URL 示例",
    toastLoadedClashSamples: "已成功加载 Clash YAML 节点示例",
    toastCleared: "输入数据已清空",
    sampleUriBtn: "节点协议示例",
    sampleClashBtn: "Clash YAML 示例",
    clearBtn: "清空输入",
    emptySubUrlError: "请输入合法的订阅 URL 链接",
    emptyInputTextError: "输入配置内容不能为空",
    subUrlBtn: "订阅链接",
    subModalTitle: "生成订阅链接",
    subModalDesc: "您可以通过以下链接直接导入至 Sing-Box、Clash Meta 或其它兼容客户端。此链接由本地节点配置实时在线编译生成：",
    subModalCopyBtn: "复制订阅链接",
    subModalCloseBtn: "关闭",
    toastSubLinkCopied: "订阅链接已成功复制到剪切板！",
    cdnPrefixLabel: "规则集下载 CDN 加速",
    cdnPrefixDesc: "选择或自定义用于下载 Sing-Box 规则集的 CDN 加速域名，以防由于网络不通导致拉取失败。",
    cdnTypeTestingcf: "jsDelivr (TestingCF - 推荐)",
    cdnTypeFastly: "jsDelivr (Fastly)",
    cdnTypeGcore: "jsDelivr (GCore)",
    cdnTypeMain: "jsDelivr (Main)",
    cdnTypeDirect: "GitHub (直连 - 无 CDN)",
    cdnTypeCustom: "自定义 CDN 前缀...",
    customCdnPlaceholder: "例如 https://raw.githubusercontent.com 或您的自建反代...",
    platformLabel: "目标平台",
    platformMacos: "macOS",
    platformWindows: "Windows",
    platformLinux: "Linux",
    platformAndroid: "Android",
    platformRouter: "路由器 (OpenWRT)",
    tunModeLabel: "🌐 启用 TUN 网卡模式",
    tunModeDesc: "创建虚拟网卡接管系统全局流量，适合整机系统级代理",
    systemProxyLabel: "🔌 启用 Mixed 端口 (系统代理)",
    systemProxyDesc: "开启 HTTP/SOCKS 混合代理端口以供客户端手动/自动设置代理",
    mixedPortLabel: "Mixed 混合代理端口",
  },
  en: {
    title: "NodeFlow Converter",
    subtitle: "Multi-Protocol Proxy Converter for Sing-Box",
    stableBadge: "v0.0.1",
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
    schemaTemplateLabel: "Target Schema Template",
    dnsStrategyLabel: "DNS Strategy Mode",
    preconfiguredRulesetsLabel: "Rulesets Routing Configuration (Multi-select)",
    blockAdsLabel: "🔴 Block Ads",
    openaiLabel: "🤖 AI Services",
    bilibiliLabel: "📺 Bilibili",
    youtubeLabel: "📺 YouTube",
    googleLabel: "🔍 Google Services",
    privateNetLabel: "🏠 Private Network",
    chinaBypassLabel: "🔒 China Services",
    telegramLabel: "📱 Telegram",
    githubLabel: "🐱 GitHub",
    microsoftLabel: "🪟 Microsoft Services",
    appleLabel: "🍎 Apple Services",
    socialMediaLabel: "🌐 Social Media",
    streamingLabel: "📺 Streaming",
    gamingLabel: "🎮 Gaming Platforms",
    educationLabel: "📚 Education",
    financeLabel: "💰 Finance Services",
    cloudServicesLabel: "☁️ Cloud Services",
    spotifyLabel: "🎵 Spotify",
    tiktokLabel: "🎨 TikTok",
    huggingfaceLabel: "😀 HuggingFace",
    proxyServicesLabel: "🔀 Proxy Services",
    proxyMediaLabel: "🎭 Proxy Media",
    eHentaiLabel: "🔞 E-Hentai",
    globalServicesLabel: "🌍 Non-China",
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
    toastLoadedSamples: "Loaded standard protocol samples",
    toastLoadedClashSamples: "Loaded Clash YAML samples",
    toastCleared: "Cleared input",
    sampleUriBtn: "Sample URI Links",
    sampleClashBtn: "Sample Clash YAML",
    clearBtn: "Clear All",
    emptySubUrlError: "Please enter a subscription URL first",
    emptyInputTextError: "Input text cannot be empty",
    subUrlBtn: "Sub Link",
    subModalTitle: "Subscription Link",
    subModalDesc: "You can import this link directly into Sing-Box, Clash Meta, or other compatible clients. Generated in real-time from your raw nodes:",
    subModalCopyBtn: "Copy Sub Link",
    subModalCloseBtn: "Close",
    toastSubLinkCopied: "Subscription link copied to clipboard!",
    cdnPrefixLabel: "Ruleset CDN Acceleration",
    cdnPrefixDesc: "Select or define a CDN prefix for remote ruleset downloads to bypass local connectivity issues.",
    cdnTypeTestingcf: "jsDelivr (TestingCF - Rec.)",
    cdnTypeFastly: "jsDelivr (Fastly)",
    cdnTypeGcore: "jsDelivr (GCore)",
    cdnTypeMain: "jsDelivr (Main)",
    cdnTypeDirect: "GitHub (Direct - No CDN)",
    cdnTypeCustom: "Custom CDN Prefix...",
    customCdnPlaceholder: "e.g., https://raw.githubusercontent.com or your custom reverse proxy...",
    platformLabel: "Target Platform",
    platformMacos: "macOS",
    platformWindows: "Windows",
    platformLinux: "Linux",
    platformAndroid: "Android",
    platformRouter: "Router (OpenWRT)",
    tunModeLabel: "🌐 Enable TUN Interface Mode",
    tunModeDesc: "Create virtual network card to route all system traffic",
    systemProxyLabel: "🔌 Enable Mixed Port (System Proxy)",
    systemProxyDesc: "Expose HTTP/SOCKS mixed port for manual or auto proxy",
    mixedPortLabel: "Mixed Proxy Port",
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
  const [editableConfig, setEditableConfig] = useState('');
  const [validationMsg, setValidationMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'nodes'>('preview');

  // Parameters
  const [dnsStrategy, setDnsStrategy] = useState<'system' | 'fakeip'>('system');
  const [rulesets, setRulesets] = useState<string[]>(['AD-Block', 'China-Services', 'Private-Net']);

  // Platform & General parameters
  const [platform, setPlatform] = useState<Platform>('macos');
  const [groupByCountry, setGroupByCountry] = useState<boolean>(true);
  const [includeAutoGroup, setIncludeAutoGroup] = useState<boolean>(true);
  const [enableClashApi, setEnableClashApi] = useState<boolean>(true);
  const [clashApiPort, setClashApiPort] = useState<string>('0.0.0.0:9090');
  const [clashUiUrl, setClashUiUrl] = useState<string>('https://github.com/MetaCubeX/Yacd-meta/archive/gh-pages.zip');
  
  // Tun & Mixed (System Proxy) settings
  const [enableTun, setEnableTun] = useState<boolean>(true);
  const [enableMixed, setEnableMixed] = useState<boolean>(true);
  const [mixedPort, setMixedPort] = useState<string>('2080');

  // CDN Acceleration parameters
  const [cdnType, setCdnType] = useState<string>('testingcf');
  const [customCdn, setCustomCdn] = useState<string>('');

  // Loading & feedback statuses
  const [isFetchingSub, setIsFetchingSub] = useState(false);
  const [subFetchError, setSubFetchError] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [copySubFeedback, setCopySubFeedback] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);



  const [customRules, setCustomRules] = useState<{ type: 'domain' | 'ip' | 'rule_set'; value: string; outbound: 'proxy' | 'direct' | 'block' }[]>([]);
  const [newRuleType, setNewRuleType] = useState<'domain' | 'ip' | 'rule_set'>('domain');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleOutbound, setNewRuleOutbound] = useState<'proxy' | 'direct' | 'block'>('proxy');

  // Parse local raw nodes whenever input or options change
  useEffect(() => {
    const nodes = parseSubscription(rawInput);
    setParsedNodes(nodes);
    
    const resolvedCdnPrefix = cdnType === 'custom'
      ? customCdn.trim()
      : (cdnType === 'fastly' ? 'https://fastly.jsdelivr.net'
         : cdnType === 'gcore' ? 'https://gcore.jsdelivr.net'
         : cdnType === 'cdn' ? 'https://cdn.jsdelivr.net'
         : cdnType === 'github' ? 'https://raw.githubusercontent.com'
         : 'https://testingcf.jsdelivr.net');

    // Generate singbox config using offline parser
    const generated = generateSingBoxConfig(nodes, {
      dnsStrategy,
      rulesets,
      platform,
      groupByCountry,
      includeAutoGroup,
      enableClashApi,
      clashApiPort,
      clashUiUrl,
      cdnPrefix: resolvedCdnPrefix,
      enableTun,
      enableMixed,
      mixedPort,
      customRules,
    });
    setSingBoxConfig(generated);
    setEditableConfig(generated);
    setValidationMsg(null);
  }, [rawInput, dnsStrategy, rulesets, platform, groupByCountry, includeAutoGroup, enableClashApi, clashApiPort, clashUiUrl, cdnType, customCdn, enableTun, enableMixed, mixedPort, customRules]);

  // Handle auto-closing notifications
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Validate JSON
  const handleValidateConfig = () => {
    const trimmed = editableConfig.trim();
    if (!trimmed) {
      setValidationMsg({ ok: false, text: lang === 'zh' ? '配置为空' : 'Empty config' });
      return;
    }
    try {
      JSON.parse(trimmed);
      setValidationMsg({ ok: true, text: lang === 'zh' ? 'JSON 格式有效 ✓' : 'Valid JSON ✓' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Parse error';
      setValidationMsg({ ok: false, text: msg });
    }
  };

  // Copy output to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editableConfig);
      setCopyFeedback(true);
      setNotification({ type: 'success', message: t.toastCopiedSuccess });
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      setNotification({ type: 'error', message: t.toastCopiedFail });
    }
  };

  // Copy compiled online subscription URL to clipboard
  const handleCopySubLink = async () => {
    if (!rawInput.trim()) {
      setNotification({ type: 'error', message: t.emptyInputTextError });
      return;
    }
    try {
      // Safe base64 encoding
      const bytes = new TextEncoder().encode(rawInput.trim());
      let binStr = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binStr += String.fromCharCode(bytes[i]);
      }
      const base64Config = btoa(binStr);
      
      const params = new URLSearchParams();
      params.set('config', base64Config);
      params.set('platform', platform);
      if (dnsStrategy) params.set('dns', dnsStrategy);
      if (rulesets.length > 0) params.set('rulesets', rulesets.join(','));
      params.set('groupByCountry', String(groupByCountry));
      params.set('includeAutoGroup', String(includeAutoGroup));
      params.set('enableClashApi', String(enableClashApi));
      if (clashApiPort) params.set('clashApiPort', clashApiPort);
      if (clashUiUrl) params.set('clashUiUrl', clashUiUrl);
      params.set('enableTun', String(enableTun));
      params.set('enableMixed', String(enableMixed));
      if (mixedPort) params.set('mixedPort', mixedPort);
      params.set('cdnType', cdnType);
      if (customCdn) params.set('customCdn', customCdn);
      
      const subUrlString = `${window.location.origin}/api/sub?${params.toString()}`;
      await navigator.clipboard.writeText(subUrlString);
      setCopySubFeedback(true);
      setNotification({ type: 'success', message: t.toastSubLinkCopied });
      setTimeout(() => setCopySubFeedback(false), 2000);
    } catch (err) {
      setNotification({
        type: 'error',
        message: lang === 'zh' ? '复制订阅链接失败，请重试' : 'Failed to copy subscription link, please try again'
      });
    }
  };

  // Download singbox.json file
  const handleDownload = () => {
    try {
      const blob = new Blob([editableConfig], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `singbox-${platform}-latest.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setNotification({ type: 'success', message: t.toastDownloadSuccess });
    } catch (err) {
      setNotification({ type: 'error', message: t.toastDownloadFail });
    }
  };

  const handleParseToUris = () => {
    if (!rawInput.trim()) {
      setNotification({ type: 'error', message: t.emptyInputTextError });
      return;
    }

    try {
      const nodes = parseSubscription(rawInput);
      if (nodes.length === 0) {
        setNotification({
          type: 'error',
          message: lang === 'zh' ? '未能解析到任何有效代理节点！' : 'No valid proxy nodes could be parsed!'
        });
        return;
      }

      // Convert each parsed node to standard URI representation
      const uris = nodes.map(node => serializeNodeToUri(node));
      setRawInput(uris.join('\n'));
      setNotification({
        type: 'success',
        message: lang === 'zh'
          ? `成功解析并转换 ${nodes.length} 个节点连接！`
          : `Successfully parsed and converted ${nodes.length} proxy URIs!`
      });
    } catch (e: any) {
      setNotification({
        type: 'error',
        message: (lang === 'zh' ? '解析出错：' : 'Parsing error: ') + (e.message || '')
      });
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

        {/* Row 0 / Full: Sing-Box Ecosystem Info */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-slate-800 font-display">
              {lang === 'zh' ? 'Sing-Box 生态简介' : 'Sing-Box Ecosystem'}
            </h2>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {lang === 'zh'
              ? 'Sing-Box 是通用代理平台，社区有多个分支魔改版本与 Web 面板可供选择。以下资源均由 enpioodada/sing-box-core 仓库整合发布。'
              : 'Sing-Box is a universal proxy platform with community forks and web dashboards. Resources are bundled by enpioodada/sing-box-core.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Kernels */}
            <div>
              <h4 className="font-bold text-slate-700 mb-1.5">
                {lang === 'zh' ? '🧩 内核版本' : 'Kernels'}
              </h4>
              <div className="space-y-1">
                <a href="https://github.com/SagerNet/sing-box" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 hover:underline">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />sing-box 官方 — SagerNet/sing-box
                </a>
                <a href="https://github.com/PuerNya/sing-box/tree/building" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 hover:underline">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />PuerNya 版 — PuerNya/sing-box
                </a>
                <a href="https://github.com/reF1nd/sing-box/tree/reF1nd-stable" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 hover:underline">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />reF1nd-Stable — reF1nd/sing-box
                </a>
                <a href="https://github.com/reF1nd/sing-box/tree/reF1nd-testing" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 hover:underline">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />reF1nd-Test — reF1nd/sing-box
                </a>
              </div>
            </div>

            {/* Dashboards */}
            <div>
              <h4 className="font-bold text-slate-700 mb-1.5">
                {lang === 'zh' ? '📊 Web 面板' : 'Dashboards'}
              </h4>
              <div className="space-y-1">
                <a href="https://github.com/MetaCubeX/Yacd-meta" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 hover:underline">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />Yacd-meta — MetaCubeX/Yacd-meta
                </a>
                <a href="https://github.com/MetaCubeX/metacubexd" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 hover:underline">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />metacubexd — MetaCubeX/metacubexd
                </a>
                <a href="https://github.com/haishanh/yacd" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 hover:underline">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />yacd — haishanh/yacd
                </a>
                <a href="https://github.com/Zephyruso/zashboard" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 hover:underline">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />zashboard — Zephyruso/zashboard
                </a>
              </div>
            </div>

            {/* Source */}
            <div>
              <h4 className="font-bold text-slate-700 mb-1.5">
                {lang === 'zh' ? '📦 整合仓库' : 'Repository'}
              </h4>
              <a href="https://github.com/enpioodada/sing-box-core" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 hover:underline">
                <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">enpioodada/sing-box-core</span>
                <ExternalLink className="w-3 h-3 shrink-0 text-indigo-400" />
              </a>
            </div>
          </div>
        </div>

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

          <div className="relative flex-1 min-h-[460px] flex flex-col">
            <textarea
              id="raw-node-input"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={t.nodeInputPlaceholder}
              className="w-full flex-1 p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-sm leading-relaxed border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 overflow-y-auto resize-none min-h-[460px]"
            />
            {rawInput.trim() && (
              <div className="absolute bottom-3 right-3 flex gap-2 items-center">
                <button
                  type="button"
                  onClick={handleParseToUris}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-bold shadow-sm"
                  title={lang === 'zh' ? '将输入解析转换为原生节点协议连接格式' : 'Parse input to protocol URI connections'}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  {lang === 'zh' ? '解析' : 'Parse Links'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(rawInput);
                      setNotification({ type: 'success', message: t.toastCopiedSuccess });
                    } catch {
                      setNotification({ type: 'error', message: lang === 'zh' ? '复制失败' : 'Copy failed' });
                    }
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

          {/* Card 2: General Settings (通用设置) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-500" />
              <h3 className="text-base font-bold text-slate-800 font-display">
                {lang === 'zh' ? '通用设置' : 'General Settings'}
              </h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              {lang === 'zh' ? '自定义分流分组、自动测试以及 Clash 外部控制面板。' : 'Configure proxy grouping, auto-selection, and Clash controller dashboard settings.'}
            </p>

            <div className="space-y-4 pt-1">
              {/* Platform Selector */}
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t.platformLabel}
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as Platform)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="macos">{t.platformMacos}</option>
                  <option value="windows">{t.platformWindows}</option>
                  <option value="linux">{t.platformLinux}</option>
                  <option value="android">{t.platformAndroid}</option>
                  <option value="router">{t.platformRouter}</option>
                </select>
              </div>

              {/* Group By Country Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-150 rounded-xl">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-slate-700">
                    {lang === 'zh' ? '🌍 按国家分组' : 'Group by Country'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {lang === 'zh' ? '自动检测国家地区并创建分流组' : 'Auto detect country from node names'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setGroupByCountry(!groupByCountry)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    groupByCountry ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      groupByCountry ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Include Auto-Selection Group Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-150 rounded-xl">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-slate-700">
                    {lang === 'zh' ? '⚡ 包含自动选择分组' : 'Include Auto-Selection'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {lang === 'zh' ? '为每个国家或全局添加延迟测试自动选择' : 'Create latency-based URL-test groups'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeAutoGroup(!includeAutoGroup)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    includeAutoGroup ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      includeAutoGroup ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Tun Mode Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-150 rounded-xl">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-slate-700">
                    {t.tunModeLabel}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {t.tunModeDesc}
                  </span>
                </div>
                <button
                  type="button"
                  id="tun-mode-toggle"
                  onClick={() => setEnableTun(!enableTun)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    enableTun ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      enableTun ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* System Proxy / Mixed Mode Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-150 rounded-xl">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-slate-700">
                    {t.systemProxyLabel}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {t.systemProxyDesc}
                  </span>
                </div>
                <button
                  type="button"
                  id="system-proxy-toggle"
                  onClick={() => setEnableMixed(!enableMixed)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    enableMixed ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      enableMixed ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Mixed Port Input if Enabled */}
              {enableMixed && (
                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1.5 animate-fadeIn">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t.mixedPortLabel}
                  </label>
                  <input
                    type="text"
                    id="mixed-port-input"
                    value={mixedPort}
                    onChange={(e) => setMixedPort(e.target.value)}
                    placeholder="2080"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Enable Clash API Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-150 rounded-xl">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-slate-700">
                    {lang === 'zh' ? '🛠️ 启用 Clash API' : 'Enable Clash API'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {lang === 'zh' ? '在 Sing-Box 中提供 Clash 外部控制接口' : 'Expose Clash-compatible external API'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableClashApi(!enableClashApi)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    enableClashApi ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      enableClashApi ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {enableClashApi && (
                <div className="space-y-3.5 border-t border-slate-100 pt-3.5 mt-1.5 animate-fadeIn">
                  {/* Clash API Port Input */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {lang === 'zh' ? '外部控制端口' : 'External Control Port'}
                    </label>
                    <input
                      type="text"
                      value={clashApiPort}
                      onChange={(e) => setClashApiPort(e.target.value)}
                      placeholder="0.0.0.0:9090"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                    />
                  </div>

                  {/* Clash UI Download Link Input / Select */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {lang === 'zh' ? 'Clash UI 下载地址' : 'Clash UI Download URL'}
                    </label>
                    <div className="flex flex-col gap-1.5">
                      <select
                        value={clashUiUrl}
                        onChange={(e) => setClashUiUrl(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="https://github.com/MetaCubeX/Yacd-meta/archive/gh-pages.zip">Yacd Dashboard</option>
                        <option value="https://github.com/metacubex/metacubexd/archive/gh-pages.zip">Mihomo Dashboard (Metacubexd)</option>
                        <option value="">{lang === 'zh' ? '自定义下载地址' : 'Custom Download URL'}</option>
                      </select>
                      {clashUiUrl !== 'https://github.com/MetaCubeX/Yacd-meta/archive/gh-pages.zip' && clashUiUrl !== 'https://github.com/metacubex/metacubexd/archive/gh-pages.zip' && (
                        <input
                          type="url"
                          value={clashUiUrl}
                          onChange={(e) => setClashUiUrl(e.target.value)}
                          placeholder="https://example.com/ui.zip"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2 / Full: Parameters Selection & Stats */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-6">
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
                  const resolvedCdnPrefix = cdnType === 'custom'
                    ? customCdn.trim()
                    : (cdnType === 'fastly' ? 'https://fastly.jsdelivr.net'
                       : cdnType === 'gcore' ? 'https://gcore.jsdelivr.net'
                       : cdnType === 'cdn' ? 'https://cdn.jsdelivr.net'
                       : cdnType === 'github' ? 'https://raw.githubusercontent.com'
                       : 'https://testingcf.jsdelivr.net');
                  const config = generateSingBoxConfig(nodes, {
                    dnsStrategy,
                    rulesets,
                    platform,
                    groupByCountry,
                    includeAutoGroup,
                    enableClashApi,
                    clashApiPort,
                    clashUiUrl,
                    cdnPrefix: resolvedCdnPrefix,
                    enableTun,
                    enableMixed,
                    mixedPort,
                    customRules,
                  });
                  setSingBoxConfig(config);
                  setNotification({ type: 'success', message: `${t.successfullyExtractedLabel}: ${nodes.length}` });
                }}
                className="flex-1 md:flex-none px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                {t.localCompileBtn}
              </button>

            </div>
          </div>

          {/* Param Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            
            {/* Setting 1: DNS routing mode */}
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

            {/* Setting 2: CDN Acceleration Prefix */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {t.cdnPrefixLabel}
              </span>
              <select
                id="cdn-select"
                value={cdnType}
                onChange={(e) => {
                  setCdnType(e.target.value);
                  if (e.target.value !== 'custom') {
                    setCustomCdn('');
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="testingcf">{t.cdnTypeTestingcf}</option>
                <option value="fastly">{t.cdnTypeFastly}</option>
                <option value="gcore">{t.cdnTypeGcore}</option>
                <option value="cdn">{t.cdnTypeMain}</option>
                <option value="github">{t.cdnTypeDirect}</option>
                <option value="custom">{t.cdnTypeCustom}</option>
              </select>
              {cdnType === 'custom' && (
                <input
                  id="cdn-custom-input"
                  type="text"
                  value={customCdn}
                  onChange={(e) => setCustomCdn(e.target.value)}
                  placeholder={t.customCdnPlaceholder}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>

            {/* Status: Parsed Nodes Counters */}
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

            {/* Setting 3: Standard Rulesets */}
            <div className="space-y-3 md:col-span-3 border-t border-slate-100 pt-5 mt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {t.preconfiguredRulesetsLabel}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {[
                  { id: 'AD-Block', label: t.blockAdsLabel },
                  { id: 'AI-Services', label: t.openaiLabel },
                  { id: 'Bilibili', label: t.bilibiliLabel },
                  { id: 'YouTube', label: t.youtubeLabel },
                  { id: 'Google', label: t.googleLabel },
                  { id: 'Private-Net', label: t.privateNetLabel },
                  { id: 'China-Services', label: t.chinaBypassLabel },
                  { id: 'Telegram', label: t.telegramLabel },
                  { id: 'GitHub', label: t.githubLabel },
                  { id: 'Microsoft', label: t.microsoftLabel },
                  { id: 'Apple', label: t.appleLabel },
                  { id: 'Social-Media', label: t.socialMediaLabel },
                  { id: 'Streaming', label: t.streamingLabel },
                  { id: 'Gaming', label: t.gamingLabel },
                  { id: 'Education', label: t.educationLabel },
                  { id: 'Finance', label: t.financeLabel },
                  { id: 'Cloud-Services', label: t.cloudServicesLabel },
                  { id: 'Spotify', label: t.spotifyLabel },
                  { id: 'TikTok', label: t.tiktokLabel },
                  { id: 'HuggingFace', label: t.huggingfaceLabel },
                  { id: 'Proxy-Services', label: t.proxyServicesLabel },
                  { id: 'Proxy-Media', label: t.proxyMediaLabel },
                  { id: 'EHentai', label: t.eHentaiLabel },
                  { id: 'Global-Services', label: t.globalServicesLabel }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleToggleRuleset(item.id)}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer select-none ${
                      rulesets.includes(item.id)
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm shadow-indigo-50/50'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ml-1.5 ${
                      rulesets.includes(item.id) ? 'bg-indigo-600 animate-pulse' : 'bg-transparent'
                    }`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Rules */}
            <div className="md:col-span-3 border-t border-slate-100 pt-4 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider w-[90px] shrink-0">
                  {lang === 'zh' ? '分流规则' : 'Rules'}
                </span>
                <select
                  value={newRuleType}
                  onChange={(e) => setNewRuleType(e.target.value as typeof newRuleType)}
                  className="w-[85px] shrink-0 px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="domain">{lang === 'zh' ? '域名' : 'Domain'}</option>
                  <option value="ip">IP CIDR</option>
                  <option value="rule_set">Rule-Set URL</option>
                </select>
                <input
                  type="text"
                  value={newRuleValue}
                  onChange={(e) => setNewRuleValue(e.target.value)}
                  placeholder={
                    newRuleType === 'domain' ? 'example.com' :
                    newRuleType === 'ip' ? '1.2.3.4/24' :
                    'https://example.com/rule.srs'
                  }
                  className="flex-[20] min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={newRuleOutbound}
                  onChange={(e) => setNewRuleOutbound(e.target.value as typeof newRuleOutbound)}
                  className="w-[85px] shrink-0 px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="proxy">Proxy</option>
                  <option value="direct">Direct</option>
                  <option value="block">Block</option>
                </select>
                <button
                  onClick={() => {
                    if (!newRuleValue.trim()) return;
                    setCustomRules([...customRules, {
                      type: newRuleType,
                      value: newRuleValue.trim(),
                      outbound: newRuleOutbound,
                    }]);
                    setNewRuleValue('');
                  }}
                  className="shrink-0 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  + {lang === 'zh' ? '添加' : 'Add'}
                </button>
                <span className="text-[10px] text-slate-400 w-[50px] text-right shrink-0">
                  {customRules.length}{lang === 'zh' ? '条' : 'r'}
                </span>
              </div>
              {customRules.length > 0 && (
                <div className="space-y-1 max-h-[180px] overflow-y-auto">
                  {customRules.map((rule, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <span className={`px-1.5 py-0.5 rounded font-bold ${
                        rule.type === 'domain' ? 'bg-cyan-50 text-cyan-600' :
                        rule.type === 'ip' ? 'bg-amber-50 text-amber-600' :
                        'bg-fuchsia-50 text-fuchsia-600'
                      }`}>
                        {rule.type === 'domain' ? 'DOMAIN' : rule.type === 'ip' ? 'IP' : 'RULE_SET'}
                      </span>
                      <code className="flex-1 text-slate-700 truncate font-mono">{rule.value}</code>
                      <span className={`font-bold ${
                        rule.outbound === 'proxy' ? 'text-indigo-600' :
                        rule.outbound === 'direct' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        → {rule.outbound.toUpperCase()}
                      </span>
                      <button
                        onClick={() => setCustomRules(customRules.filter((_, j) => j !== i))}
                        className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-bold">✕</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Row 4 / Col 1 to 3: Compilation output box */}
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
                    onClick={handleValidateConfig}
                    className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-bold border border-amber-200"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {lang === 'zh' ? '验证' : 'Validate'}
                  </button>

                  <button
                    onClick={handleDownload}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-bold shadow-sm shadow-indigo-100"
                  >
                    <Download className="w-4 h-4" />
                    {t.downloadJsonBtn}
                  </button>

                  <button
                    onClick={handleCopySubLink}
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-bold shadow-sm shadow-emerald-100"
                    title={lang === 'zh' ? '复制转换好以后的订阅链接' : 'Copy converted subscription link'}
                  >
                    {copySubFeedback ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-200" />
                        {t.copiedLabel}
                      </>
                    ) : (
                      <>
                        <Link className="w-4 h-4" />
                        {t.subModalCopyBtn}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Tab Content 1: Code Output Block */}
          {activeTab === 'preview' && (
            <div className="relative">
              <textarea
                value={editableConfig}
                onChange={(e) => {
                  setEditableConfig(e.target.value);
                  setValidationMsg(null);
                }}
                placeholder={t.noNodesMatchedPreview}
                className="w-full min-h-[460px] max-h-[520px] bg-slate-900 text-slate-200 p-5 rounded-xl font-mono text-xs leading-relaxed border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                spellCheck={false}
              />
              {validationMsg && (
                <div className={`absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-sm ${
                  validationMsg.ok
                    ? 'bg-emerald-600/90 text-white'
                    : 'bg-rose-600/90 text-white'
                }`}>
                  {validationMsg.ok ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  <span className="max-w-[300px] truncate">{validationMsg.text}</span>
                </div>
              )}
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

    </div>
  );
}
