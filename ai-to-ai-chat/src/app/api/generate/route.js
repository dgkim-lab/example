import { callProvider } from '../../../lib/ai.js';

export async function POST(request) {
  try {
    const { kind, idea, question, agent } = await request.json();
    if (!idea?.trim()) return Response.json({ error: 'Enter an initial idea first.' }, { status: 400 });
    if (kind === 'question') {
      const result = await callProvider({ agent, input: `Initial idea from the user:\n${idea}\n\nYour job is to create one thoughtful, specific question for the second AI agent. Return only the question, with no preamble or answer.` });
      return Response.json({ ...result, kind });
    }
    if (kind === 'response' || kind === 'followup') {
      if (!question?.trim()) return Response.json({ error: 'A question is required.' }, { status: 400 });
      const result = await callProvider({ agent, input: question.trim() });
      return Response.json({ ...result, kind });
    }
    return Response.json({ error: 'Unknown generation step.' }, { status: 400 });
  } catch (error) { return Response.json({ error: error?.message || 'The provider request failed.' }, { status: 500 }); }
}
