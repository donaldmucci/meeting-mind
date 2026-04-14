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
- **Adjustable recap detail** -- Pick **Short**, **Normal**, or **Max** on the home screen to control how deep the summary goes (from a 2-3 sentence overview with a handful of bullets, up to 5-8 paragraphs and 8-15 detailed key points). You can also switch levels on an existing recap and regenerate the summary in place without re-transcribing.
- **28 languages supported** -- Select the conversation language per file; both transcription and LLM output adapt accordingly.
- **History and export** -- Past analyses are saved locally. Export the **analysis** (summary, topics, decisions, action items, follow-ups) as a Markdown file, or the full **transcript** with timestamps and speaker labels as a text file.
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

You have three broad options:

**Option A — Local Ollama (free, fully offline)**

```bash
# Install Ollama, then:
ollama pull llama3
```

This gives you a local LLM at `http://localhost:11434/v1`. Use `ollama` (or any non-empty string) as the API key.

**Option B — Ollama Cloud (hosted, larger models)**

[Ollama Cloud / Turbo](https://ollama.com/) hosts larger models you can't run locally (e.g. `minimax-m2:cloud`, `gpt-oss:120b-cloud`). It exposes the same OpenAI-compatible API.

- **Endpoint:** `https://ollama.com/v1` &nbsp;*(the `/v1` suffix is required)*
- **API Key:** your Ollama Cloud key from [ollama.com/settings/keys](https://ollama.com/settings/keys)
- **Model:** any cloud model name, e.g. `minimax-m2:cloud`

**Option C — Any other OpenAI-compatible endpoint**

OpenAI, Groq, Together, LM Studio, vLLM, etc. all work. The base URL must be the one the OpenAI SDK can append `/chat/completions` to — for almost every provider that means it ends in `/v1`.

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
   - **HuggingFace Token** *(optional)*: paste a token from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) to enable speaker diarization. Without it, all speech is attributed to a single speaker. You also need to accept the model terms at [pyannote/speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1) and [pyannote/segmentation-3.0](https://huggingface.co/pyannote/segmentation-3.0).
4. Click **Test Connection** to verify the LLM is reachable
5. Save settings

### Analyzing a meeting

- **Local file**: Click the upload area to select a video (MP4, MKV, WebM, AVI, MOV)
- **YouTube**: Paste a YouTube URL in the text field
- Select the **conversation language**
- Click **Analyze**

The app will transcribe the audio, then run 5 parallel LLM calls to extract summary, topics, decisions, action items, and follow-ups. Results are displayed in a tabbed interface and saved to your local history.

From the results view you can:

- **Export Analysis** — a Markdown file with the summary, key points, topics, decisions, action items, and follow-ups (no transcript)
- **Export Transcript** — a plain-text file with a header (date, duration, language, speakers) followed by one line per segment in the form `[mm:ss] SPEAKER_00: text...`

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
| `endpoint` | `http://localhost:11434/v1` | OpenAI-compatible API base URL. **Must include the `/v1` suffix** — the OpenAI SDK appends `/chat/completions` to this value, so a bare host (e.g. `https://ollama.com`) will return `404`. |
| `apiKey` | `ollama` | API key (use any non-empty string for local Ollama; use a real key for Ollama Cloud, OpenAI, etc.) |
| `model` | `llama3` | Model name to use for analysis |

Common endpoints:

| Provider | Endpoint |
|---|---|
| Local Ollama | `http://localhost:11434/v1` |
| Ollama Cloud | `https://ollama.com/v1` |
| OpenAI | `https://api.openai.com/v1` |
| LM Studio | `http://localhost:1234/v1` |
| Groq | `https://api.groq.com/openai/v1` |

### Whisper Settings

| Field | Default | Description |
|---|---|---|
| `pythonPath` | `python3` | Path to Python with WhisperX installed |
| `model` | `small` | Whisper model size: `tiny`, `base`, `small`, `medium`, `large` |
| `device` | `auto` | Compute device: `auto`, `cpu`, `cuda` |
| `hfToken` | `''` | HuggingFace token for speaker diarization. If empty, the app falls back to the `HF_TOKEN` environment variable. If both are empty, all speech is attributed to a single speaker. |

---

## Troubleshooting

### Debug trace

Every step of the analysis pipeline emits a `[MM]` log line to the terminal where you ran `pnpm dev`. If something goes wrong, this is the first place to look — the logs show which stage failed and dump the relevant payload (Python stderr, raw LLM responses, HTTP status codes).

```bash
# See only the trace lines:
pnpm dev 2>&1 | grep -E '\[MM\]|ERROR|Traceback'
```

The trace covers five layers:

| Layer | Prefix | What it shows |
|---|---|---|
| IPC entry | `[MM][ipc]` | Incoming `pipeline:start` calls and final success/failure |
| Pipeline | `[MM][pipeline]` | Settings dump, phase timings, segment counts, full error stack |
| Whisper subprocess | `[MM][transcribe]` | Spawn args, exit code, all Python stderr forwarded as `[py-stderr]`, stdout snippets on parse failure |
| LLM calls | `[MM][llm][<step>]` | Per-call timing, request/response sizes, HTTP status on failure, raw content on JSON parse failure |
| Python script | `DEBUG:` lines (in `[py-stderr]`) | Args, device resolution, audio shape, per-step status, full tracebacks |

### "404" errors during analysis
The trace will show something like `[MM][llm][topics] HTTP/SDK error after 227ms: 404`. This almost always means your **LLM endpoint is missing the `/v1` suffix**. The OpenAI SDK appends `/chat/completions` to whatever base URL you provide, so:

- `https://ollama.com` → POSTs to `https://ollama.com/chat/completions` → **404**
- `https://ollama.com/v1` → POSTs to `https://ollama.com/v1/chat/completions` → **OK**

Open Settings, fix the endpoint, and re-run. See [LLM Settings](#llm-settings) for a list of common endpoints.

### "Failed to parse transcription output"
The Python script's stdout must be clean JSON. This usually means a library is printing logs to stdout. The app handles this for known cases (whisperx, yt-dlp), but if you encounter it, check that no other library is printing to stdout in your Python environment. The trace will dump the first/last 500 chars of stdout so you can see exactly what slipped through.

### "Failed to start Python"
Verify the Python path in Settings points to the correct virtualenv binary (e.g., `/path/to/meeting-mind/python/.venv/bin/python`). The trace will print the exact path being spawned at `[MM][transcribe] spawning python: ...`.

### "LLM <step> returned invalid JSON"
The model returned text that wasn't valid JSON, even though we asked for `response_format: json_object`. Some local models (especially smaller Ollama models) ignore this hint. The trace dumps the first 800 chars of the raw response so you can see what came back — usually a markdown-fenced block or a chatty preamble. Switching to a larger / better instruction-tuned model usually fixes it.

### GPU errors on Linux
If you see `Exiting GPU process due to errors during initialization`, this is a Chromium/Electron issue with GPU drivers. The app automatically falls back to software rendering -- these messages are harmless.

### All segments labeled as `SPEAKER_00`
This means speaker diarization was skipped — the trace will confirm with `Diarization skipped (no HuggingFace token)` or `Diarization skipped: <error>`.

To enable speaker identification:

1. Get a HuggingFace token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Visit [pyannote/speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1) and accept the model terms (also accept [pyannote/segmentation-3.0](https://huggingface.co/pyannote/segmentation-3.0))
3. Open **Settings → Whisper → HuggingFace Token** in the app, paste the token, save
4. Re-run the analysis

The token is also picked up from the `HF_TOKEN` environment variable as a fallback if the setting is empty.

### YouTube download fails
Ensure `ffmpeg` is installed and in your PATH. yt-dlp requires it for audio extraction.

---

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

---

## License

MIT
