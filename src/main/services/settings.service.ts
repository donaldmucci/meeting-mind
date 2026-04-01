import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { Settings, defaultSettings } from '../lib/types'

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

function readFile(): { settings: Settings } {
  try {
    const data = fs.readFileSync(getSettingsPath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return { settings: defaultSettings }
  }
}

function writeFile(data: { settings: Settings }): void {
  const dir = path.dirname(getSettingsPath())
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(getSettingsPath(), JSON.stringify(data, null, 2))
}

export function getSettings(): Settings {
  return readFile().settings
}

export function setSettings(settings: Settings): void {
  writeFile({ settings })
}

export function updateSettings(partial: Partial<Settings>): Settings {
  const current = getSettings()
  const updated = {
    ...current,
    ...partial,
    llm: { ...current.llm, ...(partial.llm ?? {}) },
    whisper: { ...current.whisper, ...(partial.whisper ?? {}) }
  }
  setSettings(updated)
  return updated
}
