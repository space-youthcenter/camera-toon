import { transformWithOpenAI } from "./lib/openai-image.mjs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const body = JSON.parse(event.body || "{}");
    const parsed = parseDataURL(body.image);
    if (parsed.buffer.length > MAX_IMAGE_BYTES) return json(413, { error: "Image is too large" });

    const base64 = await transformWithOpenAI(
      parsed.buffer,
      parsed.mimeType,
      Number(body.width) || 1024,
      Number(body.height) || 1024
    );
    return json(200, { image: `data:image/png;base64,${base64}` });
  } catch (error) {
    console.error("Camera Toon transform failed", error instanceof Error ? error.message : error);
    return json(502, { error: "Image transformation failed" });
  }
}

function parseDataURL(value) {
  if (typeof value !== "string") throw new Error("Image is required");
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Unsupported image data");
  return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body)
  };
}
