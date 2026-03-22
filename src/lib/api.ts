const HF_SPACE_URL = import.meta.env.VITE_HF_SPACE_URL || "https://mustafatamyapar-explfiqa-api.hf.space";

const MAX_RETRIES = 5;
const RETRY_DELAY = 6000;
const REQUEST_TIMEOUT = 30000; // 30s — CLIP on CPU + HF proxy can be slow

/**
 * Generate a deterministic pseudo-random embedding from an image file.
 * Used as fallback when the HF Space is unavailable.
 */
async function generateMockEmbedding(imageFile: File): Promise<Float32Array> {
  const buffer = await imageFile.slice(0, 4096).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let seed = 0;
  for (let i = 0; i < bytes.length; i++) {
    seed = ((seed << 5) - seed + bytes[i]) | 0;
  }

  const embedding = new Float32Array(512);
  for (let i = 0; i < 512; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    embedding[i] = (seed / 0x7fffffff) * 2 - 1;
  }

  let norm = 0;
  for (let i = 0; i < 512; i++) norm += embedding[i] * embedding[i];
  norm = Math.sqrt(norm);
  for (let i = 0; i < 512; i++) embedding[i] /= norm;

  return embedding;
}

export async function getImageEmbedding(
  imageFile: File,
  onStatus?: (status: string) => void
): Promise<Float32Array> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt === 0) {
        onStatus?.("Sending image to server...");
      } else {
        onStatus?.(`Server is waking up, retrying (${attempt + 1}/${MAX_RETRIES})...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
      }

      const formData = new FormData();
      formData.append("file", imageFile);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const res = await fetch(`${HF_SPACE_URL}/embed`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      onStatus?.("Embedding received!");
      return new Float32Array(data.embedding);
    } catch {
      if (attempt === 0) {
        onStatus?.("Server is waking up (free tier, may take ~30-60s)...");
      }
    }
  }

  // Fallback to mock embedding
  console.warn("HF Space unavailable after all retries, using mock embedding for demo");
  onStatus?.("Using demo mode (server unavailable)");
  return generateMockEmbedding(imageFile);
}

export async function checkHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${HF_SPACE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/** Call at app startup to pre-warm the server (fire and forget) */
export function preCheckServer() {
  checkHealth().then((ok) => {
    if (!ok) console.log("HF Space not immediately available — will retry on analyze");
  });
}
