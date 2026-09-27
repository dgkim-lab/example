import { callProvider } from '../../../lib/ai.js';

export async function POST(request) {
  try {
    const { agent } = await request.json();
    const result = await callProvider({ agent, input: 'Generate one interesting, open-ended idea that would be useful for a two-agent AI conversation. Return only the idea in one or two sentences.' });
    return Response.json({ ...result, kind: 'idea' });
  } catch (error) { return Response.json({ error: error?.message || 'Could not generate an idea.' }, { status: 500 }); }
}
