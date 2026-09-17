/**
 * AI Gateway video generation script.
 *
 * Usage:
 *   node --import tsx/esm index.mts
 *   -- or --
 *   npx tsx index.mts
 *
 * Requires AI_GATEWAY_API_KEY to be set in the environment or in a .env file.
 * The .env file is gitignored and must never be committed.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Load .env (if present) without any external dotenv dependency.
// This is a minimal inline loader that handles KEY=value and KEY="value".
// ---------------------------------------------------------------------------
const envPath = resolve(import.meta.dirname ?? ".", ".env");
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
// Guard: ensure the API key is available before importing the AI SDK.
// ---------------------------------------------------------------------------
if (!process.env["AI_GATEWAY_API_KEY"]) {
  console.error(
    "Error: AI_GATEWAY_API_KEY is not set.\n" +
      "  1. Run `npx vercel@latest login` if not already authenticated.\n" +
      "  2. Run:\n" +
      "       npx vercel@latest --scope <team-slug> ai-gateway api-keys create --name personal-organizer-video-gen\n" +
      "  3. Store the printed key in a .env file:\n" +
      "       echo 'AI_GATEWAY_API_KEY=<key>' >> .env\n" +
      "  The .env file is gitignored and safe to use locally."
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Generate the video via Vercel AI Gateway.
// ---------------------------------------------------------------------------
import { experimental_generateVideo } from "ai";
import { createGateway } from "@ai-sdk/gateway";

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
