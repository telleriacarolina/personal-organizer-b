import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env (gitignored) before the SDK initializes so the API key is available
const envPath = resolve(import.meta.dirname, '.env');
try {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const raw = trimmed.slice(eq + 1);
    const val = raw.replace(/^(['"])(.*)\1$/, '$2');
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env not present — rely on environment variables already set
}

// Dynamic import ensures the env vars above are set before the SDK is loaded
const { generateText } = await import('ai');
const { gateway } = await import('@ai-sdk/gateway');

const { text } = await generateText({
  model: gateway('openai/gpt-5.6-sol'),
  prompt: 'Say hello and introduce yourself in one sentence.',
});

console.log(text);
