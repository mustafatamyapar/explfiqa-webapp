export const SAMPLE_URLS = [
  "/samples/sample1.jpg",
  "/samples/sample2.jpg",
  "/samples/sample3.jpg",
];

/** Fetch a sample image URL and return it as a File object */
async function urlToFile(url: string, filename: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], filename, { type: "image/jpeg" });
}

/** Load all 3 sample images as File objects */
export async function loadSampleImages(): Promise<File[]> {
  return Promise.all(
    SAMPLE_URLS.map((url, i) => urlToFile(url, `sample${i + 1}.jpg`))
  );
}

/** Load 2 sample images for comparison (image 1 vs image 3) */
export async function loadComparisonSamples(): Promise<[File, File]> {
  const [a, , b] = await loadSampleImages();
  return [a, b];
}

let cachedSampleEmbeddings: Float32Array[] | null = null;

/** Load pre-computed CLIP embeddings for the 3 sample images */
export async function loadSampleEmbeddings(): Promise<Float32Array[]> {
  if (cachedSampleEmbeddings) return cachedSampleEmbeddings;

  const res = await fetch("/data/sample_embeddings.json");
  const data: number[][] = await res.json();
  cachedSampleEmbeddings = data.map((arr) => new Float32Array(arr));
  return cachedSampleEmbeddings;
}
