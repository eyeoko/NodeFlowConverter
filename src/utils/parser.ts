/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProxyNode {
  type: 'vmess' | 'vless' | 'ss' | 'trojan' | 'hysteria2' | 'tuic' | 'anytls' | 'unknown';
  name: string;
  server: string;
  port: number;
  uuid?: string;
  password?: string;
  method?: string;
  network?: string;
  path?: string;
  host?: string;
  tls?: boolean;
  sni?: string;
  udp?: boolean;
  auth?: string;
  alpn?: string[];
  flow?: string;
  publicKey?: string;
  shortId?: string;
  fingerprint?: string;
  raw: string;
}

// Safely decode Base64, supporting UTF-8 strings
export function decodeBase64(str: string): string {
  try {
    const trimmed = str.trim();
    // Check if it looks like a valid base64 (only alphanumeric, +, /, and = padding)
    if (!/^[A-Za-z0-9+/=\s\n\r]+$/.test(trimmed)) {
      return '';
    }
    const decoded = atob(trimmed);
    // Convert binary string to UTF-8
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return '';
  }
}

// Parses standard proxy protocols and custom subscription lines
export function parseSubscription(rawText: string): ProxyNode[] {
  const nodes: ProxyNode[] = [];
  if (!rawText || typeof rawText !== 'string') return [];

  let text = rawText.trim();

  // 1. Try decoding the whole string as Base64 first (common subscription style)
  const decodedText = decodeBase64(text);
  if (decodedText && decodedText.includes('://')) {
    text = decodedText;
  }

  // Split into lines
  const lines = text.split(/[\r\n]+/);

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
      continue;
    }

    try {
      if (trimmedLine.startsWith('vmess://')) {
        const parsed = parseVmess(trimmedLine);
        if (parsed) nodes.push(parsed);
      } else if (trimmedLine.startsWith('vless://')) {
        const parsed = parseVless(trimmedLine);
        if (parsed) nodes.push(parsed);
      } else if (trimmedLine.startsWith('ss://')) {
        const parsed = parseShadowsocks(trimmedLine);
        if (parsed) nodes.push(parsed);
      } else if (trimmedLine.startsWith('trojan://')) {
        const parsed = parseTrojan(trimmedLine);
        if (parsed) nodes.push(parsed);
      } else if (trimmedLine.startsWith('hysteria2://') || trimmedLine.startsWith('hy2://')) {
        const parsed = parseHysteria2(trimmedLine);
        if (parsed) nodes.push(parsed);
      } else if (trimmedLine.startsWith('tuic://')) {
        const parsed = parseTuic(trimmedLine);
        if (parsed) nodes.push(parsed);
      } else if (trimmedLine.startsWith('anytls://')) {
        const parsed = parseAnytls(trimmedLine);
        if (parsed) nodes.push(parsed);
      } else if (trimmedLine.includes('type:') && (trimmedLine.includes('server:') || trimmedLine.includes('uuid:'))) {
        // Clash style single proxy line in YAML
        const parsed = parseClashProxyLine(trimmedLine);
        if (parsed) nodes.push(parsed);
      }
    } catch (err) {
      console.warn('Failed to parse line:', trimmedLine, err);
    }
  }

  // 2. If no nodes parsed yet, try checking if it's a multi-line Clash config YAML
  if (nodes.length === 0 && (rawText.includes('proxies:') || rawText.includes('- name:'))) {
    const clashNodes = parseClashYaml(rawText);
    if (clashNodes.length > 0) {
      nodes.push(...clashNodes);
    }
  }

  return nodes;
}

// Parses vmess://<base64_json>
function parseVmess(urlStr: string): ProxyNode | null {
  try {
    const rawBase64 = urlStr.replace('vmess://', '').trim();
    const jsonStr = atob(rawBase64);
    const data = JSON.parse(jsonStr);

    return {
      type: 'vmess',
      name: data.ps || 'VMess-' + (data.add || 'Node'),
      server: data.add || '',
      port: Number(data.port) || 443,
      uuid: data.id || '',
      network: data.net || 'tcp',
      path: data.path || '',
      host: data.host || '',
      tls: data.tls === 'tls' || data.tls === true,
      sni: data.sni || data.host || '',
      raw: urlStr,
    };
  } catch (e) {
    // Some vmess links might be encoded differently or be older configurations
    return null;
  }
}

// Parses vless://uuid@server:port?query=xyz#remarks
function parseVless(urlStr: string): ProxyNode | null {
  try {
    const url = new URL(urlStr);
    const uuid = url.username;
    const server = url.hostname;
    const port = Number(url.port) || 443;
    const name = decodeURIComponent(url.hash.substring(1)) || 'VLESS-' + server;

    const params = url.searchParams;
    const network = params.get('type') || 'tcp';
    const path = params.get('path') || '';
    const host = params.get('host') || '';
    const security = params.get('security');
    const tls = security === 'tls' || security === 'reality' || !!params.get('sni');
    const sni = params.get('sni') || '';
    const flow = params.get('flow') || '';
    const publicKey = params.get('pbk') || params.get('publicKey') || '';
    const shortId = params.get('sid') || params.get('shortId') || '';
    const fingerprint = params.get('fp') || params.get('fingerprint') || '';

    return {
      type: 'vless',
      name,
      server,
      port,
      uuid,
      network,
      path,
      host,
      tls,
      sni,
      flow,
      publicKey,
      shortId,
      fingerprint,
      raw: urlStr,
    };
  } catch (e) {
    return null;
  }
}

// Parses ss://base64(method:password)@server:port#remarks or ss://base64_method_password_server_port#remarks
function parseShadowsocks(urlStr: string): ProxyNode | null {
  try {
    const url = new URL(urlStr);
    const hashStr = decodeURIComponent(url.hash.substring(1));
    let name = hashStr || 'SS-' + url.hostname;

    // Standard ss scheme: ss://base64_userInfo@server:port
    if (url.username) {
      let userInfo = url.username;
      try {
        userInfo = atob(url.username);
      } catch {}

      const parts = userInfo.split(':');
      if (parts.length >= 2) {
        return {
          type: 'ss',
          name,
          server: url.hostname,
          port: Number(url.port) || 8388,
          method: parts[0],
          password: parts.slice(1).join(':'),
          raw: urlStr,
        };
      }
    }

    // Modern SIP002 shadowsocks URL scheme
    // ss://base64(method:password)@host:port
    let decodedUserInfo = '';

    // Check if user info is base64
    const userInfoB64 = urlStr.split('://')[1]?.split('@')[0];
    if (userInfoB64) {
      try {
        decodedUserInfo = atob(userInfoB64);
      } catch {}
    }

    if (decodedUserInfo && decodedUserInfo.includes(':')) {
      const parts = decodedUserInfo.split(':');
      return {
        type: 'ss',
        name,
        server: url.hostname || url.host.split(':')[0],
        port: Number(url.port) || 8388,
        method: parts[0],
        password: parts[1],
        raw: urlStr,
      };
    }

    return null;
  } catch (e) {
    return null;
  }
}

// Parses trojan://password@server:port?query=xyz#remarks
function parseTrojan(urlStr: string): ProxyNode | null {
  try {
    const url = new URL(urlStr);
    const password = url.username;
    const server = url.hostname;
    const port = Number(url.port) || 443;
    const name = decodeURIComponent(url.hash.substring(1)) || 'Trojan-' + server;

    const params = url.searchParams;
    const sni = params.get('sni') || '';
    const tls = params.get('security') !== 'none';

    return {
      type: 'trojan',
      name,
      server,
      port,
      password,
      tls,
      sni,
      raw: urlStr,
    };
  } catch (e) {
    return null;
  }
}

// Parses hysteria2://auth@server:port?query=xyz#remarks
function parseHysteria2(urlStr: string): ProxyNode | null {
  try {
    const cleanUrl = urlStr.replace('hy2://', 'hysteria2://');
    const url = new URL(cleanUrl);
    const auth = url.username;
    const server = url.hostname;
    const port = Number(url.port) || 443;
    const name = decodeURIComponent(url.hash.substring(1)) || 'Hysteria2-' + server;

    const params = url.searchParams;
    const sni = params.get('sni') || '';
    const alpn = params.get('alpn')?.split(',') || [];

    return {
      type: 'hysteria2',
      name,
      server,
      port,
      auth,
      tls: true,
      sni,
      alpn,
      raw: urlStr,
    };
  } catch (e) {
    return null;
  }
}

// Parses tuic://uuid@server:port?query=xyz#remarks
function parseTuic(urlStr: string): ProxyNode | null {
  try {
    const url = new URL(urlStr);
    const uuid = url.username;
    const server = url.hostname;
    const port = Number(url.port) || 443;
    const name = decodeURIComponent(url.hash.substring(1)) || 'TUIC-' + server;

    const params = url.searchParams;
    const sni = params.get('sni') || '';
    const alpn = params.get('alpn')?.split(',') || [];

    return {
      type: 'tuic',
      name,
      server,
      port,
      uuid,
      tls: true,
      sni,
      alpn,
      raw: urlStr,
    };
  } catch (e) {
    return null;
  }
}

// Parses anytls://password@server:port?query=xyz#remarks
function parseAnytls(urlStr: string): ProxyNode | null {
  try {
    const url = new URL(urlStr);
    const password = url.username;
    const server = url.hostname;
    const port = Number(url.port) || 443;
    const name = decodeURIComponent(url.hash.substring(1)) || 'AnyTLS-' + server;

    const params = url.searchParams;
    const sni = params.get('sni') || '';
    const alpn = params.get('alpn')?.split(',') || [];

    return {
      type: 'anytls',
      name,
      server,
      port,
      password,
      tls: true,
      sni,
      alpn,
      raw: urlStr,
    };
  } catch (e) {
    return null;
  }
}

// Parses single inline yaml-like Clash proxy entry
function parseClashProxyLine(line: string): ProxyNode | null {
  try {
    // Regex or string extraction
    const nameMatch = line.match(/name:\s*['"]?([^'",}]+)['"]?/);
    const typeMatch = line.match(/type:\s*['"]?([^'",}]+)['"]?/);
    const serverMatch = line.match(/server:\s*['"]?([^'",}]+)['"]?/);
    const portMatch = line.match(/port:\s*([0-9]+)/);
    const uuidMatch = line.match(/uuid:\s*['"]?([^'",}]+)['"]?/);
    const cipherMatch = line.match(/(?:cipher|method):\s*['"]?([^'",}]+)['"]?/);
    const passwordMatch = line.match(/password:\s*['"]?([^'",}]+)['"]?/);

    if (!nameMatch || !typeMatch || !serverMatch || !portMatch) return null;

    const name = nameMatch[1].trim();
    let type = typeMatch[1].trim().toLowerCase();
    const server = serverMatch[1].trim();
    const port = Number(portMatch[1]);

    let typeMapped: ProxyNode['type'] = 'unknown';
    if (type === 'ss' || type === 'shadowsocks') typeMapped = 'ss';
    else if (type === 'vmess') typeMapped = 'vmess';
    else if (type === 'vless') typeMapped = 'vless';
    else if (type === 'trojan') typeMapped = 'trojan';
    else if (type === 'hysteria2' || type === 'hy2') typeMapped = 'hysteria2';
    else if (type === 'tuic') typeMapped = 'tuic';
    else if (type === 'anytls') typeMapped = 'anytls';

    return {
      type: typeMapped,
      name,
      server,
      port,
      uuid: uuidMatch ? uuidMatch[1].trim() : undefined,
      password: passwordMatch ? passwordMatch[1].trim() : undefined,
      method: cipherMatch ? cipherMatch[1].trim() : undefined,
      raw: line,
    };
  } catch (e) {
    return null;
  }
}

// Simple custom robust Clash YAML parser
export function parseClashYaml(yamlText: string): ProxyNode[] {
  const nodes: ProxyNode[] = [];
  try {
    // Extract everything in the 'proxies:' section
    const proxiesIndex = yamlText.indexOf('proxies:');
    if (proxiesIndex === -1) return [];

    // Slice proxies part
    let section = yamlText.substring(proxiesIndex);
    // Find next root level key to terminate
    const nextRootKeyMatch = section.match(/\n[a-zA-Z_-]+:/);
    if (nextRootKeyMatch && nextRootKeyMatch.index && nextRootKeyMatch.index > 0) {
      section = section.substring(0, nextRootKeyMatch.index);
    }

    // Match each bullet list item `- name: ...` or `- { name: ... }`
    const items = section.split(/\n\s*-\s+/);
    for (let i = 1; i < items.length; i++) {
      const itemStr = items[i];
      const node = parseClashProxyLine('{' + itemStr.replace(/\n/g, ', ') + '}');
      if (node && node.type !== 'unknown') {
        nodes.push(node);
      }
    }
  } catch (err) {
    console.error('Error parsing Clash YAML:', err);
  }
  return nodes;
}

// Converts a list of ProxyNodes into a complete Sing-Box Config
export interface ConversionOptions {
  template: 'singbox-latest' | 'singbox-v1.8' | 'clash-meta';
  dnsStrategy: 'system' | 'fakeip' | 'custom';
  rulesets: string[];
  groupByCountry?: boolean;
  includeAutoGroup?: boolean;
  enableClashApi?: boolean;
  clashApiPort?: string;
  clashUiUrl?: string;
  cdnPrefix?: string;
  enableTun?: boolean;
  enableMixed?: boolean;
  mixedPort?: string;
  customBaseTemplate?: string;
  customRules?: { type: 'domain' | 'ip' | 'rule_set'; value: string; outbound: 'proxy' | 'direct' | 'block' }[];
}

export function generateSingBoxConfig(nodes: ProxyNode[], options: ConversionOptions): string {
  const nodeNames = nodes.map(n => n.name);

  const getRulesetUrl = (type: 'geosite' | 'geoip', name: string): string => {
    const prefix = (options.cdnPrefix || 'https://testingcf.jsdelivr.net').trim().replace(/\/$/, '');
    if (prefix.includes('raw.githubusercontent.com')) {
      return `${prefix}/SagerNet/sing-${type}/rule-set/${name}.srs`;
    }
    return `${prefix}/gh/SagerNet/sing-${type}@rule-set/${name}.srs`;
  };

  // Generate Outbounds list
  const outbounds: any[] = [];
  const groupOutbounds: any[] = []; // country group definitions to be appended later
  
  const groupByCountry = !!options.groupByCountry;
  const includeAutoGroup = options.includeAutoGroup !== false;

  if (groupByCountry && nodeNames.length > 0) {
    const countries: { key: string; emoji: string; nameZh: string; keywords: string[] }[] = [
      { key: 'HK', emoji: '🇭🇰', nameZh: '香港', keywords: ['香港', 'HK', 'HONG KONG', '🇭🇰'] },
      { key: 'SG', emoji: '🇸🇬', nameZh: '新加坡', keywords: ['新加坡', 'SG', 'SINGAPORE', '🇸🇬'] },
      { key: 'JP', emoji: '🇯🇵', nameZh: '日本', keywords: ['日本', 'JP', 'JAPAN', '🇯🇵'] },
      { key: 'US', emoji: '🇺🇸', nameZh: '美国', keywords: ['美国', 'US', 'UNITED STATES', 'USA', '🇺🇸'] },
      { key: 'TW', emoji: '🇹🇼', nameZh: '台湾', keywords: ['台湾', 'TW', 'TAIWAN', '🇹🇼'] },
      { key: 'KR', emoji: '🇰🇷', nameZh: '韩国', keywords: ['韩国', 'KR', 'KOREA', '🇰🇷'] },
      { key: 'UK', emoji: '🇬🇧', nameZh: '英国', keywords: ['英国', 'UK', 'GB', 'UNITED KINGDOM', '🇬🇧'] },
      { key: 'DE', emoji: '🇩🇪', nameZh: '德国', keywords: ['德国', 'DE', 'GERMANY', '🇩🇪'] },
      { key: 'FR', emoji: '🇫🇷', nameZh: '法国', keywords: ['法国', 'FR', 'FRANCE', '🇫🇷'] }
    ];

    const countryGroups: { [key: string]: string[] } = {};
    const ungroupedNodes: string[] = [];

    for (const name of nodeNames) {
      let matched = false;
      const nameUpper = name.toUpperCase();
      for (const c of countries) {
        if (c.keywords.some(kw => nameUpper.includes(kw.toUpperCase()))) {
          if (!countryGroups[c.key]) {
            countryGroups[c.key] = [];
          }
          countryGroups[c.key].push(name);
          matched = true;
          break;
        }
      }
      if (!matched) {
        ungroupedNodes.push(name);
      }
    }

    const activeCountryTags: string[] = [];

    for (const c of countries) {
      const groupNodes = countryGroups[c.key];
      if (groupNodes && groupNodes.length > 0) {
        const selectorTag = `${c.emoji} ${c.nameZh}分组`;
        activeCountryTags.push(selectorTag);

        const countryOutbounds: string[] = [];

        if (includeAutoGroup) {
          const autoTag = `⚡ ${c.emoji} ${c.nameZh}自动`;
          countryOutbounds.push(autoTag);

          groupOutbounds.push({
            type: 'urltest',
            tag: autoTag,
            outbounds: groupNodes,
            url: 'https://www.gstatic.com/generate_204',
            interval: '3m',
            tolerance: 50,
          });
        }

        countryOutbounds.push(...groupNodes);

        groupOutbounds.push({
          type: 'selector',
          tag: selectorTag,
          outbounds: countryOutbounds,
        });
      }
    }

    if (ungroupedNodes.length > 0) {
      const otherTag = '🌍 其它地区';
      activeCountryTags.push(otherTag);

      const countryOutbounds: string[] = [];
      if (includeAutoGroup) {
        const autoTag = '⚡ 🌍 其它自动';
        countryOutbounds.push(autoTag);
        groupOutbounds.push({
          type: 'urltest',
          tag: autoTag,
          outbounds: ungroupedNodes,
          url: 'https://www.gstatic.com/generate_204',
          interval: '3m',
          tolerance: 50,
        });
      }
      countryOutbounds.push(...ungroupedNodes);

      groupOutbounds.push({
        type: 'selector',
        tag: otherTag,
        outbounds: countryOutbounds,
      });
    }

    const mainProxyOutbounds: string[] = [];
    if (includeAutoGroup) {
      mainProxyOutbounds.push('auto');
    }
    mainProxyOutbounds.push('direct');
    mainProxyOutbounds.push(...activeCountryTags);
    mainProxyOutbounds.push(...nodeNames);

    outbounds.push({
      type: 'selector',
      tag: 'proxy',
      outbounds: mainProxyOutbounds,
      default: nodeNames.length > 0 ? nodeNames[0] : undefined,
    });

    if (includeAutoGroup) {
      outbounds.push({
        type: 'urltest',
        tag: 'auto',
        outbounds: nodeNames,
        url: 'https://www.gstatic.com/generate_204',
        interval: '3m',
        tolerance: 50,
      });
    }

  } else {
    // Standard direct list
    const mainProxyOutbounds: string[] = [];
    if (includeAutoGroup && nodeNames.length > 0) {
      mainProxyOutbounds.push('auto');
    }
    mainProxyOutbounds.push('direct');
    mainProxyOutbounds.push(...nodeNames);

    outbounds.push({
      type: 'selector',
      tag: 'proxy',
      outbounds: mainProxyOutbounds,
      default: nodeNames.length > 0 ? nodeNames[0] : undefined,
    });

    if (includeAutoGroup && nodeNames.length > 0) {
      outbounds.push({
        type: 'urltest',
        tag: 'auto',
        outbounds: nodeNames,
        url: 'https://www.gstatic.com/generate_204',
        interval: '3m',
        tolerance: 50,
      });
    }
  }

  // Standard direct and block outbounds
  outbounds.push({
    type: 'direct',
    tag: 'direct',
  });
  outbounds.push({
    type: 'block',
    tag: 'block',
  });

  // Append any country groups / test groups
  outbounds.push(...groupOutbounds);

  // Convert each node to outbound format
  for (const node of nodes) {
    let ob: any = {
      tag: node.name,
      server: node.server,
      server_port: node.port,
    };

    if (node.type === 'ss') {
      ob.type = 'shadowsocks';
      ob.method = node.method || 'aes-128-gcm';
      ob.password = node.password || '';
    } else if (node.type === 'vmess') {
      ob.type = 'vmess';
      ob.uuid = node.uuid || '';
      ob.security = 'auto';
      if (node.network && node.network !== 'tcp') {
        ob.transport = {
          type: node.network,
        };
        if (node.network === 'ws' && node.path) {
          ob.transport.path = node.path;
          if (node.host) ob.transport.headers = { Host: node.host };
        } else if (node.network === 'grpc' && node.path) {
          ob.transport.service_name = node.path;
        }
      }
      if (node.tls) {
        ob.tls = {
          enabled: true,
          server_name: node.sni || node.host || node.server,
          insecure: false,
        };
      }
    } else if (node.type === 'vless') {
      ob.type = 'vless';
      ob.uuid = node.uuid || '';
      if (node.network && node.network !== 'tcp') {
        ob.transport = {
          type: node.network,
        };
        if (node.network === 'ws' && node.path) {
          ob.transport.path = node.path;
          if (node.host) ob.transport.headers = { Host: node.host };
        }
      }
      if (node.tls) {
        ob.tls = {
          enabled: true,
          server_name: node.sni || node.host || node.server,
        };
      }
      if (node.flow) {
        ob.flow = node.flow;
      }
      if (node.publicKey) {
        ob.tls = ob.tls || { enabled: true };
        ob.tls.reality = {
          enabled: true,
          public_key: node.publicKey,
          short_id: node.shortId || '',
        };
      }
      if (node.fingerprint && ob.tls) {
        ob.tls.utls = {
          enabled: true,
          fingerprint: node.fingerprint,
        };
      }
    } else if (node.type === 'trojan') {
      ob.type = 'trojan';
      ob.password = node.password || '';
      if (node.tls) {
        ob.tls = {
          enabled: true,
          server_name: node.sni || node.server,
        };
      }
    } else if (node.type === 'hysteria2') {
      ob.type = 'hysteria2';
      ob.password = node.auth || '';
      ob.tls = {
        enabled: true,
        server_name: node.sni || node.server,
      };
      if (node.alpn && node.alpn.length > 0) {
        ob.tls.alpn = node.alpn;
      }
    } else if (node.type === 'tuic') {
      ob.type = 'tuic';
      ob.uuid = node.uuid || '';
      ob.tls = {
        enabled: true,
        server_name: node.sni || node.server,
      };
      if (node.alpn && node.alpn.length > 0) {
        ob.tls.alpn = node.alpn;
      }
    } else if (node.type === 'anytls') {
      ob.type = 'trojan';
      ob.password = node.password || '';
      ob.tls = {
        enabled: true,
        server_name: node.sni || node.server,
        insecure: true,
      };
      if (node.alpn && node.alpn.length > 0) {
        ob.tls.alpn = node.alpn;
      }
    } else {
      continue;
    }

    outbounds.push(ob);
  }

  // Set up DNS based on strategy
  const dnsServers: any[] = [];
  const dnsRules: any[] = [];
  const routeRuleSets: any[] = [];

  if (options.dnsStrategy === 'fakeip') {
    dnsServers.push(
      {
        type: 'https',
        tag: 'dns_proxy',
        server: '8.8.8.8',
        path: '/dns-query',
      },
      {
        type: 'udp',
        tag: 'dns_direct',
        server: '223.5.5.5',
      },
      {
        type: 'fakeip',
        tag: 'dns_fakeip',
      }
    );
    // Node server domains must resolve via real DNS (not fakeip) so proxies can connect
    const nodeServers = [...new Set(nodes.map(n => n.server).filter(s => s && !/^\d+\.\d+\.\d+\.\d+$/.test(s)))];
    if (nodeServers.length > 0) {
      dnsRules.push({
        domain: nodeServers,
        server: 'dns_direct',
      });
    }
    dnsRules.push(
      {
        query_type: ['A', 'AAAA'],
        server: 'dns_fakeip',
      }
    );
  } else {
    // default/system strategy
    dnsServers.push(
      {
        type: 'udp',
        tag: 'dns_direct',
        server: '223.5.5.5',
      },
      {
        type: 'udp',
        tag: 'dns_proxy',
        server: '8.8.8.8',
        detour: 'proxy',
      }
    );

    // Bootstrap: proxy server domains must resolve via direct DNS (prevents loopback)
    const nodeServers = [...new Set(nodes.map(n => n.server).filter(s => s && !/^\d+\.\d+\.\d+\.\d+$/.test(s)))];
    if (nodeServers.length > 0) {
      dnsRules.push({
        domain: nodeServers,
        server: 'dns_direct',
      });
    }
    // Chinese domains → domestic DNS
    if (options.rulesets.includes('China-Services') || options.rulesets.includes('GeoIP:CN')) {
      dnsRules.push({
        rule_set: 'geosite-cn',
        server: 'dns_direct',
      });
    }
    dnsRules.push(
      {
        clash_mode: 'Direct',
        server: 'dns_direct',
      },
      {
        clash_mode: 'Global',
        server: 'dns_proxy',
      }
    );
    // Everything else (non-Chinese, non-proxy-server) → proxy DNS for correct IPs
    dnsRules.push({
      query_type: ['A', 'AAAA'],
      server: 'dns_proxy',
    });
  }

  // Build basic routing rules based on options
  const routingRules: any[] = [
    {
      action: 'sniff',
      sniffer: ['http', 'tls', 'quic'],
    },
    {
      protocol: 'dns',
      action: 'hijack-dns',
    },
    {
      ip_cidr: ['119.29.29.29/32', '223.5.5.5/32', '8.8.8.8/32'],
      outbound: 'direct',
    },
    {
      clash_mode: 'Direct',
      outbound: 'direct',
    },
    {
      clash_mode: 'Global',
      outbound: 'proxy',
    },
  ];

  // 1. AD-Block
  if (options.rulesets.includes('AD-Block')) {
    routingRules.push({
      rule_set: 'geosite-category-ads-all',
      outbound: 'block',
    });
    routeRuleSets.push({
      type: 'remote',
      tag: 'geosite-category-ads-all',
      format: 'binary',
      url: getRulesetUrl('geosite', 'geosite-category-ads-all'),
      download_detour: 'direct',
    });
  }

  // 2. AI-Services
  if (options.rulesets.includes('AI-Services') || options.rulesets.includes('OpenAI')) {
    routingRules.push(
      { rule_set: 'geosite-openai', outbound: 'proxy' },
      { rule_set: 'geosite-anthropic', outbound: 'proxy' }
    );
    routeRuleSets.push(
      {
        type: 'remote',
        tag: 'geosite-openai',
        format: 'binary',
        url: getRulesetUrl('geosite', 'geosite-openai'),
        download_detour: 'direct',
      },
      {
        type: 'remote',
        tag: 'geosite-anthropic',
        format: 'binary',
        url: getRulesetUrl('geosite', 'geosite-anthropic'),
        download_detour: 'direct',
      }
    );
  }

  // 3. Bilibili
  if (options.rulesets.includes('Bilibili')) {
    routingRules.push({
      rule_set: 'geosite-bilibili',
      outbound: 'direct',
    });
    routeRuleSets.push({
      type: 'remote',
      tag: 'geosite-bilibili',
      format: 'binary',
      url: getRulesetUrl('geosite', 'geosite-bilibili'),
      download_detour: 'direct',
    });
  }

  // 4. YouTube
  if (options.rulesets.includes('YouTube')) {
    routingRules.push({
      rule_set: 'geosite-youtube',
      outbound: 'proxy',
    });
    routeRuleSets.push({
      type: 'remote',
      tag: 'geosite-youtube',
      format: 'binary',
      url: getRulesetUrl('geosite', 'geosite-youtube'),
      download_detour: 'direct',
    });
  }

  // 5. Google
  if (options.rulesets.includes('Google')) {
    routingRules.push({
      rule_set: 'geosite-google',
      outbound: 'proxy',
    });
    routeRuleSets.push({
      type: 'remote',
      tag: 'geosite-google',
      format: 'binary',
      url: getRulesetUrl('geosite', 'geosite-google'),
      download_detour: 'direct',
    });
  }

  // 6. Private-Net
  if (options.rulesets.includes('Private-Net')) {
    routingRules.push({
      ip_is_private: true,
      outbound: 'direct',
    });
  }

  // 7. China-Services
  if (options.rulesets.includes('China-Services') || options.rulesets.includes('GeoIP:CN')) {
    routingRules.push(
      {
        domain_suffix: ['.cn', 'apple.com', 'mi.com', 'baidu.com', 'qq.com', 'taobao.com', 'alipay.com'],
        outbound: 'direct',
      },
      {
        rule_set: 'geosite-cn',
        outbound: 'direct',
      }
    );
    routeRuleSets.push(
      {
        type: 'remote',
        tag: 'geosite-cn',
        format: 'binary',
        url: getRulesetUrl('geosite', 'geosite-cn'),
        download_detour: 'direct',
      }
    );
  }

  // 8. Telegram
  if (options.rulesets.includes('Telegram')) {
    routingRules.push(
      {
        rule_set: 'geosite-telegram',
        outbound: 'proxy',
      },
      {
        rule_set: 'geoip-telegram',
        outbound: 'proxy',
      }
    );
    routeRuleSets.push(
      {
        type: 'remote',
        tag: 'geosite-telegram',
        format: 'binary',
        url: getRulesetUrl('geosite', 'geosite-telegram'),
        download_detour: 'direct',
      },
      {
        type: 'remote',
        tag: 'geoip-telegram',
        format: 'binary',
        url: getRulesetUrl('geoip', 'geoip-telegram'),
        download_detour: 'direct',
      }
    );
  }

  // 9. GitHub
  if (options.rulesets.includes('GitHub')) {
    routingRules.push({
      rule_set: 'geosite-github',
      outbound: 'proxy',
    });
    routeRuleSets.push({
      type: 'remote',
      tag: 'geosite-github',
      format: 'binary',
      url: getRulesetUrl('geosite', 'geosite-github'),
      download_detour: 'direct',
    });
  }

  // 10. Microsoft
  if (options.rulesets.includes('Microsoft')) {
    routingRules.push({
      rule_set: 'geosite-microsoft',
      outbound: 'direct',
    });
    routeRuleSets.push({
      type: 'remote',
      tag: 'geosite-microsoft',
      format: 'binary',
      url: getRulesetUrl('geosite', 'geosite-microsoft'),
      download_detour: 'direct',
    });
  }

  // 11. Apple
  if (options.rulesets.includes('Apple')) {
    routingRules.push({
      rule_set: 'geosite-apple',
      outbound: 'direct',
    });
    routeRuleSets.push({
      type: 'remote',
      tag: 'geosite-apple',
      format: 'binary',
      url: getRulesetUrl('geosite', 'geosite-apple'),
      download_detour: 'direct',
    });
  }

  // 12. Social-Media
  if (options.rulesets.includes('Social-Media')) {
    routingRules.push(
      { rule_set: 'geosite-twitter', outbound: 'proxy' },
      { rule_set: 'geosite-facebook', outbound: 'proxy' },
      { rule_set: 'geosite-instagram', outbound: 'proxy' }
    );
    routeRuleSets.push(
      {
        type: 'remote',
        tag: 'geosite-twitter',
        format: 'binary',
        url: getRulesetUrl('geosite', 'geosite-twitter'),
        download_detour: 'direct',
      },
      {
        type: 'remote',
        tag: 'geosite-facebook',
        format: 'binary',
        url: getRulesetUrl('geosite', 'geosite-facebook'),
        download_detour: 'direct',
      },
      {
        type: 'remote',
        tag: 'geosite-instagram',
        format: 'binary',
        url: getRulesetUrl('geosite', 'geosite-instagram'),
        download_detour: 'direct',
      }
    );
  }

  // 13. Streaming
  if (options.rulesets.includes('Streaming') || options.rulesets.includes('Netflix')) {
    routingRules.push(
      { rule_set: 'geosite-netflix', outbound: 'proxy' },
      { rule_set: 'geoip-netflix', outbound: 'proxy' },
      { rule_set: 'geosite-disney', outbound: 'proxy' },
      { rule_set: 'geosite-hbo', outbound: 'proxy' }
    );
    routeRuleSets.push(
      {
        type: 'remote',
        tag: 'geosite-netflix',
        format: 'binary',
        url: getRulesetUrl('geosite', 'geosite-netflix'),
        download_detour: 'direct',
      },
      {
        type: 'remote',
        tag: 'geoip-netflix',
        format: 'binary',
        url: getRulesetUrl('geoip', 'geoip-netflix'),
        download_detour: 'direct',
      },
      {
        type: 'remote',
        tag: 'geosite-disney',
        format: 'binary',
        url: getRulesetUrl('geosite', 'geosite-disney'),
        download_detour: 'direct',
      },
      {
        type: 'remote',
        tag: 'geosite-hbo',
        format: 'binary',
        url: getRulesetUrl('geosite', 'geosite-hbo'),
        download_detour: 'direct',
      }
    );
  }

  // 14. Gaming
  if (options.rulesets.includes('Gaming')) {
    routingRules.push(
      { rule_set: 'geosite-steam', outbound: 'proxy' },
      { rule_set: 'geosite-epic', outbound: 'proxy' },
      { rule_set: 'geosite-ea', outbound: 'proxy' },
      { rule_set: 'geosite-nintendo', outbound: 'proxy' }
    );
    routeRuleSets.push(
      {
        type: 'remote',
        tag: 'geosite-steam',
        format: 'binary',
        url: getRulesetUrl('geosite', 'geosite-steam'),
        download_detour: 'direct',
      },
      {
        type: 'remote',
        tag: 'geosite-epic',
        format: 'binary',
        url: getRulesetUrl('geosite', 'geosite-epic'),
        download_detour: 'direct',
      },
      {
        type: 'remote',
        tag: 'geosite-ea',
        format: 'binary',
        url: getRulesetUrl('geosite', 'geosite-ea'),
        download_detour: 'direct',
      },
      {
        type: 'remote',
        tag: 'geosite-nintendo',
        format: 'binary',
        url: getRulesetUrl('geosite', 'geosite-nintendo'),
        download_detour: 'direct',
      }
    );
  }

  // 15. Education
  if (options.rulesets.includes('Education')) {
    routingRules.push({
      rule_set: 'geosite-category-scholar-education',
      outbound: 'proxy',
    });
    routeRuleSets.push({
      type: 'remote',
      tag: 'geosite-category-scholar-education',
      format: 'binary',
      url: getRulesetUrl('geosite', 'geosite-category-scholar-education'),
      download_detour: 'direct',
    });
  }

  // 16. Finance
  if (options.rulesets.includes('Finance')) {
    routingRules.push({
      rule_set: 'geosite-category-finance',
      outbound: 'direct',
    });
    routeRuleSets.push({
      type: 'remote',
      tag: 'geosite-category-finance',
      format: 'binary',
      url: getRulesetUrl('geosite', 'geosite-category-finance'),
      download_detour: 'direct',
    });
  }

  // 17. Cloud-Services
  if (options.rulesets.includes('Cloud-Services')) {
    routingRules.push(
      { rule_set: 'geosite-cloudflare', outbound: 'proxy' },
      { rule_set: 'geosite-aws', outbound: 'proxy' }
    );
    routeRuleSets.push(
      {
        type: 'remote',
        tag: 'geosite-cloudflare',
        format: 'binary',
        url: getRulesetUrl('geosite', 'geosite-cloudflare'),
        download_detour: 'direct',
      },
      {
        type: 'remote',
        tag: 'geosite-aws',
        format: 'binary',
        url: getRulesetUrl('geosite', 'geosite-aws'),
        download_detour: 'direct',
      }
    );
  }

  // 18. Spotify
  if (options.rulesets.includes('Spotify')) {
    routingRules.push({
      rule_set: 'geosite-spotify',
      outbound: 'proxy',
    });
    routeRuleSets.push({
      type: 'remote',
      tag: 'geosite-spotify',
      format: 'binary',
      url: getRulesetUrl('geosite', 'geosite-spotify'),
      download_detour: 'direct',
    });
  }

  // 19. TikTok
  if (options.rulesets.includes('TikTok')) {
    routingRules.push({
      rule_set: 'geosite-tiktok',
      outbound: 'proxy',
    });
    routeRuleSets.push({
      type: 'remote',
      tag: 'geosite-tiktok',
      format: 'binary',
      url: getRulesetUrl('geosite', 'geosite-tiktok'),
      download_detour: 'direct',
    });
  }

  // 20. HuggingFace
  if (options.rulesets.includes('HuggingFace')) {
    routingRules.push({
      domain_suffix: ['.huggingface.co', '.hf.co', '.hf.space'],
      outbound: 'proxy',
    });
  }

  // 21. Proxy-Services
  if (options.rulesets.includes('Proxy-Services')) {
    routingRules.push({
      rule_set: 'geosite-category-proxy',
      outbound: 'proxy',
    });
    routeRuleSets.push({
      type: 'remote',
      tag: 'geosite-category-proxy',
      format: 'binary',
      url: getRulesetUrl('geosite', 'geosite-category-proxy'),
      download_detour: 'direct',
    });
  }

  // 22. Proxy-Media
  if (options.rulesets.includes('Proxy-Media')) {
    routingRules.push({
      rule_set: 'geosite-category-media',
      outbound: 'proxy',
    });
    routeRuleSets.push({
      type: 'remote',
      tag: 'geosite-category-media',
      format: 'binary',
      url: getRulesetUrl('geosite', 'geosite-category-media'),
      download_detour: 'direct',
    });
  }

  // 23. EHentai
  if (options.rulesets.includes('EHentai')) {
    routingRules.push({
      domain_suffix: ['.e-hentai.org', '.exhentai.org', 'e-hentai.org', 'exhentai.org'],
      outbound: 'proxy',
    });
  }

  // 24. Global-Services (Non-China)
  if (options.rulesets.includes('Global-Services')) {
    routingRules.push({
      rule_set: 'geosite-geolocation-!cn',
      outbound: 'proxy',
    });
    routeRuleSets.push({
      type: 'remote',
      tag: 'geosite-geolocation-!cn',
      format: 'binary',
      url: getRulesetUrl('geosite', 'geosite-geolocation-!cn'),
      download_detour: 'direct',
    });
  }

  // 25. Custom user-defined rules
  if (options.customRules && options.customRules.length > 0) {
    for (const rule of options.customRules) {
      if (rule.type === 'domain') {
        routingRules.push({ domain: [rule.value], outbound: rule.outbound });
      } else if (rule.type === 'ip') {
        routingRules.push({ ip_cidr: [rule.value], outbound: rule.outbound });
      } else if (rule.type === 'rule_set') {
        const tag = 'custom-' + rule.value.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        routingRules.push({ rule_set: tag, outbound: rule.outbound });
        routeRuleSets.push({
          type: 'remote',
          tag,
          format: 'binary',
          url: rule.value,
          download_detour: 'direct',
        });
      }
    }
  }

  const configInbounds: any[] = [];
  if (options.enableTun !== false) {
    configInbounds.push({
      type: 'tun',
      address: ['172.19.0.1/30'],
      auto_route: true,
      strict_route: true,
    });
  }
  if (options.enableMixed !== false) {
    const portNum = options.mixedPort ? parseInt(options.mixedPort, 10) : 2080;
    configInbounds.push({
      type: 'mixed',
      listen: '::',
      listen_port: isNaN(portNum) ? 2080 : portNum,
    });
  }

  let baseConfig: any = {};
  if (options.customBaseTemplate) {
    try {
      baseConfig = JSON.parse(options.customBaseTemplate);
    } catch (e) {
      // Fallback to empty if invalid
    }
  }

  // Start with our generated config, then merge user template on top properly
  let finalConfig: any = {};

  // ── log ──
  finalConfig.log = baseConfig.log || { level: 'info', timestamp: true };

  // ── dns ──
  // Our DNS config is authoritative; template DNS only adds extra servers/rules
  finalConfig.dns = {
    servers: [...dnsServers],
    rules: [...dnsRules],
    final: 'dns_direct',
    strategy: 'ipv4_only',
  };
  if (options.dnsStrategy === 'fakeip') {
    finalConfig.dns.fakeip = { enabled: true, inet4_range: '198.18.0.0/15' };
  }
  if (baseConfig.dns) {
    // Append template servers that don't conflict with our tags
    const ourDnsTags = new Set(dnsServers.map((s: any) => s.tag));
    for (const s of (baseConfig.dns.servers || [])) {
      if (!ourDnsTags.has(s.tag)) {
        finalConfig.dns.servers.push(s);
      }
    }
    // Append template DNS rules (after ours, so ours take priority)
    for (const r of (baseConfig.dns.rules || [])) {
      finalConfig.dns.rules.push(r);
    }
  }

  // ── inbounds ──
  finalConfig.inbounds = [...configInbounds];
  if (baseConfig.inbounds) {
    const ourInboundTypes = new Set(configInbounds.map((ib: any) => ib.type));
    for (const ib of baseConfig.inbounds) {
      if (!ourInboundTypes.has(ib.type)) {
        finalConfig.inbounds.push(ib);
      }
    }
  }

  // ── outbounds ──
  // Generated outbounds first, then template outbounds (non-duplicate)
  finalConfig.outbounds = [...outbounds];
  if (baseConfig.outbounds) {
    const ourTags = new Set(outbounds.map((ob: any) => ob.tag));
    for (const ob of baseConfig.outbounds) {
      if (!ourTags.has(ob.tag)) {
        finalConfig.outbounds.push(ob);
      }
    }
  }

  // ── route ──
  // Our routing rules first (higher priority), then template rules
  finalConfig.route = {
    rules: [...routingRules],
    final: 'proxy',
    auto_detect_interface: true,
    default_domain_resolver: 'dns_direct',
  };
  if (baseConfig.route) {
    if (baseConfig.route.auto_detect_interface !== undefined) {
      finalConfig.route.auto_detect_interface = baseConfig.route.auto_detect_interface;
    }
    if (baseConfig.route.final) {
      finalConfig.route.final = baseConfig.route.final;
    }
    if (baseConfig.route.default_domain_resolver) {
      finalConfig.route.default_domain_resolver = baseConfig.route.default_domain_resolver;
    }
    // Template rules appended after ours (lower priority)
    for (const r of (baseConfig.route.rules || [])) {
      finalConfig.route.rules.push(r);
    }
  }

  // ── route.rule_set ──
  finalConfig.route.rule_set = [...routeRuleSets];
  if (baseConfig.route && baseConfig.route.rule_set) {
    const ourRuleSetTags = new Set(routeRuleSets.map((rs: any) => rs.tag));
    for (const rs of baseConfig.route.rule_set) {
      if (!ourRuleSetTags.has(rs.tag)) {
        finalConfig.route.rule_set.push(rs);
      }
    }
  }

  // ── Clash API (REST, for web dashboard) ──
  // Avoid download URL/detour that can block startup when GitHub is unreachable.
  // The UI will still work if dashboard files exist locally (e.g. pre-downloaded).
  if (options.enableClashApi) {
    finalConfig.experimental = finalConfig.experimental || {};
    finalConfig.experimental.cache_file = { enabled: true };
    finalConfig.experimental.clash_api = {
      external_controller: options.clashApiPort || '127.0.0.1:9090',
      default_mode: 'rule',
    };
  }
  // Pass-through template services / experimental (cache_file, etc.)
  if (baseConfig.services) {
    finalConfig.services = [...baseConfig.services];
  }
  if (baseConfig.experimental) {
    if (!finalConfig.experimental) {
      finalConfig.experimental = {};
    }
    for (const key of Object.keys(baseConfig.experimental)) {
      if (key !== 'clash_api') {
        finalConfig.experimental[key] = baseConfig.experimental[key];
      }
    }
  }

  return JSON.stringify(finalConfig, null, 2);
}

export function serializeNodeToUri(node: ProxyNode): string {
  // If the raw field is already a valid protocol URL, return it
  if (node.raw && /^(vmess|vless|ss|trojan|hysteria2|hy2|tuic):\/\//i.test(node.raw)) {
    return node.raw.trim();
  }

  const nameEncoded = encodeURIComponent(node.name);

  switch (node.type) {
    case 'vmess': {
      const obj = {
        v: '2',
        ps: node.name,
        add: node.server,
        port: String(node.port),
        id: node.uuid || '',
        aid: '0',
        scy: 'auto',
        net: node.network || 'tcp',
        type: 'none',
        host: node.host || '',
        path: node.path || '',
        tls: node.tls ? 'tls' : '',
        sni: node.sni || '',
      };
      try {
        const jsonStr = JSON.stringify(obj);
        // Safe base64 encoding that supports UTF-8 characters like Chinese node names
        const bytes = new TextEncoder().encode(jsonStr);
        let binStr = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binStr += String.fromCharCode(bytes[i]);
        }
        const encoded = btoa(binStr);
        return `vmess://${encoded}`;
      } catch (e) {
        return `vmess://`;
      }
    }
    case 'vless': {
      const params = new URLSearchParams();
      if (node.network) params.set('type', node.network);
      if (node.path) params.set('path', node.path);
      if (node.host) params.set('host', node.host);
      if (node.tls) params.set('security', 'tls');
      if (node.sni) params.set('sni', node.sni);
      const query = params.toString();
      return `vless://${node.uuid || ''}@${node.server}:${node.port}${query ? '?' + query : ''}#${nameEncoded}`;
    }
    case 'ss': {
      const auth = `${node.method || 'aes-256-gcm'}:${node.password || ''}`;
      try {
        // Safe base64 encoding
        const bytes = new TextEncoder().encode(auth);
        let binStr = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binStr += String.fromCharCode(bytes[i]);
        }
        const authEncoded = btoa(binStr);
        return `ss://${authEncoded}@${node.server}:${node.port}#${nameEncoded}`;
      } catch (e) {
        return `ss://${node.server}:${node.port}#${nameEncoded}`;
      }
    }
    case 'trojan': {
      const params = new URLSearchParams();
      if (node.sni) params.set('sni', node.sni);
      if (node.host) params.set('peer', node.host);
      const query = params.toString();
      return `trojan://${node.password || ''}@${node.server}:${node.port}${query ? '?' + query : ''}#${nameEncoded}`;
    }
    case 'hysteria2': {
      const params = new URLSearchParams();
      if (node.sni) params.set('sni', node.sni);
      const query = params.toString();
      const authPart = node.password || node.auth || '';
      return `hysteria2://${authPart}@${node.server}:${node.port}${query ? '?' + query : ''}#${nameEncoded}`;
    }
    case 'tuic': {
      const params = new URLSearchParams();
      if (node.uuid) params.set('uuid', node.uuid);
      if (node.password) params.set('pass', node.password);
      if (node.alpn && node.alpn.length) params.set('alpn', node.alpn.join(','));
      const query = params.toString();
      return `tuic://@${node.server}:${node.port}${query ? '?' + query : ''}#${nameEncoded}`;
    }
    default:
      return node.raw || '';
  }
}
