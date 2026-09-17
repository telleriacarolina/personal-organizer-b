/**
 * realtime.mts — AI Gateway speech-to-speech demo
 *
 * Prerequisites:
 *   AI_GATEWAY_API_KEY set in .env.local (loaded below via dotenv/config)
 *
 * Run:
 *   node --env-file=.env.local --experimental-strip-types realtime.mts
 *
 * Output:
 *   output.wav — playable WAV file containing the assistant's spoken response
 */

import { writeFileSync } from "node:fs";
import WebSocket from "ws";
import { createGateway, getGatewayRealtimeProtocols } from "@ai-sdk/gateway";

// ── 1. Validate key ──────────────────────────────────────────────────────────

const apiKey = process.env.AI_GATEWAY_API_KEY;
if (!apiKey) {
  console.error(
    "Error: AI_GATEWAY_API_KEY is not set.\n" +
      "Add it to .env.local and re-run:\n" +
      "  node --env-file=.env.local --experimental-strip-types realtime.mts"
  );
  process.exit(1);
}

// ── 2. Obtain ephemeral token ────────────────────────────────────────────────

const gateway = createGateway({ apiKey });

console.log("Requesting ephemeral realtime token for openai/gpt-realtime-2 …");
const { token, url } = await gateway.experimental_realtime.getToken({
  model: "openai/gpt-realtime-2",
});

console.log(`WebSocket URL: ${url}`);

// ── 3. Connect and run the realtime session ──────────────────────────────────

const protocols = getGatewayRealtimeProtocols(token);
const ws = new WebSocket(url, protocols);

/** PCM audio chunks accumulated from the model's delta events */
const pcmChunks: Buffer[] = [];

await new Promise<void>((resolve, reject) => {
  ws.on("error", reject);

  ws.on("open", () => {
    console.log("WebSocket connected. Sending session config …");

    // Configure a text-only input session (no mic required in this script)
    ws.send(
      JSON.stringify({
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          instructions:
            "You are a helpful assistant. Respond with a short spoken greeting.",
          voice: "alloy",
          output_audio_format: "pcm16",
          turn_detection: null,
        },
      })
    );

    // Send a single text turn as the user
    ws.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "Say hello in one sentence." }],
        },
      })
    );

    // Ask the model to generate a response
    ws.send(JSON.stringify({ type: "response.create" }));
  });

  ws.on("message", (raw: Buffer) => {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const type = event["type"] as string;

    if (type === "response.audio.delta") {
      // base64-encoded PCM16 audio
      const delta = event["delta"] as string;
      if (delta) {
        pcmChunks.push(Buffer.from(delta, "base64"));
      }
    } else if (type === "response.audio.done") {
      console.log("Audio stream complete.");
    } else if (type === "response.done") {
      console.log("Response done, closing WebSocket …");
      ws.close();
    } else if (type === "error") {
      reject(new Error(JSON.stringify(event)));
    }
  });

  ws.on("close", () => resolve());
});

// ── 4. Write WAV file ────────────────────────────────────────────────────────

const pcm = Buffer.concat(pcmChunks);

if (pcm.length === 0) {
  console.warn("Warning: no audio data received. Check the API response.");
  process.exit(0);
}

const SAMPLE_RATE = 24_000; // OpenAI realtime default
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const BYTE_RATE = (SAMPLE_RATE * NUM_CHANNELS * BITS_PER_SAMPLE) / 8;
const BLOCK_ALIGN = (NUM_CHANNELS * BITS_PER_SAMPLE) / 8;
const DATA_SIZE = pcm.length;
const RIFF_SIZE = 36 + DATA_SIZE;

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(RIFF_SIZE, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16); // PCM chunk size
header.writeUInt16LE(1, 20); // PCM format
header.writeUInt16LE(NUM_CHANNELS, 22);
header.writeUInt32LE(SAMPLE_RATE, 24);
header.writeUInt32LE(BYTE_RATE, 28);
header.writeUInt16LE(BLOCK_ALIGN, 32);
header.writeUInt16LE(BITS_PER_SAMPLE, 34);
header.write("data", 36);
header.writeUInt32LE(DATA_SIZE, 40);

const OUTPUT_FILE = "output.wav";
writeFileSync(OUTPUT_FILE, Buffer.concat([header, pcm]));

console.log(
  `\n✅ Done. Audio saved to ${OUTPUT_FILE} (${pcm.length} PCM bytes, ~${(pcm.length / BYTE_RATE).toFixed(1)} s)`
);
