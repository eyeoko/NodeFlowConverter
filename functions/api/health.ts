export async function onRequest(context: EventContext<unknown, never, Record<string, unknown>>): Promise<Response> {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}