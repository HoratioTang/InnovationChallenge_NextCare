"""NextCare — Dementia Screening Tool (Streamlit UI).

Two-tab interface:
  Tab 1: Upload audio file + configure screening
  Tab 2: View screening report with scores
"""

import sys
import tempfile
from pathlib import Path

import streamlit as st
from pydub import AudioSegment

# Ensure project root is on sys.path so agent imports resolve
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from agents.graph import build_graph

# =====================================================================
# Page config
# =====================================================================

st.set_page_config(
    page_title="NextCare | Dementia Screening",
    page_icon="🧠",
    layout="centered",
)

# =====================================================================
# Pipeline (cached — built once, reused across reruns)
# =====================================================================


@st.cache_resource
def _get_pipeline():
    """Compile the LangGraph pipeline once and cache it."""
    return build_graph()


def _run_pipeline(audio_path, subject_id, language_code, file_name):
    """Run the full screening pipeline on an audio file."""
    pipeline = _get_pipeline()
    return pipeline.invoke({
        "audio_file_path": audio_path,
        "subject_id": subject_id,
        "report_language": language_code,
        "file_name": file_name,
    })


# =====================================================================
# Audio format conversion
# =====================================================================

SUPPORTED_FORMATS = ["wav", "m4a", "mp3", "ogg", "flac"]


def _ensure_wav(file_path: str) -> str:
    """Convert audio file to 16kHz mono WAV if needed. Returns path to WAV file."""
    path = Path(file_path)
    if path.suffix.lower() == ".wav":
        return file_path

    audio = AudioSegment.from_file(file_path)
    audio = audio.set_frame_rate(16000).set_channels(1)

    wav_path = path.with_suffix(".wav")
    audio.export(str(wav_path), format="wav")

    # Remove the original non-wav temp file
    path.unlink(missing_ok=True)

    return str(wav_path)


# =====================================================================
# Helpers
# =====================================================================

LANGUAGES = {
    "English": "en",
    "Mandarin (中文)": "zh",
}


def _score_color(score):
    """Return colour label based on score threshold."""
    if score < 0.3:
        return "green", "Low Risk"
    elif score < 0.7:
        return "orange", "Moderate"
    else:
        return "red", "Elevated"


def _render_score_bar(label, score, help_text=""):
    """Render a score with a coloured progress bar."""
    color, risk_label = _score_color(score)

    color_map = {"green": "#28a745", "orange": "#ffc107", "red": "#dc3545"}
    bar_color = color_map[color]

    st.markdown(
        f"**{label}**"
        f'<span style="float:right; color:{bar_color}; font-weight:600;">'
        f"{risk_label} ({score:.2f})</span>",
        unsafe_allow_html=True,
    )
    st.progress(score)
    if help_text:
        st.caption(help_text)


# =====================================================================
# Session state initialisation
# =====================================================================

if "results" not in st.session_state:
    st.session_state.results = None
if "uploaded_file_name" not in st.session_state:
    st.session_state.uploaded_file_name = None


# =====================================================================
# Header
# =====================================================================

st.markdown(
    "<h1 style='text-align:center;'>Dementia Screening Tool</h1>"
    "<p style='text-align:center; color:grey;'>"
    "A calm, voice-based assessment designed to help you monitor "
    "cognitive health from the comfort of your home."
    "</p>",
    unsafe_allow_html=True,
)

st.divider()

# =====================================================================
# Tabs
# =====================================================================

tab_upload, tab_report = st.tabs(["Upload Audio", "Screening Report"])

# ----- Tab 1: Upload -----
with tab_upload:
    st.subheader("Step 1: Voice Recording Upload")
    st.write(
        "Upload a WAV audio recording of natural speech. "
        "The recording should ideally be 30 seconds or longer."
    )

    uploaded_file = st.file_uploader(
        "Choose an audio file",
        type=SUPPORTED_FORMATS,
        help="Supported formats: WAV, M4A, MP3, OGG, FLAC. Files are converted to WAV automatically.",
    )

    col1, col2 = st.columns(2)
    with col1:
        language = st.selectbox("Report language", list(LANGUAGES.keys()))
    with col2:
        subject_id = st.text_input("Subject ID (optional)", value="anonymous")

    # Show audio player if file uploaded
    if uploaded_file is not None:
        st.audio(uploaded_file, format="audio/wav")

    # Run button
    run_clicked = st.button(
        "Run Screening",
        type="primary",
        disabled=(uploaded_file is None),
        use_container_width=True,
    )

    if run_clicked and uploaded_file is not None:
        # Check if we already have results for this exact file
        if st.session_state.uploaded_file_name == uploaded_file.name:
            st.info("Results already available — switch to the **Screening Report** tab.")
        else:
            # Save uploaded file to a temp path (pipeline reads from disk)
            suffix = Path(uploaded_file.name).suffix or ".wav"
            with tempfile.NamedTemporaryFile(
                suffix=suffix, delete=False
            ) as tmp:
                tmp.write(uploaded_file.getbuffer())
                temp_path = tmp.name

            # Convert to 16kHz mono WAV if needed
            temp_path = _ensure_wav(temp_path)

            language_code = LANGUAGES[language]

            with st.status("Running screening pipeline...", expanded=True) as status:
                st.write("Starting analysis — this may take a few minutes...")
                st.write("Both acoustic and semantic branches are running in parallel.")

                try:
                    result = _run_pipeline(
                        audio_path=temp_path,
                        subject_id=subject_id,
                        language_code=language_code,
                        file_name=uploaded_file.name,
                    )

                    # Store in session state
                    st.session_state.results = result
                    st.session_state.uploaded_file_name = uploaded_file.name

                    status.update(label="Analysis complete!", state="complete")
                    st.success(
                        "Screening complete! Switch to the **Screening Report** tab to view results."
                    )

                except Exception as e:
                    status.update(label="Pipeline failed", state="error")
                    st.error(f"An error occurred during analysis: {e}")

            # Clean up temp file
            Path(temp_path).unlink(missing_ok=True)

    # New screening button (only shown if results exist)
    if st.session_state.results is not None:
        if st.button("Clear & Start New Screening"):
            st.session_state.results = None
            st.session_state.uploaded_file_name = None
            st.rerun()


# ----- Tab 2: Report -----
with tab_report:
    if st.session_state.results is None:
        st.info("Please upload an audio file and run the screening first.")
    else:
        result = st.session_state.results

        st.subheader("Initial Findings")

        # Score bars
        col_scores, col_summary = st.columns([1, 1])

        with col_scores:
            _render_score_bar(
                "Cognitive Stability",
                result["acoustic_result"],
                help_text="Based on vocal patterns (rhythm, pitch, quality)",
            )
            st.markdown("")
            _render_score_bar(
                "Speech Fluency",
                result["semantic_result"],
                help_text="Based on language patterns (word choice, coherence)",
            )
            st.markdown("")
            _render_score_bar(
                "Combined Screening Score",
                result["fusion_result"],
                help_text="Weighted fusion of both assessments",
            )

        with col_summary:
            st.markdown("**Summary**")
            # Extract first paragraph of report as quick summary
            report_text = result.get("report", "")
            # Extract lines, drop headings and short greetings, take first substantial paragraph
            lines = [
                ln.strip() for ln in report_text.split("\n")
                if ln.strip() and not ln.strip().startswith("#")
            ]
            # Rejoin consecutive non-heading lines into paragraphs (split on blank-line gaps)
            # Since we already dropped blanks, group by original double-newline blocks
            blocks = report_text.split("\n\n")
            summary = None
            for block in blocks:
                # Strip heading lines within the block
                content = "\n".join(
                    ln for ln in block.strip().split("\n")
                    if ln.strip() and not ln.strip().startswith("#")
                )
                if len(content) >= 50:
                    summary = content
                    break
            if summary:
                st.write(summary)

        st.divider()

        # Full report
        st.subheader("Full Screening Report")
        st.markdown(result.get("report", "*No report available.*"))

        # Pipeline log (collapsible)
        with st.expander("Pipeline Log"):
            for msg in result.get("messages", []):
                st.text(msg)

# =====================================================================
# Footer disclaimer
# =====================================================================

st.divider()
st.caption(
    "NextCare is a screening tool, not a diagnostic medical device. "
    "Always consult with your doctor for medical advice."
)
