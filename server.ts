/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { parseSubscription, generateSingBoxConfig } from './src/utils/parser';

// Load environment variables
dotenv.config();

const isProd = process.env.NODE_ENV === 'production' || process.env.VITE_PROD === 'true';
const port = process.env.PORT || 3000;

// Lazy initialization of GoogleGenAI to prevent crashing on startup if key is missing
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required. Please set it in the Secrets panel in the AI Studio UI.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Fetch subscription from URL (CORS bypass proxy)
  app.get('/api/fetch-subscription', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing subscription URL parameter' });
    }

    try {
      console.log(`Fetching subscription from: ${targetUrl}`);
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'clash/1.0.0 ClashMeta/1.0.0 v2rayN/1.0.0 Sing-Box/1.0.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Target server returned status: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(text);
    } catch (error: any) {
      console.error('Subscription fetch failed:', error);
      res.status(502).json({ error: `Failed to fetch subscription: ${error.message}` });
    }
  });

  // Real-time remote subscription compiler / endpoint
  app.get('/api/sub', (req, res) => {
    try {
      const { config, template, dns, rulesets } = req.query;
      if (!config) {
        return res.status(400).send('Error: Missing config base64 data');
      }

      // Safe base64 decoding supporting UTF-8
      const rawText = safeAtob(config as string);
      const parsedNodes = parseSubscription(rawText);

      // Generate config
      const singBoxConfig = generateSingBoxConfig(parsedNodes, {
        template: (template as any) || 'singbox-latest',
        dnsStrategy: (dns as any) || 'system',
        rulesets: rulesets ? (rulesets as string).split(',').filter(Boolean) : ['AD-Block', 'GeoIP:CN'],
      });

      // Send raw Sing-Box JSON with appropriate response headers
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="singbox_config.json"');
      res.send(singBoxConfig);
    } catch (err: any) {
      console.error('Subscription compilation error:', err);
      res.status(500).send(`Error: ${err.message}`);
    }
  });

  // AI Conversion using Gemini
  app.post('/api/convert-ai', async (req, res) => {
    const { rawConfig, options } = req.body;
    if (!rawConfig) {
      return res.status(400).json({ error: 'Missing rawConfig parameter' });
    }

    try {
      const ai = getAIClient();
      console.log('Using Gemini for intelligent proxy config parsing and conversion...');

      const systemInstruction = `You are an expert proxy configuration converter specializing in the Sing-Box client.
Your job is to parse ANY arbitrary text input containing server proxy credentials, subscriptions (Clash YAML, Surge profiles, VMess/VLESS/SS/Trojan/Hysteria/TUIC URLs, or raw lists of servers) and convert them into a perfectly valid Sing-Box JSON configuration file.

Requirements:
1. Identify all valid proxy nodes in the input. Extract their server address, port, protocol, UUIDs, passwords, paths, TLS, and transport network protocols.
2. Structure them as a Sing-Box configuration. The configuration MUST follow the standard Sing-Box JSON format.
3. Your JSON structure MUST contain the following root elements: "log", "dns", "inbounds", "outbounds", "route".
4. The "outbounds" array must start with:
   - A 'selector' outbound with tag "proxy", which points to all extracted node tags plus "auto" and "direct".
   - A 'urltest' outbound with tag "auto", pointing to all extracted node tags.
   - Standard outbounds: direct, block, dns-out.
   - Followed by the converted node outbounds (e.g. shadowsocks, vmess, vless, trojan, hysteria2, tuic).
5. Ensure the "dns" block has servers like dns_direct and dns_proxy, and appropriate routing rules to keep direct sites direct and proxy sites routed through proxy.
6. The user selected DNS Strategy: ${options?.dnsStrategy || 'system'} and rulesets: ${options?.rulesets?.join(', ') || 'GeoIP:CN, AD-Block'}. Customize the config according to these preferences.
7. Return ONLY a single, clean JSON object containing the full Sing-Box configuration. Do NOT include markdown blocks like \`\`\`json or \`\`\`. Your output must be purely parseable JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Here is the raw input to convert:\n\n${rawConfig}`,
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      // Validate that it's parseable JSON
      try {
        const parsedJson = JSON.parse(responseText.trim());
        res.json(parsedJson);
      } catch (jsonErr) {
        console.error('Gemini output was not valid JSON, raw text:', responseText);
        // Fallback: strip markdown code blocks if the model ignored instructions
        const cleaned = responseText
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();
        const parsedJsonFallback = JSON.parse(cleaned);
        res.json(parsedJsonFallback);
      }
    } catch (error: any) {
      console.error('AI conversion failed:', error);
      res.status(500).json({ error: error.message || 'Gemini API failed to process the request' });
    }
  });

  // Serve static assets
  if (!isProd) {
    console.log('Running server in DEVELOPMENT mode (Vite Middleware)...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running server in PRODUCTION mode (Serving static files)...');
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

function safeAtob(base64: string): string {
  try {
    const binString = atob(base64.trim());
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
      bytes[i] = binString.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return decodeURIComponent(escape(atob(base64)));
  }
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
