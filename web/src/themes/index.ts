/**
 * Theme system — public API
 *
 * Usage:
 *   import { ThemeProvider, useTheme, ThemePicker, ProfileThemeWrapper } from './themes'
 *   import { PRESET_THEMES, DEFAULT_THEME } from './themes'
 *   import { deriveTokensFromCore } from './themes'
 *   import { readActiveTheme, writeActiveTheme } from './themes'
 */

// Types
export type {
  CrumbsTheme,
  CoreThemeColors,
  ThemeFont,
  ThemeFontWithUrl,
  ThemeBackground,
  ThemeTokens,
  ThemeContextValue,
} from './types'

// Presets
export {
  PRESET_THEMES,
  DEFAULT_THEME,
  THEME_CRUMBS,
  THEME_MIDNIGHT,
  THEME_OCEAN,
  THEME_FOREST,
  THEME_SUNSET,
  THEME_SNOW,
  THEME_TERMINAL,
  THEME_BITCOIN,
} from './presets'

// Derivation
export {
  deriveTokensFromCore,
  buildThemeCss,
  hexToHsl,
  hslToHex,
  hexToHslString,
  hslStringToHex,
} from './derive'

// Nostr integration
export {
  readActiveTheme,
  readThemeDefinitions,
  searchThemes,
  writeActiveTheme,
  publishThemeDefinition,
} from './nostr'

// React components
export { ThemeProvider, useTheme, applyScopedTheme } from './ThemeProvider'
export { ThemePicker } from './ThemePicker'
export { ProfileThemeWrapper } from './ProfileThemeWrapper'
