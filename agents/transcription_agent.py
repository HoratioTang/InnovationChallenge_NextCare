"""Audio transcription agent — loads a WAV file and processes it for transcription.

LLM-driven agent.
Reads:  state.audio_path
Writes: state.transcript_text, state.meralion_acoustic_analysis, state.meralion_cognitive_insights, state.messages, state.errors
"""

import os
import time
import httpx
import librosa
import pathlib
import tempfile
import soundfile as sf
from dotenv import load_dotenv
from agents.state import AgentState


# --- Audio Preprocessing ---
def preprocess_audio(file_path: str, target_sr: int = 16000) -> str:
    """Preprocess audio by resampling to 16kHz mono."""
    y, sr = librosa.load(file_path, sr=target_sr, mono=True)
    temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    temp_path = temp_file.name
    sf.write(temp_path, y, target_sr)
    return temp_path

# --- MERaLiON API ---
class MeralionAPIHandler:
    def __init__(self, api_key: str):
        self.headers = {"x-api-key": api_key, "Content-Type": "application/json"}
        self.timeout = httpx.Timeout(10.0, read=150.0)

    def run_transcription_pipeline(self, file_path: str):
        """MERaLiON API call sequence: upload -> transcribe -> analyze -> process."""
        temp_path = preprocess_audio(file_path)
        base_url = "https://api.cr8lab.com"

        try:
            # Get Upload URL
            f_size = pathlib.Path(temp_path).stat().st_size
            payload = {"filename": pathlib.Path(temp_path).name, "contentType": "audio/wav", "fileSize": f_size}
            up_res = httpx.post(f"{base_url}/upload-url", headers=self.headers, json=payload, timeout=self.timeout)
            up_res.raise_for_status()
            info = up_res.json()["response"]

            # Upload to S3
            with open(temp_path, "rb") as f:
                s3_res = httpx.put(info["url"], content=f, headers={"Content-Type": "audio/wav"})
                s3_res.raise_for_status()

            time.sleep(3)

            # Fetch the file key
            key_payload = {"key": info["key"]}

            # Fetch transcript
            t_res = httpx.post(f"{base_url}/transcribe", headers=self.headers, json={**key_payload, "temperature": 0.1}, timeout=self.timeout)
            t_res.raise_for_status()

            # Fetch acoustic and cognitive analysis
            a_res = httpx.post(f"{base_url}/analyze", headers=self.headers, json=key_payload, timeout=self.timeout)
            c_res = httpx.post(f"{base_url}/process", headers=self.headers, json={**key_payload, "instruction": "Analyze for dementia signs."}, timeout=self.timeout)

            return {
                "transcript": t_res.json()["response"]["text"],
                "acoustic": a_res.json()["response"]["text"],
                "cognitive": c_res.json()["response"]["text"]
            }
        finally:
            if os.path.exists(temp_path): os.remove(temp_path)

# --- Transcription Agent ---
def transcription_agent(state: AgentState) -> dict:
    """
    Transcription agent that processes audio files using MERaLiON API and updates the state with results.
    """
    load_dotenv()
    api_key = os.getenv("MERALION_API_KEY")

    if not api_key:
        return {
            "errors": ["[transcription_agent] Missing MERALION_API_KEY"],
            "messages": ["[transcription_agent] Error: API Key missing."],
        }

    handler = MeralionAPIHandler(api_key)

    try:
        results = handler.run_transcription_pipeline(state.audio_file_path)

        return {
            "transcript_text": results["transcript"],
            "meralion_acoustic_analysis": results["acoustic"],
            "meralion_cognitive_insights": results["cognitive"],
            "messages": [f"[transcription_agent] Successfully processed {state.file_name}"],
        }

    except Exception as e:
        return {
            "errors": [f"[transcription_agent] {e}"],
            "messages": [f"[transcription_agent] Exception occurred: {e}"],
        }