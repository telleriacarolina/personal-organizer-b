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
    const key = trimmed.slice(0, eq).trim();
    const raw = trimmed.slice(eq + 1);
    const val = raw.replace(/^(['"])(.*)\1$/, '$2').trim();
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
/**
 * AI Gateway video generation script.
 *
 * Usage (Node.js 22.6+ — native TypeScript strip-types, no extra tools needed):
 *   node --experimental-strip-types index.mts
 *
 * Requires AI_GATEWAY_API_KEY to be set in the environment or in a `.env`
 * file located in the same directory as this script.
 * The `.env` file is gitignored and must never be committed.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Load .env (if present) without any external dotenv dependency.
// Looks for `.env` in the same directory as this script.
// Handles KEY=value and KEY="value" / KEY='value' syntax.
// ---------------------------------------------------------------------------
const envPath = resolve(import.meta.dirname, ".env");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  }
}

// ---------------------------------------------------------------------------
// Guard: ensure the API key is available before loading the AI SDK modules.
// Dynamic imports below are intentional — static imports are hoisted and
// would execute before this check and before .env is loaded.
// ---------------------------------------------------------------------------
if (!process.env["AI_GATEWAY_API_KEY"]) {
  console.error(
    "Error: AI_GATEWAY_API_KEY is not set.\n" +
      "  1. Run `npx vercel@latest login` if not already authenticated.\n" +
      "  2. Run:\n" +
      "       npx vercel@latest --scope <team-slug> ai-gateway api-keys create --name personal-organizer-video-gen\n" +
      "  3. Store the printed key in a .env file in the project root:\n" +
      "       echo 'AI_GATEWAY_API_KEY=<key>' >> .env\n" +
      "  The .env file is gitignored and safe to use locally."
import { readFileSync, writeFileSync } from "node:fs";
import { createGateway } from "@ai-sdk/gateway";
import { experimental_generateSpeech, experimental_transcribe } from "ai";

const apiKey = process.env.AI_GATEWAY_API_KEY;
if (!apiKey) {
  console.error(
    "Error: AI_GATEWAY_API_KEY is not set. " +
      "Add it to .env.local and re-run with: node --env-file=.env.local --experimental-strip-types index.mts"
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Generate the video via Vercel AI Gateway.
// Dynamic imports are used so they only load after the guard above passes.
// ---------------------------------------------------------------------------
const { experimental_generateVideo } = await import("ai");
const { createGateway } = await import("@ai-sdk/gateway");

const OUTPUT_FILE = "output.mp4";
const MODEL_ID = "google/veo-3.1-fast-generate-001" as const;

const gateway = createGateway({
  apiKey: process.env["AI_GATEWAY_API_KEY"],
});

console.log(`Generating video with model: ${MODEL_ID} …`);
console.log("This may take a minute or two for async generation.");

const { video, warnings } = await experimental_generateVideo({
  model: gateway.video(MODEL_ID),
  prompt:
    "A calm sunrise over a mountain lake with gentle ripples on the water and birds flying in the distance.",
});

if (warnings.length > 0) {
  console.warn("Provider warnings:");
  for (const w of warnings) console.warn(" •", w);
}

writeFileSync(OUTPUT_FILE, video.uint8Array);

console.log(`\n✅ Video saved to: ${resolve(OUTPUT_FILE)}`);
console.log(`   Media type : ${video.mediaType}`);
console.log(`   Size       : ${(video.uint8Array.byteLength / 1024).toFixed(1)} KB`);
const gateway = createGateway({ apiKey });

// ── 1. Text → Speech ─────────────────────────────────────────────────────────
console.log("Generating speech with openai/tts-1 …");
const speechResult = await experimental_generateSpeech({
  model: gateway.speech("openai/tts-1"),
  text: "Hello from the AI Gateway speech-to-text demo!",
});

const audioPath = "/tmp/tts-output.mp3";
writeFileSync(audioPath, Buffer.from(await speechResult.audio.uint8Array));
console.log(`✓ Speech saved to ${audioPath} (${speechResult.audio.uint8Array.byteLength} bytes)`);

// ── 2. Speech → Text ─────────────────────────────────────────────────────────
console.log("\nTranscribing with openai/whisper-1 …");
const audioBuffer = readFileSync(audioPath);
const transcribeResult = await experimental_transcribe({
  model: gateway.transcription("openai/whisper-1"),
  audio: audioBuffer,
});

console.log("✓ Transcription:", transcribeResult.text);
