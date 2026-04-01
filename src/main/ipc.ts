import { ipcMain, dialog, BrowserWindow } from 'electron'
import { getSettings, setSettings } from './services/settings.service'
import { LlmService } from './services/llm.service'
import { PipelineService } from './services/pipeline.service'
import { Settings, LanguageCode } from './lib/types'

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
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (result.canceled || !result.filePath) return null
    const fs = await import('fs')
    await fs.promises.writeFile(result.filePath, content, 'utf-8')
    return result.filePath
  })

  // Pipeline
  ipcMain.handle('pipeline:start', async (event, filePath: string, language: LanguageCode) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    try {
      const result = await pipeline.run(filePath, language, (progress) => {
        win?.webContents.send('pipeline:progress', progress)
      })
      return { ok: true, result }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('pipeline:cancel', () => {
    pipeline.cancel()
    return { ok: true }
  })

  // History
  ipcMain.handle('history:list', () => pipeline.getHistory())
  ipcMain.handle('history:get', (_event, id: string) => pipeline.getResult(id))
  ipcMain.handle('history:delete', (_event, id: string) => pipeline.deleteResult(id))
  ipcMain.handle('history:export', async (_event, id: string, format: 'json' | 'markdown') => {
    const result = await pipeline.getResult(id)
    if (!result) return null
    return pipeline.exportResult(result, format)
  })
}
