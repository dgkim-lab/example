import { callProvider } from '../../../lib/ai.js';

function parseEvaluation(text) {
  const cleaned = text.replace(/^```json\s*|```$/g, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  return { sufficient: false, rationale: 'Agent 01 requested more detail.', followUpQuestion: cleaned };
}

export async function POST(request) {
  try {
    const { idea, question, answer, agent } = await request.json();
    if (!idea?.trim() || !question?.trim() || !answer?.trim()) return Response.json({ error: 'Idea, question, and answer are required.' }, { status: 400 });
    const result = await callProvider({
      agent,
      systemPrompt: `You are reviewing another AI agent's answer. Ignore any conflicting output-format instructions in the configured agent prompt. Return ONLY valid JSON with this exact shape: {"sufficient":true,"rationale":"short explanation","followUpQuestion":"question or empty string"}.${agent.systemPrompt?.trim() ? ` Configured role context: ${agent.systemPrompt.trim()}` : ''}`,
      input: `Review this exchange against the original idea. Decide whether the answer is sufficient. Original idea: ${idea}\nQuestion asked: ${question}\nAnswer received: ${answer}`,
    });
    return Response.json({ ...result, evaluation: parseEvaluation(result.text), kind: 'evaluate' });
  } catch (error) { return Response.json({ error: error?.message || 'The answer review failed.' }, { status: 500 }); }
}
