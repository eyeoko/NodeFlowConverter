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
    const hostAndPort = url.host;
    const pathPart = url.pathname;
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
}

export function generateSingBoxConfig(nodes: ProxyNode[], options: ConversionOptions): string {
  const nodeNames = nodes.map(n => n.name);

  // Generate Outbounds list
  const outbounds: any[] = [
    {
      type: 'selector',
      tag: 'proxy',
      outbounds: ['auto', 'direct', ...nodeNames],
    },
    {
      type: 'urltest',
      tag: 'auto',
      outbounds: [...nodeNames],
      url: 'https://www.gstatic.com/generate_204',
      interval: '3m',
      tolerance: 50,
    },
    {
      type: 'direct',
      tag: 'direct',
    },
    {
      type: 'block',
      tag: 'block',
    },
    {
      type: 'dns',
      tag: 'dns-out',
    },
  ];

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
      ob.alter_id = 0;
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

  if (options.dnsStrategy === 'fakeip') {
    dnsServers.push(
      {
        tag: 'dns_direct',
        address: '223.5.5.5',
        detour: 'direct',
      },
      {
        tag: 'dns_proxy',
        address: 'https://8.8.8.8/dns-query',
        detour: 'proxy',
      },
      {
        tag: 'dns_fakeip',
        address: 'fakeip',
      }
    );
    dnsRules.push(
      {
        outbound: 'any',
        server: 'dns_direct',
      },
      {
        query_type: ['A', 'AAAA'],
        server: 'dns_fakeip',
      }
    );
  } else {
    // default/system strategy
    dnsServers.push(
      {
        tag: 'dns_direct',
        address: '119.29.29.29',
        detour: 'direct',
      },
      {
        tag: 'dns_proxy',
        address: '8.8.8.8',
        detour: 'proxy',
      }
    );
    dnsRules.push(
      {
        outbound: 'any',
        server: 'dns_direct',
      },
      {
        clash_mode: 'Direct',
        server: 'dns_direct',
      },
      {
        clash_mode: 'Global',
        server: 'dns_proxy',
      }
    );

    if (options.rulesets.includes('GeoIP:CN')) {
      dnsRules.push({
        domain_suffix: ['.cn'],
        server: 'dns_direct',
      });
    }
  }

  // Build basic routing rules based on options
  const routingRules: any[] = [
    {
      protocol: 'dns',
      outbound: 'dns-out',
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

  if (options.rulesets.includes('AD-Block')) {
    routingRules.push({
      geosite: ['category-ads-all'],
      outbound: 'block',
    });
  }

  if (options.rulesets.includes('GeoIP:CN')) {
    routingRules.push(
      {
        domain_suffix: ['.cn', 'apple.com', 'mi.com', 'baidu.com', 'qq.com', 'taobao.com', 'alipay.com'],
        outbound: 'direct',
      },
      {
        geoip: ['cn'],
        outbound: 'direct',
      }
    );
  }

  const finalConfig = {
    log: {
      level: 'info',
      timestamp: true,
    },
    dns: {
      servers: dnsServers,
      rules: dnsRules,
      strategy: 'ipv4_only',
    },
    inbounds: [
      {
        type: 'tun',
        inet4_address: '172.19.0.1/30',
        auto_route: true,
        strict_route: true,
        sniff: true,
      },
      {
        type: 'mixed',
        listen: '::',
        listen_port: 2080,
        sniff: true,
      },
    ],
    outbounds: outbounds,
    route: {
      rules: routingRules,
      auto_detect_interface: true,
    },
  };

  return JSON.stringify(finalConfig, null, 2);
}
