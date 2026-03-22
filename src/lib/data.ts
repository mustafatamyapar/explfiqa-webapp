import type { Prompt, CategoryMeta, WeightsData, TextEmbeddingsData } from "@/types";

let cachedPrompts: Prompt[] | null = null;
let cachedCategoryMeta: CategoryMeta | null = null;
let cachedWeights: WeightsData | null = null;
let cachedTextEmbeddings: Float32Array | null = null;
let cachedEmbeddingShape: [number, number] | null = null;

export async function loadPrompts(): Promise<Prompt[]> {
  if (cachedPrompts) return cachedPrompts;
  const res = await fetch("/data/prompts.json");
  cachedPrompts = await res.json();
  return cachedPrompts!;
}

export async function loadCategoryMeta(): Promise<CategoryMeta> {
  if (cachedCategoryMeta) return cachedCategoryMeta;
  const res = await fetch("/data/category_meta.json");
  cachedCategoryMeta = await res.json();
  return cachedCategoryMeta!;
}

export async function loadWeights(): Promise<WeightsData> {
  if (cachedWeights) return cachedWeights;
  const res = await fetch("/data/weights.json");
  cachedWeights = await res.json();
  return cachedWeights!;
}

export async function loadTextEmbeddings(): Promise<{
  embeddings: Float32Array;
  shape: [number, number];
}> {
  if (cachedTextEmbeddings && cachedEmbeddingShape) {
    return { embeddings: cachedTextEmbeddings, shape: cachedEmbeddingShape };
  }
  const res = await fetch("/data/text_embeddings.json");
  const data: TextEmbeddingsData = await res.json();

  const binaryStr = atob(data.data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  cachedTextEmbeddings = new Float32Array(bytes.buffer);
  cachedEmbeddingShape = data.shape as [number, number];

  return { embeddings: cachedTextEmbeddings, shape: cachedEmbeddingShape };
}

export async function loadAllData() {
  const [prompts, categoryMeta, weights, { embeddings, shape }] =
    await Promise.all([
      loadPrompts(),
      loadCategoryMeta(),
      loadWeights(),
      loadTextEmbeddings(),
    ]);
  return { prompts, categoryMeta, weights, embeddings, embeddingShape: shape };
}
