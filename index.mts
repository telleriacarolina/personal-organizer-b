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
