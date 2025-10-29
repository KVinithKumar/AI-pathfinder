import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_GENAI_API_KEY;

export const ai = genkit({
  // Pass apiKey when available; plugin also supports env var GOOGLE_GENAI_API_KEY
  plugins: [apiKey ? googleAI({ apiKey }) : googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
