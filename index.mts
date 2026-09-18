/**
 * AI Gateway image generation script.
 *
 * Usage:
 *   AI_GATEWAY_API_KEY=<key> node --experimental-strip-types index.mts
 *
 * Requires Node.js >= 22.18 and the `ai` package.
 * Generates an image with openai/gpt-image-2 and saves it to output.png.
 */

import { generateImage } from "ai";
import { createGateway } from "@ai-sdk/gateway";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const apiKey = process.env.AI_GATEWAY_API_KEY;
if (!apiKey) {
  console.error("Error: AI_GATEWAY_API_KEY environment variable is not set.");
  console.error(
    "Set it before running: AI_GATEWAY_API_KEY=<key> node --experimental-strip-types index.mts"
  );
  process.exit(1);
}

const gateway = createGateway({ apiKey });

console.log("Generating image with openai/gpt-image-2 via AI Gateway...");

const { image } = await generateImage({
  model: gateway.image("openai/gpt-image-2"),
  prompt: "A serene personal organizer desk with a notebook, pen, and coffee",
  size: "1024x1024",
});

const outputPath = join(import.meta.dirname, "output.png");
await writeFile(outputPath, image.uint8Array);

console.log(`Image saved to: ${outputPath}`);
console.log(`File size: ${image.uint8Array.byteLength} bytes`);
