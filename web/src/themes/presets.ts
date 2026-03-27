/**
 * 8 built-in theme presets for Crumbs
 */
import type { CrumbsTheme } from './types'

export const THEME_CRUMBS: CrumbsTheme = {
  id: 'crumbs',
  name: 'Crumbs',
  description: 'Warm library — the default Crumbs experience',
  colors: { background: '#1a1510', text: '#E8DCC8', primary: '#D4A853' },
}

export const THEME_MIDNIGHT: CrumbsTheme = {
  id: 'midnight',
  name: 'Midnight',
  description: 'Ditto midnight purple',
  colors: { background: '#0d0d1a', text: '#e0e0ff', primary: '#6c3ce0' },
}

export const THEME_OCEAN: CrumbsTheme = {
  id: 'ocean',
  name: 'Ocean',
  description: 'Deep blue depths',
  colors: { background: '#0a1628', text: '#b0d4f1', primary: '#2196f3' },
}

export const THEME_FOREST: CrumbsTheme = {
  id: 'forest',
  name: 'Forest',
  description: 'Green earth canopy',
  colors: { background: '#0d1f0d', text: '#c8e6c9', primary: '#4caf50' },
}

export const THEME_SUNSET: CrumbsTheme = {
  id: 'sunset',
  name: 'Sunset',
  description: 'Warm orange glow',
  colors: { background: '#1f0a00', text: '#ffe0b2', primary: '#ff6d00' },
}

export const THEME_SNOW: CrumbsTheme = {
  id: 'snow',
  name: 'Snow',
  description: 'Clean light theme',
  colors: { background: '#f5f5f5', text: '#212121', primary: '#1565c0' },
}

export const THEME_TERMINAL: CrumbsTheme = {
  id: 'terminal',
  name: 'Terminal',
  description: 'Hacker green on black',
  colors: { background: '#000000', text: '#00ff00', primary: '#00cc00' },
  font: { body: "'Courier New', Courier, monospace" },
}

export const THEME_BITCOIN: CrumbsTheme = {
  id: 'bitcoin',
  name: 'Bitcoin',
  description: 'Orange flame — the orange pill',
  colors: { background: '#1a0f00', text: '#ffd700', primary: '#f7931a' },
}

/** All built-in presets */
export const PRESET_THEMES: CrumbsTheme[] = [
  THEME_CRUMBS,
  THEME_MIDNIGHT,
  THEME_OCEAN,
  THEME_FOREST,
  THEME_SUNSET,
  THEME_SNOW,
  THEME_TERMINAL,
  THEME_BITCOIN,
]

/** Default theme */
export const DEFAULT_THEME = THEME_CRUMBS
