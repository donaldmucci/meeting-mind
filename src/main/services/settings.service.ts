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
  // Merge with defaults so newly added fields (e.g. hfToken) are populated
  // for users who saved settings before the field existed.
  const stored = readFile().settings
  return {
    ...defaultSettings,
    ...stored,
    llm: { ...defaultSettings.llm, ...(stored.llm ?? {}) },
    whisper: { ...defaultSettings.whisper, ...(stored.whisper ?? {}) }
  }
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
