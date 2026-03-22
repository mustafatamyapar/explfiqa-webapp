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
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        outputs = model.get_image_features(**inputs)

    # outputs shape: (1, 512) — squeeze to (512,), then L2-normalize
    embedding = outputs.squeeze(0).numpy()
    embedding = embedding / np.linalg.norm(embedding)

    return {"embedding": embedding.tolist()}
