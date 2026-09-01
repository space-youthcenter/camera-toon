const PAPER_TOON_PROMPT = `Transform this photo crop into a warm hand-drawn colored pencil sketch on paper. Keep the main shapes and composition. Add rough black ink outlines, slightly imperfect hand-drawn lines, simplified details, soft colored pencil or crayon texture, visible paper grain, uneven hand-colored fills, and a cute analog doodle feeling. Avoid anime, webtoon, glossy digital cartoon, 3D render, oil painting, watercolor, and realistic photo style.`;

export async function transformWithOpenAI(imageBuffer, mimeType, width, height) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const form = new FormData();
  form.append("model", process.env.OPENAI_IMAGE_MODEL || "gpt-image-2");
  form.append("image[]", new Blob([imageBuffer], { type: mimeType }), "camera-toon-crop.jpg");
  form.append("prompt", PAPER_TOON_PROMPT);
  form.append("size", chooseImageSize(width, height));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);
  try {
    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal
    });
    const payload = await response.json();
    if (!response.ok) {
      const message = payload?.error?.message || `OpenAI returned ${response.status}`;
      throw new Error(message);
    }
    const base64 = payload?.data?.[0]?.b64_json;
    if (!base64) throw new Error("OpenAI returned no image");
    return base64;
  } finally {
    clearTimeout(timeout);
  }
}

function chooseImageSize(width, height) {
  if (width > height * 1.15) return "1536x1024";
  if (height > width * 1.15) return "1024x1536";
  return "1024x1024";
}
