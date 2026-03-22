const HF_SPACE_URL = import.meta.env.VITE_HF_SPACE_URL || "https://mustafatamyapar-explfiqa-api.hf.space";

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;
const REQUEST_TIMEOUT = 8000;

// Track whether the server is reachable so we skip retries after first failure
let serverReachable: boolean | null = null;

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
  // If we already know server is down, go straight to mock
  if (serverReachable === false) {
    onStatus?.("Using demo mode (server unavailable)");
    return generateMockEmbedding(imageFile);
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        onStatus?.(`Server is waking up, retrying (${attempt + 1}/${MAX_RETRIES})...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
      } else {
        onStatus?.("Computing embedding...");
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
      serverReachable = true;
      return new Float32Array(data.embedding);
    } catch {
      if (attempt === 0) {
        onStatus?.("Server is waking up (this may take ~30s)...");
      }
    }
  }

  // Fallback to mock embedding
  serverReachable = false;
  console.warn("HF Space unavailable, using mock embedding for demo");
  onStatus?.("Using demo mode (server unavailable)");
  return generateMockEmbedding(imageFile);
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${HF_SPACE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    serverReachable = res.ok;
    return res.ok;
  } catch {
    serverReachable = false;
    return false;
  }
}

/** Call at app startup to pre-check server status */
export function preCheckServer() {
  checkHealth().then((ok) => {
    if (!ok) console.log("HF Space offline — will use demo mode");
  });
}
