"""
EXPL-FIQA API — CLIP ViT-B/16 image embedding endpoint.

Deployed on HuggingFace Spaces (free CPU tier).
Accepts an image upload, returns L2-normalized 512-dim CLIP embedding.
"""

import io
import numpy as np
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import torch
from transformers import CLIPModel, CLIPProcessor

app = FastAPI(title="EXPL-FIQA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
processor = None


@app.on_event("startup")
def load_model():
    global model, processor
    model = CLIPModel.from_pretrained("openai/clip-vit-base-patch16")
    processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch16")
    model.eval()


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/embed")
async def embed(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        inputs = processor(images=image, return_tensors="pt")
        with torch.no_grad():
            outputs = model.get_image_features(**inputs)

        # Handle both tensor and BaseModelOutputWithPooling
        if hasattr(outputs, "pooler_output"):
            embedding = outputs.pooler_output.squeeze(0).cpu().numpy().astype(float)
        else:
            embedding = outputs.squeeze(0).cpu().numpy().astype(float)
        norm = float(np.linalg.norm(embedding))
        if norm > 0:
            embedding = embedding / norm

        return {"embedding": [float(x) for x in embedding]}
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}
