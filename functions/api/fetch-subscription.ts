export async function onRequest(context: EventContext<unknown, never, Record<string, unknown>>): Promise<Response> {
  const url = new URL(context.request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return Response.json({ error: 'Missing subscription URL parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'clash/1.0.0 ClashMeta/1.0.0 v2rayN/1.0.0 Sing-Box/1.0.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Target server returned status: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    return new Response(text, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: `Failed to fetch subscription: ${message}` }, { status: 502 });
  }
}