# MeetingMind

**Intelligent Recap** -- A desktop app that turns meeting recordings into actionable intelligence. Drop in a video file or paste a YouTube URL, and get a full transcript with speaker diarization, summary, key topics, decisions, action items, and follow-ups.

Think of it as an open-source, local-first alternative to MS Teams Premium's Intelligence Recap.

![Electron](https://img.shields.io/badge/Electron-35-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)

---

## Features

- **Transcription with speaker diarization** -- Powered by [WhisperX](https://github.com/m-bain/whisperX), running entirely on your machine. Identifies who said what, with timestamps.
- **YouTube URL support** -- Paste a YouTube link and the app downloads the audio automatically via [yt-dlp](https://github.com/yt-dlp/yt-dlp).
- **LLM-powered analysis** -- Connects to any OpenAI-compatible API (OpenAI, Ollama, LM Studio, vLLM, etc.) to extract:
  - Meeting summary with key points
  - Discussion topics with time ranges
  - Decisions made and by whom
  - Action items with assignee, deadline, and priority
  - Suggested follow-ups
- **28 languages supported** -- Select the conversation language per file; both transcription and LLM output adapt accordingly.
- **History and export** -- Past analyses are saved locally and can be exported as Markdown or JSON.
- **Fully configurable** -- Choose your Whisper model size, LLM endpoint, model, and device (CPU/GPU).

---

## How It Works

```
Video file / YouTube URL
        |
        v
  [yt-dlp download]  (YouTube only)
        |
        v
  [WhisperX]  transcription + speaker diarization (local, on-device)
        |
        v
  [LLM Analysis]  5 parallel API calls (summary, topics, decisions, tasks, follow-ups)
        |
        v
  Tabbed results UI + saved to local history
```

The transcription runs locally on your machine (no data leaves your computer). The LLM analysis requires an API endpoint -- this can be a local model via Ollama or any remote OpenAI-compatible service.

---

## Prerequisites

| Dependency | Purpose | Install |
|---|---|---|
| **Node.js** >= 22 | Electron app runtime | [nodejs.org](https://nodejs.org/) |
| **pnpm** >= 9 | Package manager | `npm install -g pnpm` |
| **Python** >= 3.10 | WhisperX transcription | [python.org](https://www.python.org/) |
| **FFmpeg** | Audio extraction (used by WhisperX and yt-dlp) | `sudo apt install ffmpeg` (Debian/Ubuntu) |
| **An LLM endpoint** | Meeting analysis | [Ollama](https://ollama.com/) (free, local) or any OpenAI-compatible API |

**Optional:**
- **NVIDIA GPU + CUDA** -- Significantly speeds up transcription. WhisperX will fall back to CPU if unavailable.
- **HuggingFace token** -- Required for speaker diarization via pyannote.audio. Set `HF_TOKEN` environment variable. Without it, transcription still works but all speech is attributed to a single speaker.

---

## Installation

### 1. Clone and install Node dependencies

```bash
git clone https://github.com/youruser/meeting-mind.git
cd meeting-mind
pnpm install
```

### 2. Set up the Python environment

```bash
python3 -m venv python/.venv
source python/.venv/bin/activate
pip install -r python/requirements.txt
```

This installs WhisperX, PyTorch, and yt-dlp. The first run will also download the Whisper model (~500MB for `small`).

### 3. (Optional) Set up speaker diarization

Speaker diarization requires a HuggingFace token with access to [pyannote/speaker-diarization](https://huggingface.co/pyannote/speaker-diarization):

```bash
export HF_TOKEN="hf_your_token_here"
```

### 4. Set up an LLM

The easiest local option is [Ollama](https://ollama.com/):

```bash
# Install Ollama, then:
ollama pull llama3
```

This gives you a free, local LLM at `http://localhost:11434/v1`. Alternatively, use any OpenAI-compatible endpoint (OpenAI, Groq, Together, LM Studio, etc.).

---

## Usage

### Development

```bash
pnpm dev
```

### Production build

```bash
pnpm build
pnpm preview
```

### Packaging a Windows executable

You can produce a Windows installer and a portable `.exe` from either Windows or Linux:

```bash
pnpm dist:win
```

This runs `electron-vite build` and then `electron-builder --win`, producing two artifacts in `dist/`:

| File | Type | Description |
|---|---|---|
| `MeetingMind-Setup-<version>-x64.exe` | NSIS installer | Per-user install with selectable directory and Start Menu / Desktop shortcuts |
| `MeetingMind-Portable-<version>-x64.exe` | Portable | Single-file executable, no install required |

**Cross-building from Linux:** electron-builder uses Wine to set the version metadata on the `.exe`. Install Wine (`sudo apt install wine`) and make sure your prefix is a clean 64-bit one — if you hit `could not load kernel32.dll`, recreate it:

```bash
rm -rf ~/.wine
WINEARCH=win64 wineboot --init
```

**Important:** the Python WhisperX backend is **not** bundled in the Windows package. Only `python/transcribe.py` and `python/requirements.txt` are shipped as extra resources. End users on Windows still need to install Python 3.10+, FFmpeg, create a venv, and `pip install -r python/requirements.txt`, then point Settings → Whisper → Python Path at the resulting `python.exe` (e.g. `C:\path\to\python\.venv\Scripts\python.exe`).

The build is unsigned, so Windows SmartScreen will warn on first launch. To set a custom application icon, drop a `.ico` file at `build/icon.ico` before building.

### First launch

1. Click the **gear icon** to open Settings
2. Configure your LLM:
   - **Endpoint**: `http://localhost:11434/v1` (for Ollama) or your provider's URL
   - **API Key**: `ollama` (for Ollama) or your actual key
   - **Model**: `llama3` or any model available on your endpoint
3. Configure Whisper:
   - **Python Path**: path to the venv Python (Linux/macOS: `/path/to/meeting-mind/python/.venv/bin/python`, Windows: `C:\path\to\meeting-mind\python\.venv\Scripts\python.exe`)
   - **Model Size**: `small` is recommended (see table below)
   - **Device**: `auto` (uses GPU if available)
4. Click **Test Connection** to verify the LLM is reachable
5. Save settings

### Analyzing a meeting

- **Local file**: Click the upload area to select a video (MP4, MKV, WebM, AVI, MOV)
- **YouTube**: Paste a YouTube URL in the text field
- Select the **conversation language**
- Click **Analyze**

The app will transcribe the audio, then run 5 parallel LLM calls to extract summary, topics, decisions, action items, and follow-ups. Results are displayed in a tabbed interface and saved to your local history.

---

## Whisper Model Sizes

| Model | Size | VRAM | Speed | Accuracy | Recommendation |
|---|---|---|---|---|---|
| `tiny` | 39 MB | ~1 GB | Very fast | Low | Testing only |
| `base` | 140 MB | ~2 GB | Fast | Fair | Budget hardware |
| `small` | 465 MB | ~3 GB | Moderate | Good | **Recommended** |
| `medium` | 1.5 GB | ~5 GB | Slow | Very good | When accuracy matters |
| `large` | 3 GB | ~10 GB | Very slow | Excellent | High-end GPU only |

On CPU (no GPU), expect roughly real-time processing for `tiny`/`base`, and 2-4x slower than real-time for `small`.

---

## Supported Languages

English, Spanish, French, German, Italian, Portuguese, Dutch, Polish, Russian, Ukrainian, Japanese, Chinese, Korean, Arabic, Hindi, Turkish, Swedish, Danish, Norwegian, Finnish, Czech, Romanian, Hungarian, Greek, Hebrew, Thai, Vietnamese, Indonesian.

---

## Project Structure

```
meeting-mind/
├── python/
│   ├── transcribe.py          # WhisperX transcription + yt-dlp download
│   └── requirements.txt
├── src/
│   ├── main/                  # Electron main process
│   │   ├── index.ts           # App entry point
│   │   ├── ipc.ts             # IPC handler registration
│   │   ├── services/
│   │   │   ├── settings.service.ts
│   │   │   ├── transcription.service.ts
│   │   │   ├── llm.service.ts
│   │   │   └── pipeline.service.ts
│   │   └── lib/
│   │       ├── types.ts       # Shared type definitions
│   │       └── prompts.ts     # LLM prompt templates
│   ├── preload/
│   │   └── index.ts           # IPC bridge (contextBridge)
│   └── renderer/              # React frontend
│       └── src/
│           ├── App.tsx
│           ├── stores/
│           │   └── app.store.ts        # Zustand state management
│           ├── components/
│           │   ├── Header.tsx
│           │   ├── HomeView.tsx         # File picker + YouTube URL input
│           │   ├── ProcessingView.tsx   # Progress stepper
│           │   ├── ResultsView.tsx      # Tabbed results
│           │   ├── SettingsDialog.tsx
│           │   └── results/
│           │       ├── SummaryView.tsx
│           │       ├── TranscriptView.tsx
│           │       ├── TopicsView.tsx
│           │       ├── DecisionsView.tsx
│           │       ├── TasksView.tsx
│           │       └── FollowUpsView.tsx
│           └── lib/
│               └── types.ts
├── electron.vite.config.ts
├── package.json
└── tsconfig.json
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | Electron 35 |
| Frontend | React 19, TypeScript, Tailwind CSS 4 |
| State management | Zustand 5 |
| Build tool | electron-vite (Vite) |
| Icons | Lucide React |
| LLM client | OpenAI SDK (works with any compatible endpoint) |
| Transcription | WhisperX (via Python subprocess) |
| Speaker diarization | pyannote.audio (via WhisperX) |
| YouTube download | yt-dlp |
| Audio processing | FFmpeg |

---

## Configuration Reference

Settings are stored in your OS user data directory (e.g., `~/.config/meeting-mind/settings.json` on Linux).

### LLM Settings

| Field | Default | Description |
|---|---|---|
| `endpoint` | `http://localhost:11434/v1` | OpenAI-compatible API base URL |
| `apiKey` | `ollama` | API key (use any non-empty string for Ollama) |
| `model` | `llama3` | Model name to use for analysis |

### Whisper Settings

| Field | Default | Description |
|---|---|---|
| `pythonPath` | `python3` | Path to Python with WhisperX installed |
| `model` | `small` | Whisper model size: `tiny`, `base`, `small`, `medium`, `large` |
| `device` | `auto` | Compute device: `auto`, `cpu`, `cuda` |

---

## Troubleshooting

### "Failed to parse transcription output"
The Python script's stdout must be clean JSON. This usually means a library is printing logs to stdout. The app handles this for known cases (whisperx, yt-dlp), but if you encounter it, check that no other library is printing to stdout in your Python environment.

### "Failed to start Python"
Verify the Python path in Settings points to the correct virtualenv binary (e.g., `/path/to/meeting-mind/python/.venv/bin/python`).

### GPU errors on Linux
If you see `Exiting GPU process due to errors during initialization`, this is a Chromium/Electron issue with GPU drivers. The app automatically falls back to software rendering -- these messages are harmless.

### Speaker diarization not working
Set the `HF_TOKEN` environment variable before launching the app. You need to accept the pyannote model terms on HuggingFace first.

### YouTube download fails
Ensure `ffmpeg` is installed and in your PATH. yt-dlp requires it for audio extraction.

---

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

---

## License

MIT
