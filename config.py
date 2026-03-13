from pathlib import Path
import torch

TARGET_SR = 16000
CHUNK_DURATION = 2.0
CHUNK_SAMPLES = int(TARGET_SR * CHUNK_DURATION)

MODEL_DIR = Path("models/")
HEAR_MODEL_PATH = MODEL_DIR / "hear_model_local"
PIPELINE_PATH = MODEL_DIR / "hear_pipeline.joblib"

FUSION_WEIGHTS = {"acoustic": 0.5, "semantic": 0.5}


if torch.cuda.is_available():
    DEVICE = "cuda"
elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
    DEVICE = "mps"
else:
    DEVICE = "cpu"