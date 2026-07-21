import { parseSubscription, generateSingBoxConfig } from '../../src/utils/parser';

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

export async function onRequest(context: EventContext<unknown, never, Record<string, unknown>>): Promise<Response> {
  const url = new URL(context.request.url);

  try {
    const {
      config,
      template,
      dns,
      rulesets,
      groupByCountry,
      includeAutoGroup,
      enableClashApi,
      clashApiPort,
      clashUiUrl,
      enableTun,
      enableMixed,
      mixedPort,
    } = Object.fromEntries(url.searchParams.entries());

    if (!config) {
      return new Response('Error: Missing config base64 data', { status: 400 });
    }

    const rawText = safeAtob(config);
    const parsedNodes = parseSubscription(rawText);

    const singBoxConfig = generateSingBoxConfig(parsedNodes, {
      template: (template ?? 'singbox-latest') as 'singbox-latest',
      dnsStrategy: (dns ?? 'system') as 'system' | 'fakeip',
      rulesets: rulesets ? rulesets.split(',').filter(Boolean) : ['AD-Block', 'GeoIP:CN'],
      groupByCountry: groupByCountry === 'true',
      includeAutoGroup: includeAutoGroup !== 'false',
      enableClashApi: enableClashApi === 'true',
      clashApiPort: clashApiPort ?? '0.0.0.0:9090',
      clashUiUrl: clashUiUrl ?? '',
      enableTun: enableTun !== 'false',
      enableMixed: enableMixed !== 'false',
      mixedPort: mixedPort ?? '2080',
    });

    return new Response(singBoxConfig, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="singbox_config.json"',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(`Error: ${message}`, { status: 500 });
  }
}