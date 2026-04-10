import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { TranscriptionResult, Settings, LanguageCode } from '../lib/types'

interface TranscribeOptions extends Settings['whisper'] {
  language: LanguageCode
}

export class TranscriptionService {
  private process: ChildProcess | null = null

  async transcribe(
    filePath: string,
    settings: TranscribeOptions,
    onProgress: (percent: number, message: string) => void,
    signal?: AbortSignal
  ): Promise<TranscriptionResult> {
    // In dev, resolve from project root; in prod, from app resources
    const scriptPath = is.dev
      ? path.join(app.getAppPath(), 'python', 'transcribe.py')
      : path.join(process.resourcesPath, 'python', 'transcribe.py')

    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        return reject(new Error('Cancelled'))
      }

      const args = [
        scriptPath,
        filePath,
        '--model', settings.model,
        '--language', settings.language,
        '--device', settings.device
      ]

      // Pass HF token via env var rather than argv so it doesn't show up
      // in process listings. Python script reads HF_TOKEN as a fallback.
      const env = { ...process.env }
      if (settings.hfToken && settings.hfToken.trim()) {
        env.HF_TOKEN = settings.hfToken.trim()
      }

      console.log('[MM][transcribe] spawning python:', settings.pythonPath)
      console.log('[MM][transcribe] script:', scriptPath)
      console.log('[MM][transcribe] args:', args.slice(1))
      console.log('[MM][transcribe] file:', filePath)
      console.log('[MM][transcribe] HF_TOKEN present:', !!env.HF_TOKEN)

      this.process = spawn(settings.pythonPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env
      })

      let stdout = ''
      let stderr = ''
      let stderrBuf = ''

      this.process.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString()
        stdout += chunk
        console.log(`[MM][transcribe][py-stdout] +${chunk.length} bytes (total ${stdout.length})`)
      })

      this.process.stderr?.on('data', (data: Buffer) => {
        // Buffer and split on newlines so we never break a partial line
        stderrBuf += data.toString()
        const lines = stderrBuf.split('\n')
        stderrBuf = lines.pop() ?? ''

        for (const rawLine of lines) {
          const line = rawLine.trim()
          if (!line) continue
          stderr += line + '\n'

          // Parse progress lines: PROGRESS:<percent>:<message>
          const match = line.match(/^PROGRESS:(\d+):(.+)$/)
          if (match) {
            console.log(`[MM][transcribe][progress] ${match[1]}% - ${match[2]}`)
            onProgress(parseInt(match[1], 10), match[2])
          } else {
            // Forward everything else (warnings, tracebacks, raw library output) to main console
            console.error(`[MM][transcribe][py-stderr] ${line}`)
          }
        }
      })

      this.process.on('close', (code) => {
        this.process = null
        // Flush any trailing stderr
        if (stderrBuf.trim()) {
          console.error(`[MM][transcribe][py-stderr] ${stderrBuf.trim()}`)
          stderr += stderrBuf + '\n'
        }
        console.log(`[MM][transcribe] python exited with code ${code}`)
        console.log(`[MM][transcribe] stdout total: ${stdout.length} bytes`)
        console.log(`[MM][transcribe] stderr total: ${stderr.length} bytes`)

        if (signal?.aborted) {
          return reject(new Error('Cancelled'))
        }
        if (code !== 0) {
          const errorLine = stderr
            .split('\n')
            .find((l) => l.startsWith('ERROR:'))
          console.error('[MM][transcribe] non-zero exit. Last 1000 chars of stderr:')
          console.error(stderr.slice(-1000))
          return reject(new Error(errorLine?.slice(6) || `Transcription failed (exit code ${code})`))
        }
        try {
          const result = JSON.parse(stdout) as TranscriptionResult
          console.log(`[MM][transcribe] parsed ${result.segments?.length ?? 0} segments, duration ${result.duration}s, language ${result.language}`)
          resolve(result)
        } catch (parseErr) {
          console.error('[MM][transcribe] JSON.parse failed:', (parseErr as Error).message)
          console.error('[MM][transcribe] First 500 chars of stdout:')
          console.error(stdout.slice(0, 500))
          console.error('[MM][transcribe] Last 500 chars of stdout:')
          console.error(stdout.slice(-500))
          reject(new Error('Failed to parse transcription output'))
        }
      })

      this.process.on('error', (err) => {
        this.process = null
        console.error('[MM][transcribe] failed to spawn python:', err)
        reject(new Error(`Failed to start Python: ${err.message}`))
      })

      signal?.addEventListener('abort', () => {
        this.cancel()
      })
    })
  }

  cancel(): void {
    if (this.process) {
      this.process.kill('SIGTERM')
      this.process = null
    }
  }
}
