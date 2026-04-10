#!/usr/bin/env python3
"""
MeetingMind transcription script.
Uses WhisperX for speech-to-text with speaker diarization.

Usage:
    python transcribe.py <input> --model small --language en --device auto

Input can be a local file path or a YouTube URL.

Output:
    JSON to stdout with segments, speakers, duration, language.
    Progress lines to stderr: PROGRESS:<percent>:<message>
"""

import argparse
import json
import logging
import sys
import os
import re
import tempfile
import shutil

# Force ALL loggers to stderr at WARNING+ level.
# Redirect the root logger and remove any handlers that might write to stdout.
logging.root.handlers.clear()
_stderr_handler = logging.StreamHandler(sys.stderr)
_stderr_handler.setLevel(logging.WARNING)
logging.root.addHandler(_stderr_handler)
logging.root.setLevel(logging.WARNING)
# Also intercept any future loggers that libraries create
_orig_getLogger = logging.getLogger
def _patched_getLogger(name=None):
    logger = _orig_getLogger(name)
    logger.handlers = [h for h in logger.handlers if getattr(h, 'stream', None) is not sys.stdout]
    if not any(getattr(h, 'stream', None) is sys.stderr for h in logger.handlers):
        logger.addHandler(_stderr_handler)
    logger.setLevel(logging.WARNING)
    return logger
logging.getLogger = _patched_getLogger


def progress(percent: int, message: str):
    print(f"PROGRESS:{percent}:{message}", file=sys.stderr, flush=True)


def debug(message: str):
    print(f"DEBUG:{message}", file=sys.stderr, flush=True)


def error(message: str):
    print(f"ERROR:{message}", file=sys.stderr, flush=True)
    sys.exit(1)


def is_youtube_url(s: str) -> bool:
    return bool(re.match(
        r'https?://(www\.)?(youtube\.com/(watch|shorts|live)|youtu\.be/)',
        s
    ))


def download_youtube(url: str, temp_dir: str) -> str:
    """Download audio from YouTube URL, return path to WAV file."""
    try:
        import yt_dlp
    except ImportError:
        error("yt-dlp is not installed. Run: pip install yt-dlp")

    output_template = os.path.join(temp_dir, "audio.%(ext)s")

    def yt_progress_hook(d):
        if d["status"] == "downloading":
            pct = d.get("_percent_str", "").strip().rstrip("%")
            try:
                p = int(float(pct) * 0.09) + 1
                progress(min(p, 10), f"Downloading from YouTube... {pct}%")
            except ValueError:
                pass
        elif d["status"] == "finished":
            progress(10, "Download complete, extracting audio...")

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "wav",
            "preferredquality": "0",
        }],
        "progress_hooks": [yt_progress_hook],
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "logger": type("Logger", (), {
            "debug": lambda self, msg: None,
            "info": lambda self, msg: None,
            "warning": lambda self, msg: print(msg, file=sys.stderr),
            "error": lambda self, msg: print(msg, file=sys.stderr),
        })(),
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as e:
        error(f"YouTube download failed: {e}")

    # Find the downloaded WAV file
    for f in os.listdir(temp_dir):
        if f.endswith(".wav"):
            return os.path.join(temp_dir, f)

    error("YouTube download succeeded but no WAV file was produced. Is ffmpeg installed?")


def main():
    parser = argparse.ArgumentParser(description="Transcribe video/audio with WhisperX")
    parser.add_argument("file", help="Path to video file or YouTube URL")
    parser.add_argument("--model", default="small", choices=["tiny", "base", "small", "medium", "large"])
    parser.add_argument("--language", default="en")
    parser.add_argument("--device", default="auto", choices=["auto", "cpu", "cuda"])
    parser.add_argument("--hf-token", default=os.environ.get("HF_TOKEN", ""), help="HuggingFace token for diarization")
    args = parser.parse_args()

    debug(f"args: file={args.file!r} model={args.model} language={args.language} device={args.device}")
    debug(f"python={sys.version.split()[0]} cwd={os.getcwd()}")

    temp_dir = None

    try:
        # Resolve input: YouTube URL or local file
        if is_youtube_url(args.file):
            progress(1, "Preparing YouTube download...")
            temp_dir = tempfile.mkdtemp(prefix="meetingmind_")
            audio_path = download_youtube(args.file, temp_dir)
        else:
            if not os.path.isfile(args.file):
                error(f"File not found: {args.file}")
            audio_path = args.file

        try:
            sz = os.path.getsize(audio_path)
            debug(f"input audio path={audio_path} size={sz} bytes")
        except OSError as e:
            debug(f"could not stat input: {e}")

        # Resolve device
        device = args.device
        if device == "auto":
            try:
                import torch
                device = "cuda" if torch.cuda.is_available() else "cpu"
                debug(f"torch.cuda.is_available()={torch.cuda.is_available()} -> device={device}")
            except ImportError:
                device = "cpu"
                debug("torch not importable, falling back to cpu")

        compute_type = "float16" if device == "cuda" else "int8"
        debug(f"resolved device={device} compute_type={compute_type}")

        progress(12, "Loading WhisperX model...")

        try:
            import whisperx
            debug(f"whisperx imported OK")
        except ImportError as e:
            error(f"whisperx is not installed: {e}. Run: pip install whisperx")

        try:
            model = whisperx.load_model(args.model, device, compute_type=compute_type, language=args.language)
            debug("whisperx model loaded")
        except Exception as e:
            import traceback
            print(traceback.format_exc(), file=sys.stderr, flush=True)
            error(f"Failed to load model: {e}")

        progress(18, "Loading audio...")

        try:
            audio = whisperx.load_audio(audio_path)
            debug(f"audio loaded: shape={getattr(audio, 'shape', 'n/a')}")
        except Exception as e:
            import traceback
            print(traceback.format_exc(), file=sys.stderr, flush=True)
            error(f"Failed to load audio: {e}")

        progress(20, "Transcribing...")

        try:
            result = model.transcribe(audio, batch_size=16)
            debug(f"transcribe done: {len(result.get('segments', []))} segments, language={result.get('language')}")
        except Exception as e:
            import traceback
            print(traceback.format_exc(), file=sys.stderr, flush=True)
            error(f"Transcription failed: {e}")

        progress(50, "Aligning timestamps...")

        try:
            model_a, metadata = whisperx.load_align_model(language_code=result["language"], device=device)
            result = whisperx.align(result["segments"], model_a, metadata, audio, device, return_char_alignments=False)
        except Exception as e:
            progress(55, f"Alignment skipped: {e}")

        progress(60, "Running speaker diarization...")

        speakers = set()
        hf_token = args.hf_token
        debug(f"hf_token present: {bool(hf_token)} (length={len(hf_token) if hf_token else 0})")

        if hf_token:
            try:
                debug("loading diarization pipeline...")
                diarize_model = whisperx.DiarizationPipeline(use_auth_token=hf_token, device=device)
                debug("running diarization on audio...")
                diarize_segments = diarize_model(audio)
                debug(f"diarization produced {len(diarize_segments)} segments")
                result = whisperx.assign_word_speakers(diarize_segments, result)
                speaker_set = {s.get("speaker") for s in result.get("segments", []) if s.get("speaker")}
                debug(f"diarization assigned speakers: {sorted(speaker_set)}")
            except Exception as e:
                import traceback
                print(traceback.format_exc(), file=sys.stderr, flush=True)
                progress(70, f"Diarization skipped: {e}")
        else:
            progress(70, "Diarization skipped (no HuggingFace token)")

        progress(85, "Formatting output...")

        # Build output segments
        segments = []
        for seg in result.get("segments", []):
            speaker = seg.get("speaker", "SPEAKER_00")
            speakers.add(speaker)
            segments.append({
                "speaker": speaker,
                "start": round(seg.get("start", 0.0), 2),
                "end": round(seg.get("end", 0.0), 2),
                "text": seg.get("text", "").strip()
            })

        # Calculate duration from last segment
        duration = segments[-1]["end"] if segments else 0.0

        output = {
            "segments": segments,
            "speakers": sorted(speakers),
            "duration": round(duration, 2),
            "language": result.get("language", args.language)
        }

        progress(100, "Transcription complete")
        print(json.dumps(output))

    finally:
        if temp_dir:
            shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
