import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

const clients = {
  openai: process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null,
  gemini: process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null,
  ollama: new OpenAI({ baseURL: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1', apiKey: process.env.OLLAMA_API_KEY || 'ollama' }),
  lmstudio: new OpenAI({ baseURL: process.env.LMSTUDIO_BASE_URL || 'http://127.0.0.1:1234/v1', apiKey: process.env.LMSTUDIO_API_KEY || 'lm-studio' }),
};

export const defaultModels = {
  openai: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
  gemini: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  ollama: process.env.OLLAMA_MODEL || 'llama3.2',
  lmstudio: process.env.LMSTUDIO_MODEL || 'local-model',
};

function validateAgent(agent) {
  if (!agent || !['openai', 'gemini', 'ollama', 'lmstudio'].includes(agent.provider)) throw new Error('Choose a supported provider for this agent.');
  if (!agent.model?.trim()) throw new Error('A model is required.');
  if (!clients[agent.provider]) throw new Error(`${agent.provider.toUpperCase()} is not configured on the server.`);
}

export async function callProvider({ agent, input, systemPrompt }) {
  validateAgent(agent);
  const started = Date.now();
  let text;
  let api;
  if (agent.provider === 'openai' || agent.provider === 'ollama' || agent.provider === 'lmstudio') {
    const request = { model: agent.model, input };
    if ((systemPrompt ?? agent.systemPrompt)?.trim()) request.instructions = (systemPrompt ?? agent.systemPrompt).trim();
    const response = await clients[agent.provider].responses.create(request);
    text = response.output_text?.trim();
    api = '/v1/responses';
  } else {
    const request = { model: agent.model, contents: input };
    if ((systemPrompt ?? agent.systemPrompt)?.trim()) request.config = { systemInstruction: (systemPrompt ?? agent.systemPrompt).trim() };
    const response = await clients.gemini.models.generateContent(request);
    text = response.text?.trim();
    api = 'models.generateContent';
  }
  if (!text) throw new Error('The provider returned an empty response.');
  return { text, provider: agent.provider, model: agent.model, api, durationMs: Date.now() - started };
}

export async function parseBody(request) { return request.json(); }
