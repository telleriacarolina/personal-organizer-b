import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env (gitignored) before importing the gateway
const envPath = resolve(import.meta.dirname, '.env');
try {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const val = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env not present — rely on environment variables already set
}

import { generateText } from 'ai';

const { text } = await generateText({
  model: 'openai/gpt-5.6-sol' as never,
  prompt: 'Say hello and introduce yourself in one sentence.',
});

console.log(text);
