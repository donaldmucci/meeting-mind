import { contextBridge, ipcRenderer } from 'electron'

export type Api = typeof api

const api = {
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: unknown) => ipcRenderer.invoke('settings:set', settings),
  testLlm: () => ipcRenderer.invoke('settings:test-llm'),

  // File
  selectFile: () => ipcRenderer.invoke('file:select'),

  // Pipeline
  startPipeline: (filePath: string, language: string) => ipcRenderer.invoke('pipeline:start', filePath, language),
  cancelPipeline: () => ipcRenderer.invoke('pipeline:cancel'),
  onPipelineProgress: (callback: (progress: unknown) => void) => {
    const handler = (_event: unknown, progress: unknown) => callback(progress)
    ipcRenderer.on('pipeline:progress', handler)
    return () => ipcRenderer.removeListener('pipeline:progress', handler)
  },

  // History
  getHistory: () => ipcRenderer.invoke('history:list'),
  getResult: (id: string) => ipcRenderer.invoke('history:get', id),
  deleteResult: (id: string) => ipcRenderer.invoke('history:delete', id),
  exportResult: (id: string, format: 'json' | 'markdown' | 'transcript') =>
    ipcRenderer.invoke('history:export', id, format),

  // Save file dialog
  saveFile: (content: string, defaultName: string) =>
    ipcRenderer.invoke('file:save', content, defaultName)
}

contextBridge.exposeInMainWorld('api', api)
