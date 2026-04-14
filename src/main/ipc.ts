import { ipcMain, dialog, BrowserWindow } from 'electron'
import { getSettings, setSettings } from './services/settings.service'
import { LlmService } from './services/llm.service'
import { PipelineService } from './services/pipeline.service'
import { Settings, LanguageCode, SummaryDetail } from './lib/types'

const pipeline = new PipelineService()

export function registerIpcHandlers(): void {
  // Settings
  ipcMain.handle('settings:get', () => getSettings())

  ipcMain.handle('settings:set', (_event, settings: Settings) => {
    setSettings(settings)
    return { ok: true }
  })

  ipcMain.handle('settings:test-llm', async () => {
    const settings = getSettings()
    const llm = new LlmService(settings.llm)
    return llm.testConnection()
  })

  // File selection
  ipcMain.handle('file:select', async () => {
    const result = await dialog.showOpenDialog({
      filters: [
        { name: 'Video Files', extensions: ['mp4', 'mkv', 'webm', 'avi', 'mov'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // File save
  ipcMain.handle('file:save', async (_event, content: string, defaultName: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'JSON', extensions: ['json'] },
        { name: 'Text', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (result.canceled || !result.filePath) return null
    const fs = await import('fs')
    await fs.promises.writeFile(result.filePath, content, 'utf-8')
    return result.filePath
  })

  // Pipeline
  ipcMain.handle('pipeline:start', async (event, filePath: string, language: LanguageCode, summaryDetail: SummaryDetail = 'normal') => {
    console.log('[MM][ipc] pipeline:start received', { filePath, language, summaryDetail })
    const win = BrowserWindow.fromWebContents(event.sender)
    try {
      const result = await pipeline.run(filePath, language, summaryDetail, (progress) => {
        win?.webContents.send('pipeline:progress', progress)
      })
      console.log('[MM][ipc] pipeline:start success, returning result id', result.id)
      return { ok: true, result }
    } catch (err) {
      const e = err as Error
      console.error('[MM][ipc] pipeline:start FAILED:', e.message)
      console.error('[MM][ipc] stack:', e.stack)
      return { ok: false, error: e.message }
    }
  })

  ipcMain.handle('pipeline:cancel', () => {
    pipeline.cancel()
    return { ok: true }
  })

  ipcMain.handle('pipeline:regenerate-summary', async (_event, id: string, detail: SummaryDetail) => {
    console.log('[MM][ipc] pipeline:regenerate-summary received', { id, detail })
    try {
      const result = await pipeline.regenerateSummary(id, detail)
      if (!result) return { ok: false, error: 'Result not found' }
      return { ok: true, result }
    } catch (err) {
      const e = err as Error
      console.error('[MM][ipc] pipeline:regenerate-summary FAILED:', e.message)
      return { ok: false, error: e.message }
    }
  })

  // History
  ipcMain.handle('history:list', () => pipeline.getHistory())
  ipcMain.handle('history:get', (_event, id: string) => pipeline.getResult(id))
  ipcMain.handle('history:delete', (_event, id: string) => pipeline.deleteResult(id))
  ipcMain.handle('history:export', async (_event, id: string, format: 'json' | 'markdown' | 'transcript') => {
    const result = await pipeline.getResult(id)
    if (!result) return null
    return pipeline.exportResult(result, format)
  })
}
