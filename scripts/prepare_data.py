"""
prepare_data.py — Convert thesis .npy + .csv files to web-friendly JSON for the frontend.

Reads from the thesis-prompt-embeddings repo and writes to ../public/data/.

Outputs:
  - prompts.json:        978 prompts with index, text, shortText, category
  - text_embeddings.json: base64-encoded Float32 binary (978 x 512)
  - weights.json:        978 weights + bias
  - category_meta.json:  category colors, display names
"""

import csv
import json
import base64
import numpy as np
from pathlib import Path

THESIS_ROOT = Path(__file__).resolve().parent.parent.parent / "thesis-prompt-embeddings"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "data"

# Category colors from fig_transparency.py
CATEGORY_COLORS = {
    "age": "#4E79A7", "gender": "#F28E2B", "expression": "#E15759",
    "ethnicity": "#76B7B2", "facialfeatures": "#59A14F", "faceshape": "#EDC948",
    "skinfeatures": "#B07AA1", "makeup": "#FF9DA7", "facialhair": "#9C755F",
    "hairstyle": "#BAB0AC", "haircolor": "#D37295", "headwear": "#A0CBE8",
    "eyewear": "#FFBE7D", "jewelry": "#8CD17D", "accessories": "#B6992D",
    "attire": "#499894", "facecovering": "#86BCB6", "headpose": "#F1CE63",
    "cameraangle": "#D4A6C8", "distance": "#79706E", "lighting": "#D7B5A6",
    "context": "#9D7660",
}

CATEGORY_DISPLAY_NAMES = {
    "facialfeatures": "Facial Feat.", "expression": "Expression",
    "headwear": "Headwear", "lighting": "Lighting", "context": "Context",
    "skinfeatures": "Skin Feat.", "makeup": "Makeup",
    "facecovering": "Face Cover.", "ethnicity": "Ethnicity",
    "hairstyle": "Hairstyle", "attire": "Attire", "eyewear": "Eyewear",
    "jewelry": "Jewelry", "facialhair": "Facial Hair",
    "headpose": "Head Pose", "distance": "Distance",
    "accessories": "Accessories", "faceshape": "Face Shape",
    "cameraangle": "Cam. Angle", "haircolor": "Hair Color",
    "age": "Age", "gender": "Gender",
}

FAIRFACE_RACES = [
    "East Asian", "Indian", "Black", "White",
    "Middle Eastern", "Hispanic", "Southeast Asian",
]


def strip_prompt_prefix(text):
    for prefix in ["A photo of a ", "A photo of an "]:
        if text.startswith(prefix):
            return text[len(prefix):].rstrip(".")
    return text.rstrip(".")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # --- Load prompts ---
    prompts_file = THESIS_ROOT / "data" / "prompts.txt"
    prompts = []
    with open(prompts_file, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader)  # skip header
        for row in reader:
            if len(row) >= 3:
                prompts.append({
                    "index": int(row[0]),
                    "text": row[1],
                    "shortText": strip_prompt_prefix(row[1]),
                    "category": row[2].strip(),
                })
    print(f"Loaded {len(prompts)} prompts")

    # --- Load kept indices ---
    kept_indices = np.load(THESIS_ROOT / "potential-backups" / "kept_original_indices.npy")
    print(f"Kept indices: {len(kept_indices)}")

    # --- Load and stack text embeddings ---
    emb_dir = THESIS_ROOT / "data" / "text_embeddings_clip" / "normalized"
    embeddings = []
    for i, orig_idx in enumerate(kept_indices):
        emb_file = emb_dir / f"{orig_idx}.npy"
        emb = np.load(emb_file).astype(np.float32)
        embeddings.append(emb)
    embeddings = np.stack(embeddings)  # (978, 512)
    print(f"Text embeddings shape: {embeddings.shape}")

    # Verify alignment: prompts[i].index should match position i
    assert len(prompts) == len(kept_indices), f"Mismatch: {len(prompts)} prompts vs {len(kept_indices)} kept indices"

    # --- Load weights ---
    weights_with_bias = np.load(THESIS_ROOT / "data" / "input_transparency" / "weights_with_bias.npy")
    weights = weights_with_bias[:-1].astype(np.float32)
    bias = float(weights_with_bias[-1])
    print(f"Weights: {len(weights)}, Bias: {bias:.6f}")

    # --- Write prompts.json ---
    with open(OUTPUT_DIR / "prompts.json", "w") as f:
        json.dump(prompts, f)
    print(f"Wrote prompts.json ({len(prompts)} entries)")

    # --- Write text_embeddings.json (base64 Float32) ---
    emb_bytes = embeddings.tobytes()
    emb_b64 = base64.b64encode(emb_bytes).decode("ascii")
    with open(OUTPUT_DIR / "text_embeddings.json", "w") as f:
        json.dump({
            "shape": list(embeddings.shape),
            "dtype": "float32",
            "data": emb_b64,
        }, f)
    print(f"Wrote text_embeddings.json ({len(emb_bytes)} bytes -> {len(emb_b64)} b64 chars)")

    # --- Write weights.json ---
    with open(OUTPUT_DIR / "weights.json", "w") as f:
        json.dump({
            "weights": weights.tolist(),
            "bias": bias,
        }, f)
    print(f"Wrote weights.json")

    # --- Write category_meta.json ---
    with open(OUTPUT_DIR / "category_meta.json", "w") as f:
        json.dump({
            "colors": CATEGORY_COLORS,
            "displayNames": CATEGORY_DISPLAY_NAMES,
        }, f)
    print(f"Wrote category_meta.json")

    print("\nDone! All files written to:", OUTPUT_DIR)


if __name__ == "__main__":
    main()
