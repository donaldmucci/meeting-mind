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

      this.process = spawn(settings.pythonPath, args, {
        stdio: ['ignore', 'pipe', 'pipe']
      })

      let stdout = ''
      let stderr = ''

      this.process.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      this.process.stderr?.on('data', (data: Buffer) => {
        const line = data.toString().trim()
        stderr += line + '\n'

        // Parse progress lines: PROGRESS:<percent>:<message>
        const match = line.match(/^PROGRESS:(\d+):(.+)$/)
        if (match) {
          onProgress(parseInt(match[1], 10), match[2])
        }
      })

      this.process.on('close', (code) => {
        this.process = null
        if (signal?.aborted) {
          return reject(new Error('Cancelled'))
        }
        if (code !== 0) {
          const errorLine = stderr
            .split('\n')
            .find((l) => l.startsWith('ERROR:'))
          return reject(new Error(errorLine?.slice(6) || `Transcription failed (exit code ${code})`))
        }
        try {
          const result = JSON.parse(stdout) as TranscriptionResult
          resolve(result)
        } catch {
          reject(new Error('Failed to parse transcription output'))
        }
      })

      this.process.on('error', (err) => {
        this.process = null
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
