import { defaultModels } from '../../../lib/ai.js';

export async function GET() { return Response.json({ models: defaultModels }); }
